import { auth } from './firebase-admin'
import { H3Event } from 'h3'

/**
 * Gets the user's theme preference from Firebase Auth custom claims
 * This is intended for server-side rendering to prevent theme flashing
 */
export async function getThemeFromAuth(
  event: H3Event
): Promise<'wireframe' | 'wireframeDark' | null> {
  try {
    // Get the authorization header
    const authHeader = getRequestHeader(event, 'authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    // Extract the token
    const token = authHeader.split('Bearer ')[1]
    if (!token) {
      return null
    }

    // Verify the token and get user claims
    try {
      const decodedToken = await auth.verifyIdToken(token)

      // Check for theme claim
      if (decodedToken && decodedToken.theme) {
        // Convert the simplified 'dark'/'light' to our app's actual theme names
        return decodedToken.theme === 'dark' ? 'wireframeDark' : 'wireframe'
      }
    } catch (error) {
      console.error('Error verifying auth token for theme:', error)
    }

    return null
  } catch (error) {
    console.error('Error getting theme from auth:', error)
    return null
  }
}
