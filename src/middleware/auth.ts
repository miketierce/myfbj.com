export default defineNuxtRouteMiddleware((to) => {
  const { user, isLoading } = useAuth()

  // Skip middleware on server-side to avoid hydration issues
  if (import.meta.server) return

  // Wait for auth to initialize
  if (isLoading.value) return

  // If user is not authenticated and trying to access a protected route
  if (!user.value && to.path.startsWith('/profile')) {
    return navigateTo('/login')
  }
})
