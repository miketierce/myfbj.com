import { defineEventHandler, getRequestHeaders } from 'h3'
import { useRuntimeConfig } from '#imports'

// Middleware specifically for Cloud Run environment
export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const headers = getRequestHeaders(event)

  // Log request details to help with debugging
  console.log('Request path:', event.path)

  // Add any Cloud Run specific handling here
  // For example, you might need to handle special headers or authentication tokens

  // We're not modifying the request, just logging for debugging
  return
})
