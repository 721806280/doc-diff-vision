<template>
  <Transition name="compare-toast">
    <div v-if="message" class="compare-toast">
      <div class="compare-toast-dot" :class="{ done: !comparing }"></div>
      <span>{{ message }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  message: string;
  comparing: boolean;
}>();
</script>

<style scoped>
.compare-toast {
  position: absolute;
  top: 80px;
  left: 50%;
  z-index: 30;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.95);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  box-shadow:
    0 4px 16px rgba(15, 23, 42, 0.08),
    0 8px 24px rgba(15, 23, 42, 0.04);
  transform: translateX(-50%);
  backdrop-filter: blur(12px);
}

.compare-toast-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  animation: micro-flash 1.1s infinite;
  box-shadow: 0 0 8px var(--accent-glow);
}

.compare-toast-dot.done {
  background: var(--ins-focus);
  animation: none;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

.compare-toast-enter-active,
.compare-toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.compare-toast-enter-from,
.compare-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}

@keyframes micro-flash {
  0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(99, 102, 241, 0); }
  100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
}
</style>
