import http from 'node:http';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const MARKER = '<!-- ai-review -->';
export const MAX_BODY_LENGTH = 60000;

const MAX_REQUEST_BYTES = 1024 * 1024;
const REVIEW_EVENTS = new Set(['COMMENT', 'APPROVE']);

export const formatBody = (body) => `${MARKER}\n\n${body}`;

export const defaultExec = (file, args, opts = {}) =>
  new Promise((resolve) => {
    const child = spawn(file, args, { stdio: ['pipe', 'pipe', 'pipe'], env: process.env });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => resolve({ status: 1, stdout, stderr: String(error) }));
    child.on('close', (code) =>
      resolve({ status: typeof code === 'number' ? code : 1, stdout, stderr })
    );
    if (opts.input != null) child.stdin.end(opts.input);
    else child.stdin.end();
  });

const readJson = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    let bytes = 0;
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > MAX_REQUEST_BYTES) {
        reject(new Error('request too large'));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });

export async function startBroker({
  pr,
  repo,
  exec = defaultExec,
  maxPosts = 5,
  dryRun = false,
  port = 0,
  host = '127.0.0.1',
} = {}) {
  if (!Number.isInteger(pr) || pr <= 0) throw new Error('pr must be a positive integer');
  if (typeof repo !== 'string' || !/^[^/\s]+\/[^/\s]+$/.test(repo)) {
    throw new Error('repo must be "owner/name"');
  }

  let posts = 0;
  const limit = Number.isInteger(maxPosts) && maxPosts > 0 ? maxPosts : 5;

  const server = http.createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;

    const send = (status, payload) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    };

    if (req.method === 'GET' && path === '/health') {
      send(200, { ok: true });
      return;
    }

    if (req.method !== 'POST' || (path !== '/comment' && path !== '/review')) {
      send(404, { error: 'not found' });
      return;
    }

    let payload;
    try {
      payload = await readJson(req);
    } catch {
      send(400, { error: 'invalid JSON body' });
      return;
    }

    const body = typeof payload?.body === 'string' ? payload.body.trim() : '';
    if (!body) {
      send(400, { error: 'body is required' });
      return;
    }
    if (body.length > MAX_BODY_LENGTH) {
      send(413, { error: `body exceeds ${MAX_BODY_LENGTH} characters` });
      return;
    }

    const isReview = path === '/review';
    const event = payload?.event;
    if (isReview && !REVIEW_EVENTS.has(event)) {
      send(400, { error: 'event must be COMMENT or APPROVE' });
      return;
    }

    if (posts >= limit) {
      send(429, { error: `post limit of ${limit} reached` });
      return;
    }

    const fullBody = formatBody(body);
    if (dryRun) {
      process.stdout.write(`[dry-run] ${path} pr=${pr} event=${event ?? 'COMMENT'}\n\n${fullBody}\n\n`);
      send(200, { ok: true, dryRun: true });
      return;
    }

    posts += 1;

    const result = isReview
      ? await exec('gh', [
          'api',
          '--method',
          'POST',
          `repos/${repo}/pulls/${pr}/reviews`,
          '-f',
          `event=${event}`,
          '-f',
          `body=${fullBody}`,
        ])
      : await exec('gh', ['pr', 'comment', String(pr), '--body-file', '-'], { input: fullBody });

    if (result.status !== 0) {
      posts -= 1;
      send(502, { error: result.stderr || 'gh failed' });
      return;
    }

    send(201, { ok: true });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });

  const actualPort = server.address().port;

  return {
    url: `http://${host}:${actualPort}`,
    port: actualPort,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const pr = Number.parseInt(process.env.AI_REVIEW_PR ?? '', 10);
  const repo = process.env.AI_REVIEW_REPO ?? '';
  const maxPosts = Number.parseInt(process.env.AI_REVIEW_MAX_POSTS ?? '5', 10);
  const dryRun = process.env.AI_REVIEW_DRY_RUN === '1';
  const infoFile = process.env.AI_REVIEW_BROKER_INFO;

  if (!infoFile) {
    console.error('AI_REVIEW_BROKER_INFO is required');
    process.exit(1);
  }

  startBroker({ pr, repo, maxPosts, dryRun })
    .then((broker) => {
      writeFileSync(infoFile, `${broker.url}\n`, 'utf8');
      process.stdout.write(`broker listening on ${broker.url}\n`);
      const stop = () => broker.close().then(() => process.exit(0));
      process.on('SIGTERM', stop);
      process.on('SIGINT', stop);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
