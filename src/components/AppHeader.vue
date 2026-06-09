<template>
  <header class="app-toolbar">
    <div class="brand-zone">
      <div class="brand-logo-glow">
        <svg viewBox="0 0 32 32" fill="none">
          <rect x="3" y="3" width="12" height="26" rx="2" fill="#eef2ff" stroke="#6366f1" stroke-width="1.5"/>
          <rect x="17" y="3" width="12" height="26" rx="2" fill="#f0fdf4" stroke="#10b981" stroke-width="1.5"/>
          <path d="M6 9h6M6 13h6M6 17h5" stroke="#a5b4fc" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M20 9h6M20 13h6M20 17h5" stroke="#86efac" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M14 16h4" stroke="#6366f1" stroke-width="2" stroke-linecap="round"/>
          <path d="M16 14v4" stroke="#6366f1" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="brand-text">
        <h1>DocDiff <span class="badge-pro">Pro</span></h1>
      </div>
    </div>

    <div class="control-core">
      <div class="granularity-panel">
        <label class="panel-label" for="diff-granularity">比对粒度</label>
        <div class="premium-select-wrapper">
          <select id="diff-granularity" :value="diffGranularity" class="classic-select" @change="emitGranularity">
            <option value="semantic">语义级 - 适合快速审阅</option>
            <option value="word">词组级 - 适合内容核对</option>
            <option value="char">字符级 - 适合精细校对</option>
          </select>
        </div>
      </div>

      <div class="panel-divider"></div>

      <div class="compare-settings" aria-label="比对设置">
        <button
          type="button"
          class="capsule-node"
          :class="{ active: ignoreSpaces }"
          title="忽略普通空格、全角空格、制表符等版式差异"
          :aria-pressed="ignoreSpaces"
          @click="toggleIgnoreSpaces"
        >
          <div class="node-pulse"></div>
          <span>忽略空白</span>
        </button>
        <button
          type="button"
          class="capsule-node"
          :class="{ active: ignoreFullHalfWidth }"
          title="统一全角与半角字母、数字和常见符号后再比对"
          :aria-pressed="ignoreFullHalfWidth"
          @click="$emit('update:ignoreFullHalfWidth', !ignoreFullHalfWidth)"
        >
          <div class="node-pulse"></div>
          <span>统一全半角</span>
        </button>
        <button
          type="button"
          class="capsule-node"
          :class="{ active: ignoreCase }"
          title="忽略英文字母大小写差异"
          :aria-pressed="ignoreCase"
          @click="$emit('update:ignoreCase', !ignoreCase)"
        >
          <div class="node-pulse"></div>
          <span>忽略大小写</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { DiffGranularity } from '@/types/diff';

const props = defineProps<{
  diffGranularity: DiffGranularity;
  ignoreSpaces: boolean;
  ignoreFullHalfWidth: boolean;
  ignoreCase: boolean;
}>();

const emit = defineEmits<{
  'update:diffGranularity': [value: DiffGranularity];
  'update:ignoreSpaces': [value: boolean];
  'update:ignoreFullHalfWidth': [value: boolean];
  'update:ignoreCase': [value: boolean];
}>();

function emitGranularity(event: Event): void {
  emit('update:diffGranularity', (event.target as HTMLSelectElement).value as DiffGranularity);
}

function toggleIgnoreSpaces(): void {
  emit('update:ignoreSpaces', !props.ignoreSpaces);
}
</script>

<style scoped>
.app-toolbar {
  background: var(--bg-panel);
  border-radius: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.02),
    0 4px 16px rgba(15, 23, 42, 0.04);
  backdrop-filter: blur(12px);
  position: relative;
  z-index: 10;
}

.brand-zone {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.brand-logo-glow {
  width: 36px;
  height: 36px;
  background: transparent;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.brand-logo-glow svg {
  width: 32px;
  height: 32px;
  filter: drop-shadow(0 2px 4px rgba(99, 102, 241, 0.2));
  transition: transform 0.3s ease;
}

.brand-logo-glow:hover svg {
  transform: scale(1.05);
}

.brand-text h1 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-primary);
}

.badge-pro {
  font-size: 0.55rem;
  background: var(--gradient-accent);
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 800;
  letter-spacing: 0;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.25);
}

.control-core {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1 1 auto;
  justify-content: flex-end;
}

.granularity-panel {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  flex: 0 1 auto;
}

.panel-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.premium-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
}

.premium-select-wrapper::after {
  content: '';
  position: absolute;
  right: 12px;
  pointer-events: none;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid var(--text-secondary);
  transition: all 0.2s;
}

.premium-select-wrapper:hover::after {
  border-top-color: var(--accent);
}

.classic-select {
  appearance: none;
  -webkit-appearance: none;
  background: rgba(248, 250, 252, 0.8);
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  padding: 5px 26px 5px 10px;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-secondary);
  outline: none;
  cursor: pointer;
  transition: all 0.25s ease;
  min-width: 140px;
  max-width: 240px;
}

.classic-select:hover {
  border-color: var(--accent);
  background: #ffffff;
}

.classic-select:focus {
  border-color: var(--accent);
  background: #ffffff;
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.compare-settings {
  display: flex;
  min-width: 0;
  background: rgba(241, 245, 249, 0.8);
  padding: 3px;
  border-radius: 7px;
  gap: 2px;
  border: 1px solid var(--border-subtle);
}

.capsule-node {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: 0;
  cursor: pointer;
  user-select: none;
  padding: 4px 10px;
  border-radius: 5px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.capsule-node:hover:not(.active) {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.6);
}

.capsule-node.active {
  background: #ffffff;
  color: var(--accent);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(99, 102, 241, 0.1);
}

.node-pulse {
  width: 5px;
  height: 5px;
  background: var(--text-tertiary);
  border-radius: 50%;
  transition: all 0.2s ease;
}

.capsule-node.active .node-pulse {
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent-glow);
}

.panel-divider {
  height: 14px;
  width: 1px;
  background: linear-gradient(180deg, transparent, var(--border-strong), transparent);
  margin: 0 6px;
}

@media (max-width: 1200px) {
  .app-toolbar {
    padding: 6px 10px;
    gap: 8px;
    flex-wrap: wrap;
  }

  .brand-logo-glow {
    width: 32px;
    height: 32px;
  }

  .brand-logo-glow svg {
    width: 28px;
    height: 28px;
  }

  .brand-text h1 {
    font-size: 0.88rem;
  }

  .control-core {
    justify-content: space-between;
    flex: 1 1 520px;
    width: auto;
    gap: 6px;
  }

  .granularity-panel {
    gap: 5px;
  }

  .panel-label {
    font-size: 0.65rem;
  }

  .classic-select {
    min-width: 118px;
    max-width: 180px;
    font-size: 0.65rem;
    padding: 4px 22px 4px 8px;
  }

  .capsule-node {
    padding: 3px 8px;
    font-size: 0.65rem;
    gap: 4px;
  }
}

@media (max-width: 820px) {
  .app-toolbar {
    padding: 6px 8px;
    gap: 6px;
  }

  .brand-logo-glow {
    width: 28px;
    height: 28px;
  }

  .brand-logo-glow svg {
    width: 24px;
    height: 24px;
  }

  .brand-text h1 {
    font-size: 0.8rem;
  }

  .badge-pro {
    font-size: 0.5rem;
    padding: 1px 5px;
  }

  .control-core {
    flex: 1 1 100%;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .panel-divider {
    display: none;
  }

  .granularity-panel {
    justify-content: space-between;
    flex: 1 1 220px;
  }

  .compare-settings {
    flex: 1 1 100%;
    flex-wrap: wrap;
    justify-content: stretch;
  }

  .capsule-node {
    flex: 1 1 0;
    justify-content: center;
  }

  .classic-select {
    width: 100%;
    min-width: 100px;
    max-width: none;
  }
}

@media (max-width: 520px) {
  .brand-zone {
    gap: 8px;
  }

  .control-core {
    align-items: stretch;
  }

  .granularity-panel {
    flex: 1 1 100%;
  }

  .compare-settings {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .capsule-node {
    padding: 4px 6px;
    font-size: 0.62rem;
    min-width: 0;
  }

  .node-pulse {
    display: none;
  }
}
</style>
