import { describe, expect, it } from 'vitest';
import { collectDocxMetadata, collectMammothWarnings } from './docxParser';

describe('docxParser metadata helpers', () => {
  it('counts text characters and sanitized embedded images', () => {
    const metadata = collectDocxMetadata(
      '<p>合 同 A</p><img src="data:image/png;base64,iVBORw0KGgo="><img>'
    );

    expect(metadata).toEqual({
      textLength: 3,
      imageCount: 1
    });
  });

  it('formats mammoth warnings defensively', () => {
    expect(collectMammothWarnings([
      { type: 'warning', message: 'Unrecognised paragraph style' },
      { message: 'Missing image alt text' },
      { type: 'warning' },
      'ignored'
    ])).toEqual([
      'warning: Unrecognised paragraph style',
      'Missing image alt text'
    ]);
    expect(collectMammothWarnings(null)).toEqual([]);
  });
});
