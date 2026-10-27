import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const EVENTS = {
  comment: { path: '/comment', event: 'COMMENT' },
  approve: { path: '/review', event: 'APPROVE' },
};

export async function postReview({ url, event, body, fetchImpl = fetch }) {
  const target = EVENTS[event];
  if (!target) throw new Error('event must be comment or approve');

  const response = await fetchImpl(`${url}${target.path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ body, event: target.event }),
  });

  const text = typeof response.text === 'function' ? await response.text() : '';
  return { status: response.status, text };
}

const parseArgs = (argv) => {
  const args = { event: undefined, bodyFile: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--event') args.event = argv[++i];
    else if (argv[i] === '--body-file') args.bodyFile = argv[++i];
  }
  return args;
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const { event, bodyFile } = parseArgs(process.argv.slice(2));
  const url = process.env.AI_REVIEW_BROKER_URL;

  if (!url) {
    console.error('AI_REVIEW_BROKER_URL is required');
    process.exit(1);
  }
  if (!event || !bodyFile) {
    console.error('usage: post-review.mjs --event comment|approve --body-file <path>');
    process.exit(1);
  }

  let body;
  try {
    body = readFileSync(bodyFile, 'utf8');
  } catch (error) {
    console.error(`cannot read ${bodyFile}: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  postReview({ url, event, body })
    .then(({ status, text }) => {
      if (status >= 200 && status < 300) {
        console.log(`posted ${status}`);
        return;
      }
      console.error(`error ${status}: ${text}`);
      process.exitCode = 1;
    })
    .catch((error) => {
      console.error(`error: ${error instanceof Error ? error.message : error}`);
      process.exitCode = 1;
    });
}
