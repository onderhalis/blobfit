#!/usr/bin/env node
// Budget-controlled Wiro video generation for BLOB FIT.
//
//   npm run video -- check                      credentials + connectivity (no charge)
//   npm run video -- models                     live price tables for candidate models (no charge)
//   npm run video -- estimate <job>             verified price + approval code (no charge)
//   npm run video -- generate <job> --approve <code> [--attempt N] [--dry-run]   (SPENDS CREDITS)
//   npm run video -- status <job>               run records for a job
//
// Safety rules: generation needs an approval code bound to the job, first frame, attempt and live
// price; it refuses when the price is not exact or exceeds the budget cap; it runs once and never
// retries; the run record is written before waiting so a crash cannot cause a second submission.
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describeSecret, loadConfig } from './env.mjs';
import {
  OUTPUT_DIR,
  RUNS_DIR,
  appendLedger,
  approvalCode,
  effectiveCap,
  listRuns,
  loadJob,
  runPath,
  sha256File,
  writeJson,
} from './jobs.mjs';
import { estimateCost, formatUsd, parseDynamicPrice, PRICE_METHODS } from './pricing.mjs';
import { DEFAULT_BASE_URL, createClient, taskState, waitForTask } from './wiro-client.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** Image-to-video candidates confirmed in Wiro's official n8n node package (v2.0.1). */
export const CANDIDATE_MODELS = [
  'klingai/kling-v2.6',
  'klingai/kling-v2.5-turbo',
  'ByteDance/seedance-v1-pro-fast',
  'MiniMax/hailuo-2.3-Fast',
  'google/veo3.1-fast',
];

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command, positional: [], flags: {} };
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        args.flags[key] = next;
        i += 1;
      } else {
        args.flags[key] = true;
      }
    } else {
      args.positional.push(token);
    }
  }
  return args;
}

function client(config, deps) {
  return createClient({
    apiKey: config.WIRO_API_KEY,
    apiSecret: config.WIRO_API_SECRET,
    baseUrl: config.WIRO_BASE_URL || DEFAULT_BASE_URL,
    fetchImpl: deps.fetch,
  });
}

async function prepare(jobId, config, deps, root, attemptFlag) {
  const job = await loadJob(jobId, root);
  const firstFramePath = job.firstFrame ? join(root, job.firstFrame) : null;
  if (firstFramePath && !existsSync(firstFramePath)) throw new Error(`First frame missing: ${job.firstFrame}`);
  const firstFrameSha256 = firstFramePath ? await sha256File(firstFramePath) : null;
  const runs = await listRuns(job.id, root);
  const attempt = attemptFlag ? Number(attemptFlag) : runs.length + 1;
  const tool = await client(config, deps).modelDetail(job.model);
  const estimate = estimateCost(tool, job.params);
  const cap = effectiveCap(job, config.WIRO_BUDGET_CAP_USD);
  return { job, firstFramePath, firstFrameSha256, runs, attempt, tool, estimate, cap };
}

function printEstimate(out, { job, estimate, cap, attempt, firstFrameSha256 }, code) {
  out(`Job        ${job.id} — ${job.title ?? ''}`);
  out(`Model      ${job.model}`);
  out(`Params     ${JSON.stringify(job.params)}`);
  if (job.firstFrame) out(`First frame ${job.firstFrame} (sha256 ${firstFrameSha256.slice(0, 12)}…)`);
  out(`Price      ${formatUsd(estimate.priceUsd)} (${estimate.status}${estimate.method ? `, ${PRICE_METHODS[estimate.method] ?? estimate.method}` : ''})`);
  if (estimate.reason) out(`           ${estimate.reason}`);
  if (estimate.tier) out(`Tier       ${JSON.stringify(estimate.tier)}`);
  out(`Budget cap ${formatUsd(cap)} per clip`);
  out(`Attempt    ${attempt}`);
  if (code) {
    out('');
    out(`Approval code: ${code}`);
    out(`To spend credits on exactly this run (after founder approval):`);
    out(`  npm run video -- generate ${job.id} --approve ${code}${attempt > 1 ? ` --attempt ${attempt}` : ''}`);
  }
}

export async function main(argv, deps = {}) {
  const out = deps.out ?? ((line) => console.log(line));
  const root = deps.root ?? ROOT;
  const config = deps.config ?? loadConfig(root);
  const now = deps.now ?? (() => new Date());
  const { command, positional, flags } = parseArgs(argv);

  switch (command) {
    case 'check': {
      out(`WIRO_API_KEY        ${describeSecret(config.WIRO_API_KEY, { showTail: true })}`);
      out(`WIRO_API_SECRET     ${describeSecret(config.WIRO_API_SECRET)}${config.WIRO_API_SECRET ? ' (signature auth)' : ' (API-key-only auth)'}`);
      out(`WIRO_BASE_URL       ${config.WIRO_BASE_URL || DEFAULT_BASE_URL}`);
      out(`WIRO_BUDGET_CAP_USD ${config.WIRO_BUDGET_CAP_USD ?? '(job caps only)'}`);
      if (!config.WIRO_API_KEY) {
        out('\nSet WIRO_API_KEY (and WIRO_API_SECRET) in your shell or in .env.local — see video/README.md.');
        return 1;
      }
      try {
        const tool = await client(config, deps).modelDetail(CANDIDATE_MODELS[0]);
        out(`\nConnected. ${CANDIDATE_MODELS[0]} is available (${parseDynamicPrice(tool.dynamicprice).length} price tiers). No credits used.`);
        return 0;
      } catch (error) {
        out(`\nCould not reach Wiro: ${error.message}`);
        return 1;
      }
    }

    case 'models': {
      const models = positional.length > 0 ? positional : CANDIDATE_MODELS;
      const api = client(config, deps);
      for (const model of models) {
        try {
          const tool = await api.modelDetail(model);
          const tiers = parseDynamicPrice(tool.dynamicprice);
          out(`\n${model}`);
          if (tiers.length === 0) {
            out(`  no dynamic price; cps=${tool.cps ?? '?'} approximatelycost=${tool.approximatelycost ?? '?'}`);
          }
          for (const tier of tiers) {
            out(`  $${tier.price} ${PRICE_METHODS[tier.priceMethod] ?? tier.priceMethod}  ${JSON.stringify(tier.inputs ?? {})}`);
          }
        } catch (error) {
          out(`\n${model}\n  ${error.message}`);
        }
      }
      return 0;
    }

    case 'estimate': {
      const [jobId] = positional;
      if (!jobId) throw new Error('Usage: estimate <job>');
      const ctx = await prepare(jobId, config, deps, root, flags.attempt);
      const acceptApproximate = Boolean(flags['accept-approximate']);
      const blocked = blockReason(ctx, acceptApproximate);
      const code = blocked ? null : approvalCode({ ...ctx, acceptApproximate });
      printEstimate(out, ctx, code);
      if (blocked) out(`\nNOT APPROVABLE: ${blocked}`);
      await writeJson(join(root, RUNS_DIR, ctx.job.id, 'estimate.json'), {
        checkedAt: now().toISOString(),
        model: ctx.job.model,
        params: ctx.job.params,
        firstFrame: ctx.job.firstFrame ?? null,
        firstFrameSha256: ctx.firstFrameSha256,
        attempt: ctx.attempt,
        estimate: { status: ctx.estimate.status, priceUsd: ctx.estimate.priceUsd, method: ctx.estimate.method ?? null, tier: ctx.estimate.tier ?? null },
        budgetCapUsd: ctx.cap,
        approvalCode: code,
        blocked: blocked ?? null,
      });
      return blocked ? 2 : 0;
    }

    case 'generate': {
      const [jobId] = positional;
      if (!jobId) throw new Error('Usage: generate <job> --approve <code>');
      const ctx = await prepare(jobId, config, deps, root, flags.attempt);
      const acceptApproximate = Boolean(flags['accept-approximate']);
      const blocked = blockReason(ctx, acceptApproximate);
      if (blocked) {
        out(`REFUSED: ${blocked}`);
        return 2;
      }
      if (ctx.runs.some((run) => run.attempt === ctx.attempt)) {
        out(`REFUSED: attempt ${ctx.attempt} of ${ctx.job.id} already exists. No automatic retries; a new attempt needs a new approval.`);
        return 2;
      }
      const expected = approvalCode({ ...ctx, acceptApproximate });
      if (flags.approve !== expected) {
        printEstimate(out, ctx, null);
        out(`\nREFUSED: approval code ${flags.approve ? `"${flags.approve}" does not match` : 'missing'}. ` +
          'The job, first frame, attempt or live price changed since approval, or no approval was given. Run `estimate` again.');
        return 2;
      }
      const params = { ...ctx.job.params };
      if (flags['dry-run']) {
        printEstimate(out, ctx, expected);
        out(`\nDRY RUN — would upload ${ctx.job.firstFrame} and POST /Run/${ctx.job.model} with:`);
        out(JSON.stringify({ ...params, [ctx.job.imageParam ?? 'inputImageUrl']: '<uploaded first-frame URL>' }, null, 2));
        return 0;
      }

      const api = client(config, deps);
      if (ctx.firstFramePath) {
        params[ctx.job.imageParam ?? 'inputImageUrl'] = await api.uploadFile(ctx.firstFramePath);
      }
      const started = now();
      const { taskid, tasktoken } = await api.run(ctx.job.model, params);
      const record = {
        job: ctx.job.id,
        attempt: ctx.attempt,
        approvalCode: expected,
        model: ctx.job.model,
        params,
        firstFrame: ctx.job.firstFrame ?? null,
        firstFrameSha256: ctx.firstFrameSha256,
        estimateUsd: ctx.estimate.priceUsd,
        budgetCapUsd: ctx.cap,
        submittedAt: started.toISOString(),
        taskid,
        status: 'submitted',
      };
      const path = runPath(ctx.job.id, ctx.attempt, root);
      await writeJson(path, record); // before waiting: a crash can never lead to a second submission
      out(`Submitted task ${taskid}. Waiting (no retries)…`);

      let task;
      try {
        task = await waitForTask(api, { tasktoken }, { sleep: deps.sleep, onPoll: (t) => deps.onPoll?.(t) });
      } catch (error) {
        Object.assign(record, { status: 'unknown', error: error.message, lastStatus: error.lastTask?.status ?? null });
        await writeJson(path, record);
        out(`Stopped waiting: ${error.message}\nCheck later with: npm run video -- status ${ctx.job.id}`);
        return 3;
      }

      const state = taskState(task);
      const outputs = [];
      if (state === 'completed') {
        const dir = join(root, OUTPUT_DIR, ctx.job.id, `attempt-${ctx.attempt}`);
        await mkdir(dir, { recursive: true });
        for (const [index, output] of (task.outputs ?? []).filter((o) => o.url).entries()) {
          const response = await (deps.fetch ?? fetch)(output.url);
          const bytes = Buffer.from(await response.arrayBuffer());
          const name = basename(new URL(output.url).pathname) || `output-${index}${extname(output.url) || '.mp4'}`;
          const file = join(dir, name);
          await writeFile(file, bytes);
          outputs.push({
            file: relative(root, file),
            url: output.url,
            contentType: output.contenttype ?? null,
            bytes: bytes.length,
            sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
          });
        }
      }
      Object.assign(record, {
        status: state,
        finishedAt: now().toISOString(),
        elapsedSeconds: task.elapsedseconds ? Number(task.elapsedseconds) : null,
        costUsd: state === 'completed' ? Number(task.totalcost || 0) : 0,
        exitCode: task.pexit ?? null,
        outputs,
      });
      await writeJson(path, record);
      const ledger = await appendLedger(
        {
          at: record.finishedAt,
          job: record.job,
          attempt: record.attempt,
          model: record.model,
          taskid,
          status: state,
          estimateUsd: record.estimateUsd,
          costUsd: record.costUsd,
        },
        root,
      );
      out(`Task ${taskid}: ${state}. Charged ${formatUsd(record.costUsd)} (estimate ${formatUsd(record.estimateUsd)}). Ledger total ${formatUsd(ledger.totalChargedUsd)}.`);
      for (const output of outputs) out(`  saved ${output.file} (${output.bytes} bytes)`);
      return state === 'completed' ? 0 : 4;
    }

    case 'status': {
      const [jobId] = positional;
      if (!jobId) throw new Error('Usage: status <job> [--refresh]');
      const runs = await listRuns(jobId, root);
      if (runs.length === 0) out(`No runs for ${jobId}.`);
      if (flags.refresh) {
        // Read-only: asks Wiro what happened to runs whose outcome we never saw. Never resubmits.
        const api = client(config, deps);
        for (const run of runs.filter((r) => ['submitted', 'unknown', 'running'].includes(r.status))) {
          const task = await api.taskDetail({ taskid: run.taskid });
          const state = taskState(task);
          Object.assign(run, {
            status: state,
            costUsd: state === 'completed' ? Number(task.totalcost || 0) : state === 'running' ? null : 0,
            outputUrls: (task.outputs ?? []).filter((o) => o.url).map((o) => o.url),
            refreshedAt: now().toISOString(),
          });
          await writeJson(runPath(jobId, run.attempt, root), run);
        }
      }
      for (const run of runs) {
        out(`attempt ${run.attempt}: ${run.status} task=${run.taskid} cost=${formatUsd(run.costUsd ?? null)} estimate=${formatUsd(run.estimateUsd)}`);
      }
      return 0;
    }

    default:
      out('Commands: check | models | estimate <job> | generate <job> --approve <code> [--attempt N] [--dry-run] | status <job>');
      return command ? 1 : 0;
  }
}

/** Why a job may not run (or null). */
export function blockReason({ estimate, cap }, acceptApproximate) {
  if (estimate.status === 'unknown') return `price could not be verified (${estimate.reason ?? 'no matching price'}).`;
  if (estimate.status === 'approximate' && !acceptApproximate) {
    return 'price is only an approximation (compute-time billing). Re-run with --accept-approximate if the founder accepts that.';
  }
  const worstCase = estimate.status === 'approximate' ? estimate.priceUsd * 2 : estimate.priceUsd;
  if (worstCase > cap) {
    return `${estimate.status === 'approximate' ? 'twice the approximate' : 'the'} price (${formatUsd(worstCase)}) exceeds the ${formatUsd(cap)} budget cap.`;
  }
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    });
}
