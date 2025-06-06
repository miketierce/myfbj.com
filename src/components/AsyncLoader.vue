<template>
  <div>
    <Suspense>
      <slot />
      <template #fallback>
        <div class="loading">Loading content...</div>
      </template>
    </Suspense>
  </div>
</template>

<style scoped>
.loading {
  padding: 1rem;
  text-align: center;
  color: #666;
}
</style>