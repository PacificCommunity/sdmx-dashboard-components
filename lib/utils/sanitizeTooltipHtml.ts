import { escapeHtml } from './chartHelpers';

// Tooltip formatters may return an HTML string, but every dataset-derived label
// interpolated into that string is untrusted. Escape the whole string first, then
// re-enable only a small allowlist of attribute-free formatting tags, so event
// handlers, URLs, styles and scripts stay visible text instead of live markup.
const ALLOWED_TAGS = new Set([
  'br',
  'b',
  'strong',
  'i',
  'em',
  'u',
  'small',
  'span',
  'div',
  'p',
]);

const ESCAPED_TAG = /&lt;(\/?)([a-z][a-z0-9]*)\s*(\/?)&gt;/gi;

// Placeholder for markup the library generated itself (the colored marker dot).
// It cannot be confused with formatter content because that content is escaped
// before the placeholder is put back.
const TRUSTED_SENTINEL = '\u0000sdmx-trusted-markup\u0000';

/**
 * Sanitize a table tooltip formatter string.
 *
 * `trustedHtml` must be markup produced by the library (currently the colored
 * marker), never a value read from a dataset.
 */
export const sanitizeTooltipHtml = (html: string, trustedHtml?: string): string => {
  if (typeof html !== 'string') return '';
  const withSentinel = trustedHtml
    ? html.split(trustedHtml).join(TRUSTED_SENTINEL)
    : html;
  const escaped = escapeHtml(withSentinel).replace(
    ESCAPED_TAG,
    (match, closing: string, tag: string, selfClosing: string) =>
      ALLOWED_TAGS.has(tag.toLowerCase()) ? `<${closing}${tag}${selfClosing}>` : match
  );
  return trustedHtml
    ? escaped.split(TRUSTED_SENTINEL).join(trustedHtml)
    : escaped;
};
