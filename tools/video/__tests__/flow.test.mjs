// End-to-end CLI flow against a local fake Wiro API: no network, no credentials, no credits.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { main } from '../cli.mjs';

const REPO = fileURLToPath(new URL('../../..', import.meta.url));
const KEY = 'test-key-0001';
const SECRET = 'test-secret';
const CANONICAL_FRAME = 'video/inputs/ep003-squat-first-frame-canonical.png';

/** Smallest byte sequence the size check reads: PNG signature + IHDR (no image data needed). */
function pngHeader(width, height) {
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write('IHDR', 4, 'latin1');
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr.set([8, 6, 0, 0, 0], 16);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ihdr]);
}

function fakeWiro() {
  const state = { price: 0.35, runs: 0, uploads: 0, polls: 0, outcome: 'success', authFailures: 0, lastRunBody: null };
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    const { 'x-api-key': key, 'x-nonce': nonce, 'x-signature': signature } = req.headers;
    const expected = crypto.createHmac('sha256', KEY).update(SECRET + nonce).digest('hex');
    const send = (body, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (req.url === '/files/out.mp4') {
      res.writeHead(200, { 'Content-Type': 'video/mp4' });
      res.end(Buffer.from('fake-mp4-bytes'));
      return;
    }
    if (key !== KEY || signature !== expected) {
      state.authFailures += 1;
      send({ result: false, errors: [{ message: 'unauthorized' }] }, 401);
      return;
    }
    const body = req.headers['content-type']?.startsWith('application/json') ? JSON.parse(raw.toString() || '{}') : {};
    switch (req.url) {
      case '/v1/Tool/Detail':
        send({
          result: true,
          tool: [{ slugowner: body.slugowner, slugproject: body.slugproject, dynamicprice: JSON.stringify([
            { inputs: { duration: '5' }, price: state.price, priceMethod: 'cpr' },
            { inputs: { duration: '10' }, price: state.price * 2, priceMethod: 'cpr' },
          ]) }],
        });
        return;
      case '/v1/File/Upload':
        state.uploads += 1;
        send({ result: true, list: [{ url: `http://127.0.0.1:${server.address().port}/files/first-frame.png` }] });
        return;
      case '/v1/Run/klingai/kling-v2.6':
        state.runs += 1;
        state.lastRunBody = body;
        send({ result: true, taskid: '9001', socketaccesstoken: 'tok_9001' });
        return;
      case '/v1/Task/Detail': {
        state.polls += 1;
        const done = state.polls >= 2;
        const ok = state.outcome === 'success';
        send({
          result: true,
          tasklist: [{
            id: '9001',
            status: done ? 'task_postprocess_end' : 'task_start',
            pexit: done ? (ok ? '0' : '1') : '',
            totalcost: done && ok ? String(state.price) : '0',
            elapsedseconds: '42',
            outputs: done && ok ? [{ url: `http://127.0.0.1:${server.address().port}/files/out.mp4`, contenttype: 'video/mp4' }] : [],
          }],
        });
        return;
      }
      default:
        send({ result: false }, 404);
    }
  });
  return { server, state };
}

describe('wiro CLI flow (fake API)', () => {
  let fake;
  let root;
  let deps;
  let lines;

  before(async () => {
    fake = fakeWiro();
    await new Promise((resolve) => fake.server.listen(0, '127.0.0.1', resolve));
  });
  after(() => fake.server.close());

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'blobfit-video-'));
    await cp(join(REPO, 'video/jobs'), join(root, 'video/jobs'), { recursive: true });
    await cp(join(REPO, 'video/inputs'), join(root, 'video/inputs'), { recursive: true });
    await writeFile(join(root, CANONICAL_FRAME), pngHeader(1080, 1920));
    Object.assign(fake.state, { price: 0.35, runs: 0, uploads: 0, polls: 0, outcome: 'success', authFailures: 0, lastRunBody: null });
    lines = [];
    deps = {
      root,
      out: (line) => lines.push(line),
      sleep: async () => undefined,
      config: { WIRO_API_KEY: KEY, WIRO_API_SECRET: SECRET, WIRO_BASE_URL: `http://127.0.0.1:${fake.server.address().port}/v1` },
    };
  });

  const codeFrom = () => lines.find((line) => line.startsWith('Approval code:'))?.split(': ')[1];

  it('estimates without spending and prints an approval code', async () => {
    assert.equal(await main(['estimate', 'ep003-squat-test'], deps), 0);
    assert.equal(fake.state.runs, 0);
    assert.match(codeFrom(), /^[0-9a-f]{10}$/);
    assert.ok(lines.some((line) => line.includes('$0.350')));
    const saved = JSON.parse(await readFile(join(root, 'video/runs/ep003-squat-test/estimate.json'), 'utf8'));
    assert.equal(saved.estimate.priceUsd, 0.35);
    await rm(root, { recursive: true, force: true });
  });

  it('shows the price but withholds the code while the canonical first frame is missing', async () => {
    await rm(join(root, CANONICAL_FRAME));
    assert.equal(await main(['estimate', 'ep003-squat-test'], deps), 2);
    assert.equal(codeFrom(), undefined);
    assert.ok(lines.some((line) => line.includes('$0.350')));
    assert.ok(lines.some((line) => line.includes('NOT APPROVABLE') && line.includes('not in the repository yet')));
    assert.equal(await main(['generate', 'ep003-squat-test', '--approve', 'deadbeef00'], deps), 2);
    assert.equal(fake.state.runs + fake.state.uploads, 0);
    await rm(root, { recursive: true, force: true });
  });

  it('withholds the code when the first frame is below spec', async () => {
    await copyFile(join(root, 'video/inputs/ep003-squat-first-frame.png'), join(root, CANONICAL_FRAME)); // interim, 720x1280
    assert.equal(await main(['estimate', 'ep003-squat-test'], deps), 2);
    assert.ok(lines.some((line) => line.includes('720x1280')));
    await writeFile(join(root, CANONICAL_FRAME), pngHeader(1440, 1920));
    assert.equal(await main(['estimate', 'ep003-squat-test'], deps), 2);
    assert.ok(lines.some((line) => line.includes('not 9:16')));
    assert.equal(codeFrom(), undefined);
    await rm(root, { recursive: true, force: true });
  });

  it('refuses to generate without the matching approval code', async () => {
    assert.equal(await main(['generate', 'ep003-squat-test'], deps), 2);
    assert.equal(await main(['generate', 'ep003-squat-test', '--approve', 'deadbeef00'], deps), 2);
    assert.equal(fake.state.runs, 0);
    assert.equal(fake.state.uploads, 0);
    await rm(root, { recursive: true, force: true });
  });

  it('refuses when the live price changed after approval', async () => {
    await main(['estimate', 'ep003-squat-test'], deps);
    const code = codeFrom();
    fake.state.price = 0.4;
    assert.equal(await main(['generate', 'ep003-squat-test', '--approve', code], deps), 2);
    assert.equal(fake.state.runs, 0);
    await rm(root, { recursive: true, force: true });
  });

  it('refuses when the price exceeds the budget cap', async () => {
    fake.state.price = 1.5;
    assert.equal(await main(['estimate', 'ep003-squat-test'], deps), 2);
    assert.equal(codeFrom(), undefined);
    assert.ok(lines.some((line) => line.includes('exceeds')));
    await rm(root, { recursive: true, force: true });
  });

  it('dry run sends nothing', async () => {
    await main(['estimate', 'ep003-squat-test'], deps);
    const code = codeFrom();
    assert.equal(await main(['generate', 'ep003-squat-test', '--approve', code, '--dry-run'], deps), 0);
    assert.equal(fake.state.runs + fake.state.uploads, 0);
    await rm(root, { recursive: true, force: true });
  });

  it('runs exactly once with approval, records cost and output, and never repeats the attempt', async () => {
    await main(['estimate', 'ep003-squat-test'], deps);
    const code = codeFrom();
    assert.equal(await main(['generate', 'ep003-squat-test', '--approve', code], deps), 0);
    assert.equal(fake.state.runs, 1);
    assert.equal(fake.state.uploads, 1);
    assert.equal(fake.state.authFailures, 0);
    assert.deepEqual(
      [fake.state.lastRunBody.duration, fake.state.lastRunBody.ratio, fake.state.lastRunBody.sound],
      ['5', '9:16', 'off'],
    );
    assert.match(fake.state.lastRunBody.inputImageUrl, /first-frame\.png$/);

    const record = JSON.parse(await readFile(join(root, 'video/runs/ep003-squat-test/attempt-1.json'), 'utf8'));
    assert.equal(record.status, 'completed');
    assert.equal(record.costUsd, 0.35);
    assert.equal(record.outputs.length, 1);
    assert.ok(existsSync(join(root, record.outputs[0].file)));
    const ledger = JSON.parse(await readFile(join(root, 'video/ledger.json'), 'utf8'));
    assert.equal(ledger.totalChargedUsd, 0.35);

    // Same approval again: refused, attempt 1 exists.
    assert.equal(await main(['generate', 'ep003-squat-test', '--approve', code, '--attempt', '1'], deps), 2);
    // Default next attempt needs a new code.
    assert.equal(await main(['generate', 'ep003-squat-test', '--approve', code], deps), 2);
    assert.equal(fake.state.runs, 1);
    await rm(root, { recursive: true, force: true });
  });

  it('does not retry a failed task and records no charge', async () => {
    fake.state.outcome = 'failure';
    await main(['estimate', 'ep003-squat-test'], deps);
    assert.equal(await main(['generate', 'ep003-squat-test', '--approve', codeFrom()], deps), 4);
    assert.equal(fake.state.runs, 1);
    const record = JSON.parse(await readFile(join(root, 'video/runs/ep003-squat-test/attempt-1.json'), 'utf8'));
    assert.deepEqual([record.status, record.costUsd], ['failed', 0]);
    await rm(root, { recursive: true, force: true });
  });

  it('reports missing credentials without calling the API', async () => {
    const before = fake.state.authFailures;
    assert.equal(await main(['check'], { ...deps, config: {} }), 1);
    assert.equal(fake.state.authFailures, before);
    assert.ok(lines.some((line) => line.includes('NOT SET')));
    await rm(root, { recursive: true, force: true });
  });
});
