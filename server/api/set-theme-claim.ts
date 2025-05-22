import { auth, db } from '../utils/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'

// Input validation schema
const schema = z.object({
  uid: z.string().min(1),
  isDark: z.boolean(),
  isAnonymous: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    // Parse and validate request body
    const body = await readBody(event)
    const result = schema.safeParse(body)

    if (!result.success) {
      return {
        success: false,
        error: 'Invalid input data',
        details: result.error.format(),
      }
    }

    const { uid, isDark, isAnonymous = false } = result.data
    const themeName = isDark ? 'wireframeDark' : 'wireframe'

    // For anonymous users, we only save to Firestore
    if (isAnonymous) {
      // Use anonUsers collection for anonymous users
      await db.collection('anonUsers').doc(uid).set(
        {
          isDarkMode: isDark,
          theme: themeName,
          lastUpdateAt: FieldValue.serverTimestamp(),
          isAnonymous: true,
        },
        { merge: true }
      )

      return {
        success: true,
        message: `Theme preference set to ${themeName} for anonymous user ${uid}`,
      }
    }

    // For regular users, set both Auth claims and Firestore data
    try {
      // Get the current custom claims
      const user = await auth.getUser(uid)
      const currentClaims = user.customClaims || {}

      // Set the theme claim - keep it minimal for token size
      await auth.setCustomUserClaims(uid, {
        ...currentClaims,
        theme: isDark ? 'dark' : 'light', // Simplified for claims
      })
    } catch (authError) {
      console.error('Error setting auth claims:', authError)
      // Continue with Firestore update even if Auth claims fail
    }

    // Always update Firestore for additional theme data
    await db.collection('users').doc(uid).set(
      {
        isDarkMode: isDark,
        theme: themeName, // Full theme name in Firestore
        lastUpdateAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    // Return success response
    return {
      success: true,
      message: `Theme preference set to ${themeName} for user ${uid}`,
    }
  } catch (error) {
    console.error('Error setting theme claim:', error)
    return {
      success: false,
      error: error.message || 'An error occurred setting theme claim',
    }
  }
})
