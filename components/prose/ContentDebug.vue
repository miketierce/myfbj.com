<template>
  <div class="content-debug">
    <h3>Content Debugging</h3>
    <div class="debug-box">
      <div><strong>Current Route:</strong> {{ route.path }}</div>
      <div><strong>Content Path:</strong> {{ props.path }}</div>

      <client-only>
        <div v-if="isLoading">Loading content data...</div>
        <template v-else>
          <div v-if="data"><strong>Content Found:</strong> Yes</div>
          <div v-else><strong>Content Found:</strong> No</div>
          <div v-if="error" class="error-info">
            <strong>Error:</strong> {{ error.message }}
          </div>

          <hr>

          <div v-if="data">
            <h4>Content Details:</h4>
            <pre>{{ JSON.stringify(contentMeta, null, 2) }}</pre>
          </div>
        </template>
      </client-only>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, computed, ref, onMounted } from '#imports'
import { queryCollection } from '#imports'

const route = useRoute()
const props = defineProps({
  path: {
    type: String,
    default: null
  }
})

// State management
const isLoading = ref(true)
const data = ref(null)
const error = ref(null)

// Use the path prop or fall back to the current route path
const contentPath = computed(() => props.path || route.path)

// Query content for debugging - client-side only
onMounted(async () => {
  try {
    const normalizedPath = contentPath.value.replace(/^\/+/, '')
    const result = await queryCollection('content')
      .where({ _path: normalizedPath })
      .find()
      .catch(err => {
        error.value = err
        return null
      })

    data.value = result
  } catch (err) {
    error.value = err
    console.error(`[ContentDebug] Error loading content for path ${contentPath.value}:`, err)
  } finally {
    isLoading.value = false
  }
})

// Extract metadata for display
const contentMeta = computed(() => {
  if (!data.value || !data.value.length) return null

  const content = data.value[0]
  return {
    title: content.title,
    description: content.description,
    _id: content._id,
    _path: content._path,
    _type: content._type,
    _extension: content._extension,
  }
})
</script>

<style scoped>
.content-debug {
  margin: 2rem 0;
  padding: 1rem;
  border: 1px dashed #999;
  background-color: #f9f9f9;
  border-radius: 4px;
  font-family: monospace;
}

.debug-box {
  margin-top: 0.5rem;
}

.error-info {
  color: #e53935;
  margin: 0.5rem 0;
}

pre {
  background-color: #eee;
  padding: 0.5rem;
  overflow: auto;
  max-height: 300px;
}
</style>