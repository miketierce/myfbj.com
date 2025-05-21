<template>
  <div class="vuex-test-page">
    <h1>Vuex and VueFire Integration Test</h1>
    <p class="mb-5">This page tests the integration between Vuex and VueFire to ensure both systems work together properly.</p>

    <VuexFormTest />
  </div>
</template>

<script setup>
import VuexFormTest from '~/components/forms/VuexFormTest.vue'
</script>

<style scoped>
.vuex-test-page {
  padding: 20px;
  max-width: 960px;
  margin: 0 auto;
}
</style>