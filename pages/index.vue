<script setup>
// Redirect from root to /home
definePageMeta({
  middleware: 'home'
})
</script>

<template>
  <div>Redirecting to home page...</div>
</template>