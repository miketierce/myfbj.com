// Server middleware to handle image paths in development mode
import { readFileSync } from 'fs'
import { resolve } from 'path'

export default defineEventHandler(async (event) => {
  // Only handle GET requests
  if (event.method !== 'GET') {
    return
  }

  const url = event.path || ''

  // Check if this is an IPX request in development mode
  if (url.startsWith('/_ipx/_/images/')) {
    // Try to serve the image directly from the /public/images directory
    const imagePath = url.replace('/_ipx/_/images/', '/images/')

    try {
      // Redirect to the standard image path in development
      await sendRedirect(event, imagePath, 302)
      return
    } catch (error) {
      console.error(`Error redirecting IPX path to standard path: ${error}`)
      // Continue with normal handling if redirect fails
    }
  }
})
