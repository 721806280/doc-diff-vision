<template>
  <div class="floating-navigator">
    <div class="stat-banner">
      <div class="radar-dot" :class="{ clean: summary.total === 0 }"></div>
      <template v-if="summary.total === 0">
        <span class="pure-text">✅ 比对完成：当前设置下，两份文档未发现文本差异。</span>
        <span class="summary-chip similarity" title="基于当前归一化文本的编辑距离计算">
          相似度 <strong>{{ similarityPercent }}</strong>
        </span>
      </template>
      <template v-else>
        <span class="pure-text">🔎 比对完成：发现 <strong class="diff-count">{{ summary.total }}</strong> 处文本差异</span>
        <span class="summary-chip similarity" title="基于当前归一化文本的编辑距离计算">
          相似度 <strong>{{ similarityPercent }}</strong>
        </span>
        <span class="summary-chip modified">修改 {{ summary.modified }}</span>
        <span class="summary-chip inserted">新增 {{ summary.inserted }}</span>
        <span class="summary-chip deleted">删除 {{ summary.deleted }}</span>
        <div
          class="diff-progress"
          role="progressbar"
          :aria-label="`当前差异位置：${currentDiffIndex} / ${summary.total}`"
          :aria-valuemin="1"
          :aria-valuemax="summary.total"
          :aria-valuenow="currentDiffIndex"
        >
          <div class="diff-progress-meta">
            <span>差异 {{ currentDiffIndex }} <span class="slash">/</span> {{ summary.total }}</span>
            <strong>{{ progressPercent }}%</strong>
          </div>
          <div class="diff-progress-track">
            <div class="diff-progress-bar" :style="{ width: progressWidth }"></div>
          </div>
        </div>
      </template>
    </div>

    <div class="nav-triggers" v-if="summary.total > 0">
      <button class="btn-action-nav" @click="$emit('previous')" :disabled="currentDiffIndex <= 1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>上一处
      </button>
      <button class="btn-action-nav" @click="$emit('next')" :disabled="currentDiffIndex >= summary.total">
        下一处<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
      <div class="panel-divider"></div>
      <button
        type="button"
        class="ios-toggle-shell"
        :class="{ active: syncScroll }"
        title="开启后，两侧文档会按差异位置同步滚动，便于长文对照"
        :aria-pressed="syncScroll"
        @click="$emit('toggle-sync')"
      >
        <div class="ios-switch"></div>
        <span>同步滚动</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DiffSummary } from '@/types/diff';

const props = defineProps<{
  summary: DiffSummary;
  currentDiffIndex: number;
  syncScroll: boolean;
}>();

defineEmits<{
  previous: [];
  next: [];
  'toggle-sync': [];
}>();

const percentFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

const progressPercent = computed(() => {
  if (props.summary.total <= 0) return 0;
  return Math.round((props.currentDiffIndex / props.summary.total) * 100);
});

const progressWidth = computed(() => `${progressPercent.value}%`);

const similarityPercent = computed(() => percentFormatter.format(props.summary.similarity));
</script>

<style scoped>
.floating-navigator {
  background: var(--bg-panel);
  border-radius: 10px;
  padding: 8px 14px;
  border: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  box-shadow:
    0 2px 8px rgba(15, 23, 42, 0.04),
    0 8px 24px rgba(15, 23, 42, 0.03);
  backdrop-filter: blur(12px);
  position: relative;
  z-index: 5;
}

.stat-banner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
}

.radar-dot {
  width: 7px;
  height: 7px;
  background: var(--del-focus);
  border-radius: 50%;
  animation: micro-flash 2s infinite;
  box-shadow: 0 0 8px rgba(244, 63, 94, 0.4);
}

.radar-dot.clean {
  background: var(--ins-focus);
  animation: none;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

.pure-text {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-secondary);
  line-height: 1.4;
  min-width: 0;
}

.pure-text strong {
  color: var(--text-primary);
}

.diff-count {
  color: var(--del-focus);
  font-weight: 700;
  font-family: 'SF Mono', 'Monaco', monospace;
  background: var(--gradient-del);
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid var(--del-border);
}

.summary-chip {
  padding: 3px 7px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 650;
  white-space: nowrap;
  border: 1px solid var(--border-subtle);
  background: rgba(248, 250, 252, 0.9);
  line-height: 1.2;
}

.summary-chip.modified {
  color: var(--accent);
  border-color: rgba(99, 102, 241, 0.2);
  background: rgba(99, 102, 241, 0.08);
}

.summary-chip.similarity {
  color: #0f766e;
  border-color: rgba(20, 184, 166, 0.24);
  background: rgba(20, 184, 166, 0.09);
}

.summary-chip.similarity strong {
  font-family: 'SF Mono', 'Monaco', monospace;
  font-weight: 750;
}

.summary-chip.inserted {
  color: var(--ins-text);
  border-color: var(--ins-border);
  background: rgba(16, 185, 129, 0.08);
}

.summary-chip.deleted {
  color: var(--del-text);
  border-color: var(--del-border);
  background: rgba(244, 63, 94, 0.08);
}

.slash {
  color: var(--text-tertiary);
  font-weight: 400;
  margin: 0 2px;
}

.diff-progress {
  width: auto;
  min-width: 112px;
  padding: 5px 10px;
  border-radius: 6px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  display: flex;
  flex-direction: column;
  gap: 0;
}

.diff-progress-meta {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 650;
  white-space: nowrap;
}

.diff-progress-meta strong {
  color: var(--accent);
  font-family: 'SF Mono', 'Monaco', monospace;
  font-size: 0.68rem;
}

.diff-progress-track {
  height: 3px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(203, 213, 225, 0.58);
}

.diff-progress-bar {
  height: 100%;
  min-width: 6px;
  border-radius: inherit;
  background: var(--gradient-accent);
  transition: width 0.22s ease;
}

.nav-triggers {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  min-width: 0;
}

.btn-action-nav {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-action-nav:hover:not(:disabled) {
  background: linear-gradient(180deg, #ffffff 0%, #eef2ff 100%);
  color: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 2px 8px var(--accent-glow);
}

.btn-action-nav:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ios-toggle-shell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.ios-switch {
  width: 26px;
  height: 15px;
  background: linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%);
  border-radius: 99px;
  position: relative;
  transition: all 0.25s ease;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
}

.ios-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 11px;
  height: 11px;
  background: white;
  border-radius: 50%;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.ios-toggle-shell.active {
  color: var(--accent);
}

.ios-toggle-shell.active .ios-switch {
  background: var(--gradient-accent);
  box-shadow: 0 0 8px var(--accent-glow);
}

.ios-toggle-shell.active .ios-switch::after {
  left: 13px;
}

.panel-divider {
  height: 14px;
  width: 1px;
  background: linear-gradient(180deg, transparent, var(--border-strong), transparent);
  margin: 0 6px;
}

@keyframes micro-flash {
  0% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(244, 63, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
}

@media (max-width: 820px) {
  .floating-navigator {
    align-items: stretch;
    flex-direction: column;
    gap: 6px;
    padding: 6px 10px;
  }

  .stat-banner {
    justify-content: flex-start;
    text-align: left;
  }

  .nav-triggers {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .panel-divider {
    display: none;
  }
}

@media (max-width: 640px) {
  .pure-text {
    flex: 1 1 100%;
  }

  .diff-progress {
    flex: 1 1 128px;
    width: auto;
    min-width: 118px;
  }

  .diff-progress-meta {
    justify-content: flex-start;
    gap: 8px;
  }

  .nav-triggers {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: center;
  }

  .btn-action-nav {
    justify-content: center;
  }

  .ios-toggle-shell {
    grid-column: 1 / -1;
    justify-content: center;
    padding: 4px 0;
  }
}

@media (max-width: 420px) {
  .summary-chip {
    flex: 0 0 auto;
    text-align: center;
    padding: 3px 4px;
  }

  .btn-action-nav {
    padding: 5px 8px;
  }
}
</style>
