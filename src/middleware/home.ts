export default defineNuxtRouteMiddleware((to, from) => {
  // If user visits the root URL, redirect them to the home page
  if (to.path === '/') {
    return navigateTo('/home')
  }
})
