import { describe, expect, it } from 'vitest';
import parse from 'html-react-parser';
import { renderToStaticMarkup } from 'react-dom/server';
import { sanitizeTooltipHtml } from './sanitizeTooltipHtml';

const marker =
  '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#e16a86;margin-right:4px;"></span>';

describe('sanitizeTooltipHtml', () => {
  it('renders dataset-derived markup as text', () => {
    expect(sanitizeTooltipHtml('<img src=x onerror="alert(1)">')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
    );
  });

  it('keeps simple formatting tags', () => {
    expect(sanitizeTooltipHtml('<b>Total</b><br/>next')).toBe(
      '<b>Total</b><br/>next'
    );
  });

  it('drops attributes and styles from allowed tags', () => {
    expect(sanitizeTooltipHtml('<span onclick="alert(1)">x</span>')).toBe(
      '&lt;span onclick=&quot;alert(1)&quot;&gt;x</span>'
    );
  });

  it('keeps the trusted marker markup unchanged', () => {
    const input = `Nigeria<br/>${marker}Total: 12`;

    expect(sanitizeTooltipHtml(input, marker)).toBe(input);
  });

  it('renders a crafted dimension label as inert text after parsing', () => {
    const markup = renderToStaticMarkup(
      parse(
        sanitizeTooltipHtml(
          '<img src=x onerror="alert(1)"><b>Total</b><script>alert(2)</script>'
        )
      )
    );

    expect(markup).not.toContain('<img');
    expect(markup).not.toContain('<script');
    expect(markup).toContain('&lt;img');
    expect(markup).toContain('<b>Total</b>');
  });
});
