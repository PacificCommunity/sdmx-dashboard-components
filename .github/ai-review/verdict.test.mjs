import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeReview } from './verdict.mjs';

const review = (verdict, findings = '') => `## AI review

### Verdict

${verdict}

### Findings

${findings}

### Scope note

Source only.
`;

test('approve without blocking findings succeeds', () => {
  const payload = summarizeReview(review('approve', '- **[P2] a note** — `x.ts:1`'));
  assert.equal(payload.status, 'completed');
  assert.equal(payload.conclusion, 'success');
  assert.equal(payload.output.title, 'AI review: approved');
  assert.match(payload.output.summary, /### Verdict/);
});

test('a P1 finding blocks even when the verdict says approve', () => {
  const payload = summarizeReview(review('approve', '- **[P1] broken** — `x.ts:9`'));
  assert.equal(payload.conclusion, 'failure');
  assert.equal(payload.output.title, 'AI review: blocking findings');
});

test('a P0 finding blocks', () => {
  const payload = summarizeReview(review('comment', '- **[P0] data loss** — `x.ts:9`'));
  assert.equal(payload.conclusion, 'failure');
});

test('comments with only P2 and P3 are neutral', () => {
  const payload = summarizeReview(review('comment', '- **[P2] tidy** — `x.ts:2`\n- **[P3] nit**'));
  assert.equal(payload.conclusion, 'neutral');
  assert.equal(payload.output.title, 'AI review: comments only');
});

test('missing review fails the check', () => {
  for (const markdown of ['', '   \n\n']) {
    const payload = summarizeReview(markdown);
    assert.equal(payload.status, 'completed');
    assert.equal(payload.conclusion, 'failure');
    assert.equal(payload.output.title, 'AI review: no review produced');
  }
});

test('verdict parsing tolerates case and surrounding whitespace', () => {
  const payload = summarizeReview(review('  APPROVE  '));
  assert.equal(payload.conclusion, 'success');
});

test('a missing Verdict section is treated as a comment', () => {
  const payload = summarizeReview('## AI review\n\n### Findings\n\nNothing.\n');
  assert.equal(payload.conclusion, 'neutral');
});

test('long reviews are truncated to the check summary limit', () => {
  const payload = summarizeReview(review('approve', `- **[P3] ${'x'.repeat(70000)}`));
  assert.ok(payload.output.summary.length <= 60000);
  assert.match(payload.output.summary, /truncated/);
});
