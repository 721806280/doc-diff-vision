import type { DiffTuple } from '@/types/diff';
import type { TextMappingEntry } from './documentText';

type DiffOperation = -1 | 1;
type WrapperTag = 'del' | 'ins';
type DiffRange = { start: number; length: number; groupId: string };
type NodeOffsetMap = Map<Text, Map<number, string>>;

export function applyDiffMarkup(
  domElement: HTMLElement,
  mapping: TextMappingEntry[],
  diffs: DiffTuple[],
  targetOperation: DiffOperation,
  wrapperTag: WrapperTag
): string {
  const ranges = collectDiffRanges(diffs, targetOperation);
  const nodesToWrap = mapRangesToTextNodes(mapping, ranges);
  const ownerDocument = domElement.ownerDocument;

  for (const [node, offsetMap] of nodesToWrap) {
    replaceTextNodeWithMarkup(ownerDocument, node, offsetMap, wrapperTag);
  }

  return domElement.innerHTML;
}

function collectDiffRanges(diffs: DiffTuple[], targetOperation: DiffOperation): DiffRange[] {
  let currentIndex = 0;
  const ranges: DiffRange[] = [];

  for (const diff of diffs) {
    const operation = diff[0];
    const length = diff[1].length;
    if (operation === targetOperation) {
      ranges.push({ start: currentIndex, length, groupId: diff.groupId ?? '' });
      currentIndex += length;
    } else if (operation === 0) {
      currentIndex += length;
    }
  }

  return ranges;
}

function mapRangesToTextNodes(mapping: TextMappingEntry[], ranges: DiffRange[]): NodeOffsetMap {
  const nodesToWrap: NodeOffsetMap = new Map();

  for (const range of ranges) {
    for (let index = 0; index < range.length; index++) {
      const mapped = mapping[range.start + index];
      if (!mapped?.node) continue;

      let offsetMap = nodesToWrap.get(mapped.node);
      if (!offsetMap) {
        offsetMap = new Map<number, string>();
        nodesToWrap.set(mapped.node, offsetMap);
      }
      offsetMap.set(mapped.offset, range.groupId);
    }
  }

  return nodesToWrap;
}

function replaceTextNodeWithMarkup(
  ownerDocument: Document,
  node: Text,
  offsetMap: Map<number, string>,
  wrapperTag: WrapperTag
): void {
  const nodeText = node.nodeValue;
  if (!nodeText) return;

  const fragment = ownerDocument.createDocumentFragment();
  let currentGroupId = offsetMap.get(0);
  let isMarked = offsetMap.has(0);
  let runStart = 0;

  for (let index = 1; index < nodeText.length; index++) {
    const groupId = offsetMap.get(index);
    const marked = offsetMap.has(index);

    if (marked === isMarked && groupId === currentGroupId) {
      continue;
    }

    appendWrappedText(ownerDocument, fragment, wrapperTag, nodeText.slice(runStart, index), isMarked, currentGroupId);
    isMarked = marked;
    currentGroupId = groupId;
    runStart = index;
  }

  appendWrappedText(ownerDocument, fragment, wrapperTag, nodeText.slice(runStart), isMarked, currentGroupId);
  node.parentNode?.replaceChild(fragment, node);
}

function appendWrappedText(
  ownerDocument: Document,
  fragment: DocumentFragment,
  wrapperTag: WrapperTag,
  text: string,
  isMarked: boolean,
  groupId?: string
): void {
  if (!isMarked) {
    fragment.appendChild(ownerDocument.createTextNode(text));
    return;
  }

  const element = ownerDocument.createElement(wrapperTag);
  element.dataset.diffId = groupId ?? '';
  element.textContent = text;
  fragment.appendChild(element);
}
