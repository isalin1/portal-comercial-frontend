<script setup lang="ts">
defineProps<{
  label?: string | null
  tone?: 'gold' | 'green' | 'blue' | 'gray' | null
}>()
</script>

<template>
  <span v-if="label" class="affiliation" :data-tone="tone || 'gray'">{{ label }}</span>
</template>

<style scoped>
.affiliation {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 4px 12px;
  border-radius: var(--radius-control);
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1.2;
  color: #fff;
  border: 0;
}

.affiliation[data-tone='gold'] {
  background: linear-gradient(135deg, #e0b84f, #b8860b);
  color: #1a1305;
}

.affiliation[data-tone='green'] {
  background: #008352;
}

.affiliation[data-tone='blue'] {
  background: #1d4ed8;
}

.affiliation[data-tone='gray'] {
  background: #64748b;
}
</style>
