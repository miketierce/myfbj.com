<template>
  <img
    :src="normalizedSrc"
    :alt="props.alt"
    :width="props.width"
    :height="props.height"
    loading="lazy"
    class="prose-img"
    onerror="this.setAttribute('data-error', 1)"
  >
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  src: {
    type: String,
    default: ''
  },
  alt: {
    type: String,
    default: ''
  },
  width: {
    type: [String, Number],
    default: undefined
  },
  height: {
    type: [String, Number],
    default: undefined
  }
});

// Normalize the source path to ensure server and client render the same path
const normalizedSrc = computed(() => {
  if (!props.src) return '';

  // If it's an external URL, use it as is
  if (props.src.startsWith('http://') || props.src.startsWith('https://')) {
    return props.src;
  }

  // Clean the path - remove leading ./ and ensure leading /
  let cleanPath = props.src.replace(/^\.\//, '');

  // This is the critical fix - remove /public/ prefix if present
  if (cleanPath.includes('/public/')) {
    cleanPath = cleanPath.replace('/public/', '/');
  }

  // Also handle IPX paths if present
  if (cleanPath.includes('/_ipx/_/')) {
    cleanPath = cleanPath.replace('/_ipx/_/', '/');
  }

  // Ensure leading slash
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }

  return cleanPath;
});
</script>

<style>
.prose-img {
  max-width: 100%;
  height: auto;
  margin: 1.5rem 0;
  border: 1px solid rgba(var(--v-theme-primary, 0, 0, 0), 0.2);
  border-radius: 4px;
}
</style>