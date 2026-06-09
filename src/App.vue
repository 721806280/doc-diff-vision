<template>
  <div class="app-container">
    <AppHeader
      v-model:diff-granularity="diffGranularity"
      v-model:ignore-spaces="ignoreSpaces"
      v-model:ignore-full-half-width="ignoreFullHalfWidth"
      v-model:ignore-case="ignoreCase"
    />

    <CompareToast :message="compareNotice" :comparing="comparing" />

    <div v-if="compareError" class="app-error-banner" role="alert">
      <span>{{ compareError }}</span>
      <button type="button" @click="retryCompare">重新比对</button>
    </div>

    <DiffNavigator
      v-if="hasResult"
      :summary="diffSummary"
      :current-diff-index="currentDiffIndex"
      :sync-scroll="syncScroll"
      @previous="prevDiff"
      @next="nextDiff"
      @toggle-sync="toggleSyncLock"
    />

    <div class="workspace-container">
      <DocumentPane
        ref="paneA"
        side-class="side-original"
        title="基准文档 (A)"
        :file-name="documents.A.name"
        :file-size="documents.A.size"
        empty-label="未上传基准文档"
        reupload-title="重新选择基准文档"
        upload-title="上传基准文档 (A)"
        upload-hint="选择用于对照的原始 .docx 文件"
        waiting-text="基准文档已就绪，请上传右侧修订文档后开始比对"
        :status="documents.A.status"
        :error-message="documents.A.error"
        :has-result="hasResult"
        :comparing="comparing"
        :highlighted-html="documents.A.highlightedHtml"
        @file-select="handleFile('A', $event)"
        @pane-scroll="onScrollA"
        @diff-click="handleDiffClick"
        @activate="setActiveDriver('A')"
      />

      <DocumentPane
        ref="paneB"
        side-class="side-revision"
        title="修订文档 (B)"
        :file-name="documents.B.name"
        :file-size="documents.B.size"
        empty-label="未上传修订文档"
        reupload-title="重新选择修订文档"
        upload-title="上传修订文档 (B)"
        upload-hint="选择需要核对的新版 .docx 文件"
        waiting-text="修订文档已就绪，请上传左侧基准文档后开始比对"
        :status="documents.B.status"
        :error-message="documents.B.error"
        :has-result="hasResult"
        :comparing="comparing"
        :highlighted-html="documents.B.highlightedHtml"
        @file-select="handleFile('B', $event)"
        @pane-scroll="onScrollB"
        @diff-click="handleDiffClick"
        @activate="setActiveDriver('B')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import AppHeader from './components/AppHeader.vue';
import CompareToast from './components/CompareToast.vue';
import DiffNavigator from './components/DiffNavigator.vue';
import DocumentPane from './components/DocumentPane.vue';
import type { DiffGranularity, DiffSummary } from './types/diff';
import { compareDocuments } from './utils/diffEngine';
import { parseDocx } from './utils/docxParser';

type PaneKey = 'A' | 'B';

type DocumentPaneExpose = {
  viewport: HTMLElement | null;
};

type AlignmentAnchor = {
  topA: number;
  topB: number;
};

type DocumentStatus = 'idle' | 'parsing' | 'ready' | 'error';

type DocumentState = {
  name: string;
  size: number;
  originalHtml: string;
  highlightedHtml: string;
  status: DocumentStatus;
  error: string;
};

const EMPTY_DIFF_SUMMARY: DiffSummary = {
  total: 0,
  inserted: 0,
  deleted: 0,
  modified: 0
};
const MAX_DOCX_SIZE = 25 * 1024 * 1024;

const documents = reactive<Record<PaneKey, DocumentState>>({
  A: { name: '', size: 0, originalHtml: '', highlightedHtml: '', status: 'idle', error: '' },
  B: { name: '', size: 0, originalHtml: '', highlightedHtml: '', status: 'idle', error: '' }
});
const comparing = ref(false);
const compareNotice = ref('');
const compareError = ref('');
const hasResult = ref(false);
const diffSummary = ref<DiffSummary>({ ...EMPTY_DIFF_SUMMARY });
const currentDiffIndex = ref(0);
const syncScroll = ref(true);

const ignoreSpaces = ref(true);
const ignoreFullHalfWidth = ref(true);
const ignoreCase = ref(false);
const diffGranularity = ref<DiffGranularity>('semantic');

const paneA = ref<DocumentPaneExpose | null>(null);
const paneB = ref<DocumentPaneExpose | null>(null);

let activeDriver: PaneKey | null = null;
let alignmentAnchors: AlignmentAnchor[] = [];
let compareNoticeTimer: number | null = null;
let compareRunId = 0;
const fileLoadIds: Record<PaneKey, number> = { A: 0, B: 0 };

const ready = computed(() => documents.A.status === 'ready' && documents.B.status === 'ready');
const totalDiffs = computed(() => diffSummary.value.total);

async function handleFile(key: PaneKey, file: File): Promise<void> {
  const validationError = validateDocxFile(file);
  if (validationError) {
    clearCompareResult();
    setDocumentError(key, file, validationError);
    return;
  }

  const documentState = documents[key];
  const loadId = ++fileLoadIds[key];

  documentState.name = file.name;
  documentState.size = file.size;
  documentState.status = 'parsing';
  documentState.error = '';
  documentState.originalHtml = '';
  documentState.highlightedHtml = '';
  clearCompareResult();

  try {
    const html = await parseDocx(file);
    // Ignore stale parse results when the user replaces a file before parsing finishes.
    if (loadId !== fileLoadIds[key]) return;

    documentState.originalHtml = html;
    documentState.status = 'ready';

    if (ready.value) void compare();
  } catch (error) {
    if (loadId !== fileLoadIds[key]) return;

    documentState.status = 'error';
    const message = error instanceof Error ? error.message : String(error);
    documentState.error = `无法解析该 DOCX 文件。${message}`;
    showCompareNotice('文档解析失败，请检查文件后重试');
  }
}

function validateDocxFile(file: File): string {
  if (!file.name.toLowerCase().endsWith('.docx')) {
    return '仅支持上传 .docx 文件，请重新选择文档。';
  }

  if (file.size > MAX_DOCX_SIZE) {
    return '文件超过 25 MB。建议压缩图片或拆分文档后再上传。';
  }

  if (file.size === 0) {
    return '文件内容为空，请重新选择有效文档。';
  }

  return '';
}

function setDocumentError(key: PaneKey, file: File, message: string): void {
  fileLoadIds[key]++;
  const documentState = documents[key];

  documentState.name = file.name;
  documentState.size = file.size;
  documentState.status = 'error';
  documentState.error = message;
  documentState.originalHtml = '';
  documentState.highlightedHtml = '';
  showCompareNotice(message);
}

watch([diffGranularity, ignoreSpaces, ignoreFullHalfWidth, ignoreCase], () => {
  if (!ready.value) return;

  showCompareNotice('设置已更新，正在重新比对...');
  void compare(true);
});

function showCompareNotice(message: string): void {
  compareNotice.value = message;

  if (compareNoticeTimer !== null) window.clearTimeout(compareNoticeTimer);
  compareNoticeTimer = window.setTimeout(() => {
    compareNotice.value = '';
    compareNoticeTimer = null;
  }, 1400);
}

function clearCompareResult(): void {
  compareRunId++;
  comparing.value = false;
  compareError.value = '';
  hasResult.value = false;
  diffSummary.value = { ...EMPTY_DIFF_SUMMARY };
  currentDiffIndex.value = 0;
  alignmentAnchors = [];
}

async function compare(showDoneNotice = false): Promise<void> {
  if (!ready.value) return;

  const runId = ++compareRunId;
  comparing.value = true;
  compareError.value = '';

  try {
    await nextTick();
    if (runId !== compareRunId || !ready.value) return;

    const result = compareDocuments(documents.A.originalHtml, documents.B.originalHtml, {
      granularity: diffGranularity.value,
      ignoreSpaces: ignoreSpaces.value,
      ignoreFullHalfWidth: ignoreFullHalfWidth.value,
      ignoreCase: ignoreCase.value
    });

    if (runId !== compareRunId) return;

    diffSummary.value = result.summary;
    currentDiffIndex.value = result.summary.total > 0 ? 1 : 0;
    documents.A.highlightedHtml = result.originalHtml;
    documents.B.highlightedHtml = result.revisedHtml;
    hasResult.value = true;

    await nextTick();
    if (runId !== compareRunId) return;

    buildViewportLockMatrix();
    if (totalDiffs.value > 0) focusOnDiff(1, 'auto');
  } catch (error) {
    if (runId !== compareRunId) return;

    const message = error instanceof Error ? error.message : String(error);
    compareError.value = `文档比对失败：${message}`;
    showCompareNotice('文档比对失败，请调整文件或设置后重试');
    console.error(error);
  } finally {
    if (runId === compareRunId) {
      comparing.value = false;
      if (showDoneNotice) showCompareNotice('已根据最新设置刷新比对结果');
    }
  }
}

function retryCompare(): void {
  if (!ready.value) return;

  void compare(true);
}

function prevDiff(): void {
  if (currentDiffIndex.value <= 1) return;

  currentDiffIndex.value--;
  focusOnDiff(currentDiffIndex.value);
}

function nextDiff(): void {
  if (currentDiffIndex.value >= totalDiffs.value) return;

  currentDiffIndex.value++;
  focusOnDiff(currentDiffIndex.value);
}

function focusOnDiff(index: number, behavior: ScrollBehavior = 'smooth'): void {
  document.querySelectorAll('.focus-diff').forEach((element) => element.classList.remove('focus-diff'));

  const diffId = `diff-${index}`;
  const targets = document.querySelectorAll(`[data-diff-id="${diffId}"]`);
  if (targets.length === 0) return;

  targets.forEach((element) => element.classList.add('focus-diff'));
  const containerA = getPaneViewport('A');
  const containerB = getPaneViewport('B');
  const targetA = containerA?.querySelector(`[data-diff-id="${diffId}"]`);
  const targetB = containerB?.querySelector(`[data-diff-id="${diffId}"]`);

  activeDriver = null;

  const alignedTopA = containerA && targetA ? smoothViewportAlign(containerA, targetA, behavior) : null;
  const alignedTopB = containerB && targetB ? smoothViewportAlign(containerB, targetB, behavior) : null;

  if (targetA && targetB) return;

  if (syncScroll.value && alignedTopA !== null) {
    executeViewportSync('A', alignedTopA);
  } else if (syncScroll.value && alignedTopB !== null) {
    executeViewportSync('B', alignedTopB);
  }
}

function smoothViewportAlign(container: HTMLElement, element: Element, behavior: ScrollBehavior): number {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const relativeTop = elementRect.top - containerRect.top + container.scrollTop;
  const targetScrollTop = relativeTop - (container.clientHeight * 0.28) + (elementRect.height / 2);

  container.scrollTo({ top: targetScrollTop, behavior });
  return targetScrollTop;
}

function handleDiffClick(event: MouseEvent): void {
  if (!(event.target instanceof Element)) return;

  const diffElement = event.target.closest<HTMLElement>('ins[data-diff-id], del[data-diff-id]');
  const diffId = diffElement?.dataset.diffId;
  if (!diffId) return;

  const index = Number.parseInt(diffId.replace('diff-', ''), 10);
  if (Number.isNaN(index)) return;

  currentDiffIndex.value = index;
  focusOnDiff(index);
}

function buildViewportLockMatrix(): void {
  alignmentAnchors = [];
  if (!hasResult.value || totalDiffs.value === 0) return;

  const containerA = getPaneViewport('A');
  const containerB = getPaneViewport('B');
  if (!containerA || !containerB) return;

  for (let index = 1; index <= totalDiffs.value; index++) {
    const id = `diff-${index}`;
    const elementA = containerA.querySelector<HTMLElement>(`[data-diff-id="${id}"]`);
    const elementB = containerB.querySelector<HTMLElement>(`[data-diff-id="${id}"]`);

    if (elementA && elementB) {
      alignmentAnchors.push({ topA: elementA.offsetTop, topB: elementB.offsetTop });
    }
  }
}

function toggleSyncLock(): void {
  syncScroll.value = !syncScroll.value;
  if (!syncScroll.value) return;

  buildViewportLockMatrix();
  executeViewportSync('A');
}

function onScrollA(): void {
  if (syncScroll.value && activeDriver === 'A') executeViewportSync('A');
}

function onScrollB(): void {
  if (syncScroll.value && activeDriver === 'B') executeViewportSync('B');
}

function setActiveDriver(key: PaneKey): void {
  activeDriver = key;
}

function executeViewportSync(sourceKey: PaneKey, sourceTop?: number): void {
  if (!syncScroll.value || !hasResult.value) return;

  const sourceContainer = getPaneViewport(sourceKey);
  const targetContainer = getPaneViewport(sourceKey === 'A' ? 'B' : 'A');
  if (!sourceContainer || !targetContainer) return;

  const maxSourceScroll = getMaxScrollTop(sourceContainer);
  const maxTargetScroll = getMaxScrollTop(targetContainer);
  const currentSourceTop = clampScrollTop(sourceTop ?? sourceContainer.scrollTop, maxSourceScroll);

  if (currentSourceTop <= 4) {
    targetContainer.scrollTop = 0;
    return;
  }

  if (currentSourceTop >= maxSourceScroll - 4) {
    targetContainer.scrollTop = maxTargetScroll;
    return;
  }

  if (alignmentAnchors.length === 0) {
    targetContainer.scrollTop = maxSourceScroll > 0
      ? Math.round((currentSourceTop / maxSourceScroll) * maxTargetScroll)
      : 0;
    return;
  }

  syncByAnchors(sourceKey, currentSourceTop, maxSourceScroll, maxTargetScroll, targetContainer);
}

function syncByAnchors(
  sourceKey: PaneKey,
  currentSourceTop: number,
  maxSourceScroll: number,
  maxTargetScroll: number,
  targetContainer: HTMLElement
): void {
  const sourceTopKey = sourceKey === 'A' ? 'topA' : 'topB';
  const targetTopKey = sourceKey === 'A' ? 'topB' : 'topA';
  const nextIndex = alignmentAnchors.findIndex((anchor) => anchor[sourceTopKey] >= currentSourceTop);

  if (nextIndex === 0) {
    const first = alignmentAnchors[0];
    targetContainer.scrollTop = interpolateScrollTop(currentSourceTop, 0, first[sourceTopKey], 0, first[targetTopKey]);
    return;
  }

  if (nextIndex === -1) {
    const last = alignmentAnchors[alignmentAnchors.length - 1];
    targetContainer.scrollTop = interpolateScrollTop(
      currentSourceTop,
      last[sourceTopKey],
      maxSourceScroll,
      last[targetTopKey],
      maxTargetScroll
    );
    return;
  }

  const previous = alignmentAnchors[nextIndex - 1];
  const next = alignmentAnchors[nextIndex];
  targetContainer.scrollTop = interpolateScrollTop(
    currentSourceTop,
    previous[sourceTopKey],
    next[sourceTopKey],
    previous[targetTopKey],
    next[targetTopKey]
  );
}

function getPaneViewport(key: PaneKey): HTMLElement | null {
  return key === 'A' ? paneA.value?.viewport ?? null : paneB.value?.viewport ?? null;
}

function getMaxScrollTop(container: HTMLElement): number {
  return Math.max(0, container.scrollHeight - container.clientHeight);
}

function clampScrollTop(value: number, maxScrollTop: number): number {
  return Math.min(Math.max(value, 0), maxScrollTop);
}

function interpolateScrollTop(
  sourceTop: number,
  sourceStart: number,
  sourceEnd: number,
  targetStart: number,
  targetEnd: number
): number {
  const sourceDistance = sourceEnd - sourceStart;
  if (sourceDistance <= 0) return targetStart;

  const ratio = (sourceTop - sourceStart) / sourceDistance;
  return targetStart + (ratio * (targetEnd - targetStart));
}

function handleResize(): void {
  if (hasResult.value) buildViewportLockMatrix();
}

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (compareNoticeTimer !== null) window.clearTimeout(compareNoticeTimer);
});
</script>

<style scoped>
.app-container {
  --bg-app: transparent;
  --bg-panel: rgba(255, 255, 255, 0.95);
  --border-subtle: rgba(226, 232, 240, 0.8);
  --border-strong: #cbd5e1;
  --text-primary: #1e293b;
  --text-secondary: #475569;
  --text-tertiary: #94a3b8;

  --ins-text: #059669;
  --ins-border: rgba(16, 185, 129, 0.3);
  --ins-focus: #10b981;

  --del-text: #e11d48;
  --del-border: rgba(244, 63, 94, 0.3);
  --del-focus: #f43f5e;

  --accent: #6366f1;
  --accent-glow: rgba(99, 102, 241, 0.15);

  --gradient-accent: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  --gradient-ins: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(52, 211, 153, 0.08) 100%);
  --gradient-del: linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(251, 113, 133, 0.08) 100%);

  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  width: 100%;
  height: 100vh;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px;
  box-sizing: border-box;
  background: var(--bg-app);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}

.workspace-container {
  display: flex;
  gap: 2px;
  flex: 1;
  min-height: 0;
  position: relative;
  z-index: 1;
}

.app-error-banner {
  background: rgba(255, 241, 242, 0.96);
  border: 1px solid var(--del-border);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.78rem;
  font-weight: 600;
  flex-shrink: 0;
}

.app-error-banner button {
  border: 1px solid var(--del-border);
  background: #ffffff;
  color: var(--del-text);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.app-error-banner button:hover {
  border-color: var(--del-focus);
  box-shadow: 0 2px 8px rgba(244, 63, 94, 0.12);
}

@media (max-width: 1200px) {
  .app-container {
    gap: 4px;
    padding: 4px;
  }

  .workspace-container {
    gap: 6px;
  }
}

@media (max-width: 820px) {
  .app-container {
    gap: 4px;
    padding: 4px;
  }

  .workspace-container {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
