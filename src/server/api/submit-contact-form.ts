import { z } from 'zod'

import { useRuntimeConfig } from '#imports'

import { db } from '../utils/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

// Initialize function instead of using top-level await
function initializeFirebase() {
  // This will run when the module is imported, but doesn't use top-level await
  db.collection('messages')
    .add({ text: 'Hello from Firebase!' })
    .catch((error) => console.error('Failed to add test message:', error))
}

// Call initialization function (no await)
initializeFirebase()

type RecaptchaResponse = {
  success: boolean
  score: number
  action: string
  challenge_ts: string
  hostname: string
  error_codes?: string[]
}

async function verifyRecaptcha(token: string): Promise<boolean> {
  const config = useRuntimeConfig()
  const secret = config.recaptchaSecretKey

  const res = await $fetch<RecaptchaResponse>(
    'https://www.google.com/recaptcha/api/siteverify',
    {
      method: 'POST',
      body: new URLSearchParams({
        secret,
        response: token,
      }).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )

  return res.success && res.score >= 0.5
}

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(5),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = schema.safeParse(body)

  if (!(await verifyRecaptcha(body.recaptchaToken))) {
    return { success: false, error: 'Failed reCAPTCHA verification' }
  }

  if (!result.success) {
    return { success: false, error: 'Validation failed' }
  }

  await db.collection('contactMessages').add({
    ...result.data,
    timestamp: FieldValue.serverTimestamp(),
  })

  return { success: true }
})
