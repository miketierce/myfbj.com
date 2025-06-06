<template>
  <div class="vuefire-form-page">
    <h1>VueFire Form Integration</h1>
    <p class="mb-5">This page demonstrates using VueFire for form data loading and submission, matching your existing form pattern.</p>

    <VueFireFormTest />
  </div>
</template>

<script setup>
import VueFireFormTest from '~/components/forms/VueFireFormTest.vue'
</script>

<style scoped>
.vuefire-form-page {
  padding: 20px;
  max-width: 960px;
  margin: 0 auto;
}
</style>