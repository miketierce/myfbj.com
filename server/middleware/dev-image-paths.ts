// Server middleware to redirect IPX requests to standard image paths
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  // Only process IPX image requests
  if (path && path.startsWith('/_ipx/_/images/')) {
    // Extract the image path and redirect to standard path
    const standardPath = path.replace('/_ipx/_/images/', '/images/')

    // Log the redirection for debugging
    console.log(`[Image Middleware] Redirecting ${path} to ${standardPath}`)

    // Redirect to the standard image path
    return sendRedirect(event, standardPath, 302)
  }
})
