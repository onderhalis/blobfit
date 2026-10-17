import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';

import { blockReason } from '../cli.mjs';
import { describeSecret, parseEnvFile } from '../env.mjs';
import { approvalCode, effectiveCap, pngSize } from '../jobs.mjs';
import { estimateCost } from '../pricing.mjs';
import { signatureHeaders, taskState } from '../wiro-client.mjs';

describe('signature', () => {
  it('matches the official scheme: HMAC-SHA256(key = apiKey, message = secret + nonce)', () => {
    const headers = signatureHeaders('KEY', 'SECRET', '1700000000000');
    const expected = crypto.createHmac('sha256', 'KEY').update('SECRET1700000000000').digest('hex');
    assert.deepEqual(headers, { 'x-api-key': 'KEY', 'x-nonce': '1700000000000', 'x-signature': expected });
  });

  it('sends only the API key when no secret is configured', () => {
    assert.deepEqual(signatureHeaders('KEY', undefined), { 'x-api-key': 'KEY' });
  });
});

describe('task state', () => {
  it('follows the official terminal rules', () => {
    assert.equal(taskState({ status: 'task_postprocess_end', pexit: '0' }), 'completed');
    assert.equal(taskState({ status: 'task_postprocess_end', pexit: '1' }), 'failed');
    assert.equal(taskState({ status: 'task_cancel' }), 'cancelled');
    assert.equal(taskState({ status: 'task_start' }), 'running');
  });
});

describe('pricing', () => {
  const tiers = [
    { inputs: { duration: '5' }, price: 0.35, priceMethod: 'cpr' },
    { inputs: { duration: '10' }, price: 0.7, priceMethod: 'cpr' },
    { inputs: { duration: '5', sound: 'on' }, price: 0.7, priceMethod: 'cpr' },
  ];

  it('picks the most specific matching tier', () => {
    const tool = { dynamicprice: JSON.stringify(tiers) };
    assert.equal(estimateCost(tool, { duration: '5', sound: 'off' }).priceUsd, 0.35);
    assert.equal(estimateCost(tool, { duration: '5', sound: 'on' }).priceUsd, 0.7);
    assert.equal(estimateCost(tool, { duration: '10', sound: 'off' }).status, 'exact');
  });

  it('multiplies per-video-second prices by the duration', () => {
    const tool = { dynamicprice: [{ inputs: {}, price: 0.07, priceMethod: 'cp-outputVideoLength' }] };
    assert.deepEqual(
      { status: estimateCost(tool, { duration: '5' }).status, price: estimateCost(tool, { duration: '5' }).priceUsd },
      { status: 'exact', price: 0.35 },
    );
  });

  it('refuses to guess when nothing matches or the method is unsupported', () => {
    assert.equal(estimateCost({ dynamicprice: tiers }, { duration: '6' }).status, 'unknown');
    assert.equal(estimateCost({ dynamicprice: [{ inputs: {}, price: 1, priceMethod: 'cps' }] }, {}).status, 'unknown');
    assert.equal(estimateCost({ dynamicprice: [{ inputs: { n: 'QUANTITY:1' }, price: 1, priceMethod: 'cpr' }] }, { n: 2 }).status, 'unknown');
    assert.equal(estimateCost({}, {}).status, 'unknown');
  });

  it('marks compute-time billing as approximate', () => {
    const estimate = estimateCost({ approximatelycost: '0.12' }, {});
    assert.deepEqual([estimate.status, estimate.priceUsd], ['approximate', 0.12]);
  });
});

describe('approval and budget', () => {
  const job = { id: 'j', model: 'klingai/kling-v2.6', params: { duration: '5', ratio: '9:16' }, budgetCapUsd: 1 };
  const estimate = { status: 'exact', priceUsd: 0.35 };
  const base = { job, firstFrameSha256: 'abc', attempt: 1, estimate };

  it('is stable for the same run and changes when anything that affects spend changes', () => {
    const code = approvalCode(base);
    assert.equal(code, approvalCode({ ...base, job: { ...job, params: { ratio: '9:16', duration: '5' } } }));
    assert.notEqual(code, approvalCode({ ...base, attempt: 2 }));
    assert.notEqual(code, approvalCode({ ...base, estimate: { ...estimate, priceUsd: 0.36 } }));
    assert.notEqual(code, approvalCode({ ...base, firstFrameSha256: 'abd' }));
    assert.notEqual(code, approvalCode({ ...base, job: { ...job, params: { ...job.params, duration: '10' } } }));
    assert.match(code, /^[0-9a-f]{10}$/);
  });

  it('uses the lower of the job cap and the environment cap', () => {
    assert.equal(effectiveCap({ budgetCapUsd: 1 }, '0.5'), 0.5);
    assert.equal(effectiveCap({ budgetCapUsd: 0.4 }, '2'), 0.4);
    assert.equal(effectiveCap({ budgetCapUsd: 1 }, undefined), 1);
  });

  it('blocks unknown prices, over-cap prices and unaccepted approximations', () => {
    assert.equal(blockReason({ estimate, cap: 1 }, false), null);
    assert.match(blockReason({ estimate: { status: 'exact', priceUsd: 1.2 }, cap: 1 }, false), /exceeds/);
    assert.match(blockReason({ estimate: { status: 'unknown', priceUsd: null }, cap: 1 }, false), /could not be verified/);
    assert.match(blockReason({ estimate: { status: 'approximate', priceUsd: 0.3 }, cap: 1 }, false), /approximation/);
    assert.equal(blockReason({ estimate: { status: 'approximate', priceUsd: 0.3 }, cap: 1 }, true), null);
    assert.match(blockReason({ estimate: { status: 'approximate', priceUsd: 0.6 }, cap: 1 }, true), /exceeds/);
  });
});

describe('credentials', () => {
  it('parses .env files', () => {
    assert.deepEqual(parseEnvFile('# c\nWIRO_API_KEY=abc\nexport WIRO_API_SECRET="s e"\n'), {
      WIRO_API_KEY: 'abc',
      WIRO_API_SECRET: 's e',
    });
  });

  it('never prints a secret', () => {
    assert.equal(describeSecret('supersecretvalue'), 'set');
    assert.equal(describeSecret('apikey1234', { showTail: true }), 'set (ends …1234)');
    assert.equal(describeSecret(undefined), 'NOT SET');
  });
});

describe('first frame', () => {
  it('reads PNG dimensions from the header and rejects other files', () => {
    const header = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header);
    header.write('IHDR', 12, 'latin1');
    header.writeUInt32BE(1080, 16);
    header.writeUInt32BE(1920, 20);
    assert.deepEqual(pngSize(header), { width: 1080, height: 1920 });
    assert.equal(pngSize(Buffer.from('GIF89a and more bytes here...')), null);
  });
});
