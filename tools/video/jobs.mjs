// Job specs, approval codes and run records for budget-controlled generation.
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export const ROOT = process.cwd();
export const JOBS_DIR = 'video/jobs';
export const RUNS_DIR = 'video/runs';
export const OUTPUT_DIR = 'video/output';
export const LEDGER = 'video/ledger.json';

export async function loadJob(id, root = ROOT) {
  const path = join(root, JOBS_DIR, `${id}.json`);
  if (!existsSync(path)) throw new Error(`No job spec at ${JOBS_DIR}/${id}.json`);
  const job = JSON.parse(await readFile(path, 'utf8'));
  for (const field of ['id', 'model', 'params', 'budgetCapUsd']) {
    if (job[field] === undefined) throw new Error(`Job ${id} is missing "${field}"`);
  }
  if (job.id !== id) throw new Error(`Job file ${id}.json declares id "${job.id}"`);
  return job;
}

export async function sha256File(path) {
  return crypto.createHash('sha256').update(await readFile(path)).digest('hex');
}

/** Effective cap: the lower of the job's cap and WIRO_BUDGET_CAP_USD (if set). */
export function effectiveCap(job, envCap) {
  const caps = [Number(job.budgetCapUsd)];
  if (envCap !== undefined && envCap !== '') caps.push(Number(envCap));
  const valid = caps.filter((cap) => Number.isFinite(cap) && cap >= 0);
  if (valid.length === 0) throw new Error('No valid budget cap configured');
  return Math.min(...valid);
}

/**
 * Short code the founder approves. It binds the exact model, parameters, first-frame bytes,
 * attempt number and the live price, so any change (including a Wiro price change) needs a new approval.
 */
export function approvalCode({ job, firstFrameSha256, attempt, estimate, acceptApproximate = false }) {
  const payload = JSON.stringify({
    model: job.model,
    params: sortKeys(job.params),
    imageParam: job.imageParam ?? null,
    firstFrameSha256: firstFrameSha256 ?? null,
    attempt,
    price: estimate.priceUsd,
    status: estimate.status,
    acceptApproximate,
  });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 10);
}

function sortKeys(object) {
  return Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));
}

export function runPath(jobId, attempt, root = ROOT) {
  return join(root, RUNS_DIR, jobId, `attempt-${attempt}.json`);
}

export async function listRuns(jobId, root = ROOT) {
  const dir = join(root, RUNS_DIR, jobId);
  if (!existsSync(dir)) return [];
  const files = (await readdir(dir)).filter((file) => /^attempt-\d+\.json$/.test(file)).sort();
  return Promise.all(files.map(async (file) => JSON.parse(await readFile(join(dir, file), 'utf8'))));
}

export async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
}

export async function appendLedger(entry, root = ROOT) {
  const path = join(root, LEDGER);
  const ledger = existsSync(path) ? JSON.parse(await readFile(path, 'utf8')) : { runs: [] };
  ledger.runs.push(entry);
  ledger.totalChargedUsd = Math.round(ledger.runs.reduce((sum, run) => sum + (Number(run.costUsd) || 0), 0) * 1e6) / 1e6;
  await writeJson(path, ledger);
  return ledger;
}
