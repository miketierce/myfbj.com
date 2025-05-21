import { defineNuxtRouteMiddleware } from '#app'

export default defineNuxtRouteMiddleware((to) => {
  // Log content paths for debugging
  console.log(`[Content Debug] Route path: ${to.path}`)

  // Don't block navigation
  return
})
