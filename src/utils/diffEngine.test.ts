import { describe, expect, it } from 'vitest';
import { compareDocuments, type CompareOptions } from './diffEngine';

const DEFAULT_OPTIONS: CompareOptions = {
  granularity: 'char',
  ignoreSpaces: true,
  ignoreFullHalfWidth: true,
  ignoreCase: false
};

describe('compareDocuments', () => {
  it('summarizes a replacement and reports normalized similarity', async () => {
    const result = await compareDocuments('<p>abc</p>', '<p>axc</p>', DEFAULT_OPTIONS);

    expect(result.summary).toMatchObject({
      total: 1,
      inserted: 0,
      deleted: 0,
      modified: 1
    });
    expect(result.summary.similarity).toBeCloseTo(2 / 3, 5);
    expect(result.originalHtml).toContain('<del data-diff-id="diff-1">b</del>');
    expect(result.revisedHtml).toContain('<ins data-diff-id="diff-1">x</ins>');
  });

  it('uses full-width and case normalization when enabled', async () => {
    const result = await compareDocuments('<p>ＡＢＣ</p>', '<p>abc</p>', {
      ...DEFAULT_OPTIONS,
      ignoreCase: true
    });

    expect(result.summary.total).toBe(0);
    expect(result.summary.similarity).toBe(1);
  });
});
