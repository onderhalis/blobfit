// Minimal Wiro API client (no dependencies).
// Endpoints and authentication mirror Wiro's official MCP server, @wiro-ai/wiro-mcp@1.3.1:
//   base    https://api.wiro.ai/v1   (all calls are POST)
//   headers x-api-key; with a secret also x-nonce and
//           x-signature = HMAC-SHA256(key = apiKey, message = apiSecret + nonce) as hex
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

export const DEFAULT_BASE_URL = 'https://api.wiro.ai/v1';

/** Terminal task statuses (official client: TERMINAL_STATUSES). */
export const TERMINAL_STATUSES = ['task_postprocess_end', 'task_cancel'];

export class WiroApiError extends Error {
  constructor(status, body) {
    super(`Wiro API error ${status}: ${String(body).slice(0, 500)}`);
    this.name = 'WiroApiError';
    this.status = status;
  }
}

export function signatureHeaders(apiKey, apiSecret, nonce = Date.now().toString()) {
  const headers = { 'x-api-key': apiKey };
  if (apiSecret) {
    headers['x-nonce'] = nonce;
    headers['x-signature'] = crypto.createHmac('sha256', apiKey).update(apiSecret + nonce).digest('hex');
  }
  return headers;
}

/** completed | failed | cancelled | running — same rules as the official client. */
export function taskState(task) {
  if (task.status === 'task_cancel') return 'cancelled';
  if (task.status === 'task_postprocess_end') return task.pexit === '0' ? 'completed' : 'failed';
  return 'running';
}

export function splitModel(model) {
  const [owner, ...rest] = model.split('/');
  const project = rest.join('/');
  if (!owner || !project) throw new Error(`Model must be "owner/model", got "${model}"`);
  return { owner, project };
}

export function createClient({ apiKey, apiSecret, baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('WIRO_API_KEY is not set');

  async function post(path, body) {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { ...signatureHeaders(apiKey, apiSecret), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) throw new WiroApiError(response.status, text);
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Wiro returned invalid JSON for ${path}`);
    }
    return json;
  }

  return {
    /** Model detail incl. `dynamicprice`, `cps`, `approximatelycost`. Read-only, no charge. */
    async modelDetail(model) {
      const { owner, project } = splitModel(model);
      const detail = await post('/Tool/Detail', { slugowner: owner, slugproject: project });
      const tool = Array.isArray(detail.tool) ? detail.tool[0] : detail.tool;
      if (!tool) {
        throw new Error(`Model ${model} not found: ${JSON.stringify(detail.errors ?? detail).slice(0, 300)}`);
      }
      return tool;
    },

    /** Uploads a local file and returns its Wiro-hosted URL. */
    async uploadFile(path) {
      const data = await readFile(path);
      const form = new FormData();
      form.append('file', new Blob([data]), basename(path));
      const response = await fetchImpl(`${baseUrl}/File/Upload`, {
        method: 'POST',
        headers: signatureHeaders(apiKey, apiSecret),
        body: form,
      });
      const text = await response.text();
      if (!response.ok) throw new WiroApiError(response.status, text);
      const json = JSON.parse(text);
      const url = json.result ? json.list?.[0]?.url : undefined;
      if (!url) throw new Error(`Upload failed: ${text.slice(0, 300)}`);
      return url;
    },

    /** Starts a task. THIS SPENDS CREDITS when the task succeeds. */
    async run(model, params) {
      const { owner, project } = splitModel(model);
      const response = await post(`/Run/${owner}/${project}`, params);
      if (!response.result || !response.taskid || !response.socketaccesstoken) {
        throw new Error(`Run rejected: ${JSON.stringify(response.errors ?? response).slice(0, 300)}`);
      }
      return { taskid: String(response.taskid), tasktoken: response.socketaccesstoken };
    },

    async taskDetail({ taskid, tasktoken }) {
      const body = tasktoken ? { tasktoken } : { taskid };
      const detail = await post('/Task/Detail', body);
      const task = detail.tasklist?.[0];
      if (!detail.result || !task) throw new Error(`Task not found: ${JSON.stringify(detail.errors ?? {}).slice(0, 300)}`);
      return task;
    },

    async cancel(taskid) {
      return post('/Task/Cancel', { taskid });
    },
  };
}

/**
 * Polls until the task reaches a terminal status. Never resubmits the task.
 * Transient status-check errors are tolerated up to `maxErrors` in a row.
 */
export async function waitForTask(client, ref, { timeoutMs = 15 * 60_000, intervalMs, onPoll, sleep, maxErrors = 5 } = {}) {
  const wait = sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const started = Date.now();
  let errors = 0;
  let last;
  while (Date.now() - started < timeoutMs) {
    try {
      last = await client.taskDetail(ref);
      errors = 0;
      onPoll?.(last);
      if (TERMINAL_STATUSES.includes(last.status)) return last;
    } catch (error) {
      errors += 1;
      if (errors >= maxErrors) throw error;
    }
    const elapsed = Date.now() - started;
    await wait(intervalMs ?? (elapsed < 15_000 ? 2_000 : elapsed < 60_000 ? 5_000 : 10_000));
  }
  const timeout = new Error(`Task still running after ${Math.round(timeoutMs / 1000)}s (not resubmitted).`);
  timeout.lastTask = last;
  throw timeout;
}
