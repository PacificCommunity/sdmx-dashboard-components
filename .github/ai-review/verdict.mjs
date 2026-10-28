import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const SUMMARY_LIMIT = 60000;

const NO_REVIEW = 'The reviewer did not produce `.ai-review/review.md`. See the job log.';

const truncate = (text) => {
  if (text.length <= SUMMARY_LIMIT) return text;
  const suffix = '\n\n…(truncated)';
  return text.slice(0, SUMMARY_LIMIT - suffix.length) + suffix;
};

const parseVerdict = (markdown) => {
  const heading = /^#{2,3}[ \t]*Verdict[ \t]*$/im.exec(markdown);
  if (!heading) return '';
  const rest = markdown.slice(heading.index + heading[0].length).split(/\r?\n/);
  for (const line of rest) {
    const value = line.trim();
    if (!value) continue;
    if (value.startsWith('#')) return '';
    return value.toLowerCase();
  }
  return '';
};

export const summarizeReview = (markdown) => {
  const text = typeof markdown === 'string' ? markdown : '';

  if (!text.trim()) {
    return {
      status: 'completed',
      conclusion: 'failure',
      output: { title: 'AI review: no review produced', summary: NO_REVIEW },
    };
  }

  const blockers = (text.match(/\*\*\[P[01]\]/g) ?? []).length;
  const verdict = parseVerdict(text);

  let conclusion = 'neutral';
  let title = 'AI review: comments only';

  if (blockers > 0) {
    conclusion = 'failure';
    title = 'AI review: blocking findings';
  } else if (verdict.startsWith('approve')) {
    conclusion = 'success';
    title = 'AI review: approved';
  }

  return {
    status: 'completed',
    conclusion,
    output: { title, summary: truncate(text) },
  };
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const input = process.argv[2] ?? '.ai-review/review.md';
  const output = process.argv[3];

  let markdown = '';
  try {
    markdown = readFileSync(input, 'utf8');
  } catch {
    markdown = '';
  }

  const payload = summarizeReview(markdown);

  if (output) {
    writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }

  console.log(`conclusion=${payload.conclusion}`);
  console.log(`title=${payload.output.title}`);
}
