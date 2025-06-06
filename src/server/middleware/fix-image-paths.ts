// Server middleware to redirect image requests with /public/ prefix
export default defineEventHandler((event) => {
  // Only apply this middleware in development mode
  if (process.env.NODE_ENV === 'production') {
    return
  }

  const url = getRequestURL(event)
  const path = url.pathname

  // Check if this is an image request with /public/ prefix
  if (path && path.startsWith('/public/images/')) {
    // Extract the image path and redirect to standard path
    const standardPath = path.replace('/public/', '/')

    // Log the redirection for debugging
    console.log(`[Server Middleware] Redirecting ${path} to ${standardPath}`)

    // Redirect to the standard image path
    return sendRedirect(event, standardPath, 301)
  }
})
