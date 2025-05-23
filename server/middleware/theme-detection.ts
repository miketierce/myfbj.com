import { getThemeFromAuth } from '../utils/get-theme-from-auth'
import { parseCookies } from 'h3'

export default defineEventHandler(async (event) => {
  // Only run during SSR, not for API routes
  if (!event.path.startsWith('/api/')) {
    try {
      // First try to get theme from auth claims (highest priority)
      const themeFromAuth = await getThemeFromAuth(event)

      if (themeFromAuth) {
        // Store theme from auth claim in the event context
        event.context.theme = themeFromAuth
        return
      }

      // If no theme from auth, check for theme cookie
      const cookies = parseCookies(event)
      const themeCookie = cookies.preferredTheme

      if (themeCookie === 'wireframe' || themeCookie === 'wireframeDark') {
        event.context.theme = themeCookie
        return
      }

      // Default to light theme if no preferences are found
      event.context.theme = 'wireframe'
    } catch (error) {
      console.error('Error in theme middleware:', error)
      // Ensure we still have a default theme
      event.context.theme = 'wireframe'
    }
  }
})
