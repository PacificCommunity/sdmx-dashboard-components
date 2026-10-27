import test from 'node:test';
import assert from 'node:assert/strict';
import { startBroker, MARKER, defaultExec } from './post-server.mjs';
import { postReview } from './post-review.mjs';
import http from 'node:http';

const calls = () => {
  const seen = [];
  const exec = async (file, args, opts = {}) => {
    seen.push({ file, args, input: opts.input });
    return { status: 0, stdout: 'ok', stderr: '' };
  };
  return { seen, exec };
};

const post = (url, path, payload) =>
  fetch(`${url}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

test('comment prepends marker and targets the fixed PR', async () => {
  const { seen, exec } = calls();
  const broker = await startBroker({ pr: 42, repo: 'o/r', exec });
  const res = await post(broker.url, '/comment', { body: 'Looks fine' });
  assert.equal(res.status, 201);
  assert.equal(seen.length, 1);
  assert.deepEqual(seen[0].args, ['pr', 'comment', '42', '--body-file', '-']);
  assert.equal(seen[0].input, `${MARKER}\n\nLooks fine`);
  await broker.close();
});

test('review only accepts COMMENT and APPROVE', async () => {
  const { seen, exec } = calls();
  const broker = await startBroker({ pr: 42, repo: 'o/r', exec });
  const ok = await post(broker.url, '/review', { body: 'ok', event: 'APPROVE' });
  assert.equal(ok.status, 201);
  assert.match(seen[0].args.join(' '), /repos\/o\/r\/pulls\/42\/reviews/);
  for (const event of ['REQUEST_CHANGES', 'CLOSE']) {
    const res = await post(broker.url, '/review', { body: 'no', event });
    assert.equal(res.status, 400);
  }
  assert.equal(seen.length, 1);
  await broker.close();
});

test('rejects unknown paths and invalid JSON', async () => {
  const broker = await startBroker({ pr: 1, repo: 'o/r', exec: calls().exec });
  assert.equal((await post(broker.url, '/merge', {})).status, 404);
  const bad = await fetch(`${broker.url}/comment`, { method: 'POST', body: '{' });
  assert.equal(bad.status, 400);
  await broker.close();
});

test('enforces the post cap', async () => {
  const broker = await startBroker({ pr: 1, repo: 'o/r', exec: calls().exec, maxPosts: 2 });
  assert.equal((await post(broker.url, '/comment', { body: 'a' })).status, 201);
  assert.equal((await post(broker.url, '/comment', { body: 'b' })).status, 201);
  assert.equal((await post(broker.url, '/comment', { body: 'c' })).status, 429);
  await broker.close();
});

test('rejects empty and oversized bodies without calling gh', async () => {
  const { seen, exec } = calls();
  const broker = await startBroker({ pr: 1, repo: 'o/r', exec });
  assert.equal((await post(broker.url, '/comment', { body: '' })).status, 400);
  assert.equal((await post(broker.url, '/comment', { body: 'x'.repeat(60001) })).status, 413);
  assert.equal(seen.length, 0);
  await broker.close();
});

test('dry run succeeds without calling gh', async () => {
  const { seen, exec } = calls();
  const broker = await startBroker({ pr: 1, repo: 'o/r', exec, dryRun: true });
  assert.equal((await post(broker.url, '/comment', { body: 'dry' })).status, 200);
  assert.equal((await post(broker.url, '/review', { body: 'dry', event: 'APPROVE' })).status, 200);
  assert.equal(seen.length, 0);
  await broker.close();
});

test('health reports ok', async () => {
  const broker = await startBroker({ pr: 1, repo: 'o/r', exec: calls().exec });
  const res = await fetch(`${broker.url}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  await broker.close();
});

test('postReview sends approvals to the review endpoint', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, init });
    return { status: 201, text: async () => '' };
  };
  const result = await postReview({ url: 'http://broker', event: 'approve', body: 'ok', fetchImpl });
  assert.equal(result.status, 201);
  assert.equal(seen[0].url, 'http://broker/review');
  assert.deepEqual(JSON.parse(seen[0].init.body), { body: 'ok', event: 'APPROVE' });
});

test('postReview sends comments to the comment endpoint', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, init });
    return { status: 201, text: async () => '' };
  };
  await postReview({ url: 'http://broker', event: 'comment', body: 'note', fetchImpl });
  assert.equal(seen[0].url, 'http://broker/comment');
  assert.deepEqual(JSON.parse(seen[0].init.body), { body: 'note', event: 'COMMENT' });
});

test('defaultExec writes input to the child and reports the exit status', { timeout: 5000 }, async () => {
  const result = await defaultExec(process.execPath, ['-e', 'process.stdin.pipe(process.stdout)'], {
    input: 'hello',
  });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'hello');
});

test('defaultExec reports a non-zero exit status', { timeout: 5000 }, async () => {
  const result = await defaultExec(process.execPath, ['-e', 'process.exit(3)']);
  assert.equal(result.status, 3);
});

test('concurrent posts cannot exceed the cap', async () => {
  const releases = [];
  const exec = async () => {
    await new Promise((resolve) => releases.push(resolve));
    return { status: 0, stdout: '', stderr: '' };
  };
  const broker = await startBroker({ pr: 1, repo: 'o/r', exec, maxPosts: 1 });
  const first = post(broker.url, '/comment', { body: 'a' });
  const second = post(broker.url, '/comment', { body: 'b' });
  const deadline = Date.now() + 1000;
  while (releases.length < 2 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  releases.forEach((release) => release());
  const statuses = [(await first).status, (await second).status].sort();
  assert.deepEqual(statuses, [201, 429]);
  await broker.close();
});

test('falls back to five posts when maxPosts is not a number', async () => {
  const broker = await startBroker({ pr: 1, repo: 'o/r', exec: calls().exec, maxPosts: NaN });
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await post(broker.url, '/comment', { body: `post ${i}` })).status, 201);
  }
  assert.equal((await post(broker.url, '/comment', { body: 'sixth' })).status, 429);
  await broker.close();
});

test('postReview times out when the broker never responds', { timeout: 5000 }, async () => {
  const hanging = http.createServer(() => {});
  await new Promise((resolve) => hanging.listen(0, '127.0.0.1', resolve));
  const { port } = hanging.address();
  try {
    await assert.rejects(
      postReview({ url: `http://127.0.0.1:${port}`, event: 'comment', body: 'x', timeoutMs: 50 }),
      /abort|timeout/i
    );
  } finally {
    hanging.closeAllConnections();
    await new Promise((resolve) => hanging.close(resolve));
  }
});
