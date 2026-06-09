import DiffMatchPatch from 'diff-match-patch';
import type { DiffGranularity, DiffSummary, DiffTuple } from '@/types/diff';
import { applyDiffMarkup } from './diffMarkup';
import { buildTextMapping, collapseWhitespace, normalizeText, type TextMapping } from './documentText';

export type CompareOptions = {
  granularity: DiffGranularity;
  ignoreSpaces: boolean;
  ignoreFullHalfWidth: boolean;
  ignoreCase: boolean;
};

export type CompareResult = {
  originalHtml: string;
  revisedHtml: string;
  summary: DiffSummary;
};

const diffMatchPatch = new DiffMatchPatch();
diffMatchPatch.Diff_Timeout = 0;

export function compareDocuments(
  originalHtml: string,
  revisedHtml: string,
  options: CompareOptions
): CompareResult {
  const parser = new DOMParser();
  const originalDom = parser.parseFromString(originalHtml, 'text/html').body;
  const revisedDom = parser.parseFromString(revisedHtml, 'text/html').body;
  const originalTrack = prepareDocumentText(originalDom, options);
  const revisedTrack = prepareDocumentText(revisedDom, options);
  const diffs = diffMatchPatch.diff_main(originalTrack.text, revisedTrack.text) as DiffTuple[];

  cleanupDiffs(diffs, options.granularity);
  const summary = assignDiffGroups(diffs, getGapThreshold(options.granularity));

  return {
    originalHtml: applyDiffMarkup(originalDom, originalTrack.mapping, diffs, -1, 'del'),
    revisedHtml: applyDiffMarkup(revisedDom, revisedTrack.mapping, diffs, 1, 'ins'),
    summary
  };
}

function prepareDocumentText(root: HTMLElement, options: CompareOptions): TextMapping {
  const textMapping = buildTextMapping(root);
  const track = options.ignoreSpaces ? collapseWhitespace(textMapping) : textMapping;

  return {
    text: normalizeText(track.text, options.ignoreFullHalfWidth, options.ignoreCase),
    mapping: track.mapping
  };
}

function cleanupDiffs(diffs: DiffTuple[], granularity: DiffGranularity): void {
  if (granularity === 'semantic') {
    diffMatchPatch.diff_cleanupSemantic(diffs);
  }
  diffMatchPatch.diff_cleanupEfficiency(diffs);
}

function assignDiffGroups(diffs: DiffTuple[], gapThreshold: number): DiffSummary {
  let groupCount = 0;
  let inGroup = false;
  const groupOperations = new Map<string, Set<number>>();

  for (let index = 0; index < diffs.length; index++) {
    const [operation, text] = diffs[index];

    if (operation !== 0) {
      if (!inGroup) {
        groupCount++;
        inGroup = true;
      }
      const groupId = `diff-${groupCount}`;
      diffs[index].groupId = groupId;
      groupOperations.set(groupId, (groupOperations.get(groupId) ?? new Set()).add(operation));
      continue;
    }

    const nextDiff = diffs[index + 1];
    const bridgesChanges = text.length <= gapThreshold && nextDiff?.[0] !== 0;
    if (!bridgesChanges) inGroup = false;
  }

  return buildDiffSummary(groupOperations);
}

function buildDiffSummary(groupOperations: Map<string, Set<number>>): DiffSummary {
  const summary: DiffSummary = {
    total: groupOperations.size,
    inserted: 0,
    deleted: 0,
    modified: 0
  };

  for (const operations of groupOperations.values()) {
    const hasDeletion = operations.has(-1);
    const hasInsertion = operations.has(1);

    if (hasDeletion && hasInsertion) {
      summary.modified++;
    } else if (hasInsertion) {
      summary.inserted++;
    } else if (hasDeletion) {
      summary.deleted++;
    }
  }

  return summary;
}

function getGapThreshold(granularity: DiffGranularity): number {
  if (granularity === 'word') return 6;
  if (granularity === 'char') return 0;
  return 2;
}
