import { auth } from '../utils/firebase-admin'
import { z } from 'zod'

// Input validation schema
const schema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().optional(),
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

    const { uid, email, displayName } = result.data

    // Get the user from Firebase Auth
    const userRecord = await auth.getUser(uid)

    // If not an anonymous user, return error
    if (!userRecord.providerData || userRecord.providerData.length > 0) {
      return {
        success: false,
        error: 'User is not anonymous or already has a provider',
      }
    }

    // Update the user with email
    await auth.updateUser(uid, {
      email,
      displayName: displayName || undefined,
      emailVerified: false,
    })

    // Generate and send a password reset link to set up their password
    const resetLink = await auth.generatePasswordResetLink(email)

    // Here you would typically send the email with the reset link
    // For this example, we're just returning it in the response

    return {
      success: true,
      message: 'User updated successfully',
      resetLink,
    }
  } catch (error: any) {
    console.error('Error converting user:', error)

    return {
      success: false,
      error: error.message || 'An error occurred while converting the user',
    }
  }
})
