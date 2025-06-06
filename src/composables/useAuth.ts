// Import only necessary functions, remove initializeApp since we'll use the plugin instance
import type { Auth, User } from 'firebase/auth'
import {
  signInAnonymously,
  onAuthStateChanged,
  signOut,
  linkWithCredential,
  EmailAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  getAuth,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'

// User data interface for type safety
interface UserData {
  uid: string
  createdAt: Date
  isAnonymous: boolean
  email?: string | null
  displayName?: string | null
  photoURL?: string | null
  theme?: string
  settings?: Record<string, any>
  [key: string]: any // Allow additional properties
}

export const useAuth = () => {
  const nuxtApp = useNuxtApp()
  const auth = nuxtApp.$firebaseAuth as Auth | null
  const firestore = nuxtApp.$firebaseFirestore as Firestore | null

  const user = useState<User | null>('user', () => null)
  const isLoading = useState<boolean>('auth-loading', () => true)
  const error = useState<string | null>('auth-error', () => null)
  const firestoreDisabled = useState<boolean>('firestore-disabled', () => false)
  const isFirebaseAvailable = useState<boolean>(
    'firebase-available',
    () => !!auth
  )

  // State for handling the email sign-in flow
  const emailForSignIn = useState<string>('email-for-sign-in', () => '')

  // Helper to safely interact with Firestore - with graceful fallback
  const safeFirestoreOperation = async (
    operation: () => Promise<any>,
    retries = 2,
    initialDelay = 1000
  ) => {
    // Skip Firestore operations if disabled
    if (firestoreDisabled.value) {
      return null
    }

    if (!firestore) {
      firestoreDisabled.value = true
      console.warn('Firestore is not available, disabling Firestore operations')
      return null
    }

    let lastError = null

    // Try the operation with retries and exponential backoff
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // If this isn't the first attempt, wait with exponential backoff
        if (attempt > 0) {
          const backoffDelay = initialDelay * Math.pow(2, attempt - 1)
          await new Promise((resolve) => setTimeout(resolve, backoffDelay))
        }

        return await operation()
      } catch (err: any) {
        lastError = err
        console.warn(
          `Firestore operation error (attempt ${attempt + 1}/${retries}):`,
          err
        )

        // Handle specific Firestore errors
        if (err.code === 'permission-denied') {
          // Mark Firestore as disabled for this session to avoid repeated failures
          firestoreDisabled.value = true
          console.warn(
            'Permission denied for Firestore operation. Disabling further Firestore operations.'
          )

          // Check if user recently authenticated via email link - if so, don't take any action
          const isRecentEmailAuth =
            import.meta.client &&
            (window.location.href.includes('apiKey=') ||
              window.location.href.includes('mode='))

          if (isRecentEmailAuth) {
            // Return null but don't sign out - email auth might just need time to propagate permissions
            return null
          }

          // For permission errors, we'll return null but NOT automatically sign out
          // or try to sign in anonymously. This prevents unexpected sign-outs.

          // Only refresh the token if we have a user (this won't sign them out)
          if (user.value && !lastTokenRefresh && auth?.currentUser) {
            try {
              lastTokenRefresh = true
              // Try to refresh token after a short delay
              setTimeout(async () => {
                try {
                  await auth.currentUser?.getIdToken(true)
                  // Reset the Firestore disabled flag to allow retrying operations
                  firestoreDisabled.value = false
                } catch (tokenErr) {
                  console.error('Failed to refresh token:', tokenErr)
                }
                lastTokenRefresh = false
              }, 1000)
            } catch (refreshErr) {
              console.error('Error during token refresh handling:', refreshErr)
              lastTokenRefresh = false
            }
          }

          return null
        } else {
          // For other errors, we'll continue with retries
          if (attempt === retries - 1) {
            // Only disable Firestore after all retries are exhausted
            console.warn(
              'All Firestore operation retries failed. Disabling Firestore for this session.'
            )
            firestoreDisabled.value = true
          }
        }
      }
    }

    return null
  }

  // Track if we're in the process of refreshing a token to avoid loops
  let lastTokenRefresh = false

  // Helper to get user data from the appropriate collection
  const getUserData = async (userId: string, isAnon = false) => {
    if (!firestore || firestoreDisabled.value) return null

    try {
      // Determine which collection to use
      const collection = isAnon ? 'anonUsers' : 'users' // Important: Using 'users' for verified users

      return await safeFirestoreOperation(async () => {
        const userRef = doc(firestore, collection, userId)
        const userDoc = await getDoc(userRef)

        if (userDoc.exists()) {
          return userDoc.data() as UserData
        }
        return null
      })
    } catch (err) {
      console.warn(
        `Failed to get user data for ${userId} from ${
          isAnon ? 'anonUsers' : 'users'
        }:`,
        err
      )
      return null
    }
  }

  // Helper to set user data in the appropriate collection
  const setUserData = async (
    userId: string,
    userData: Partial<UserData>,
    isAnon = false
  ) => {
    if (!firestore || firestoreDisabled.value) return false

    try {
      // Determine which collection to use - we're simplifying to use 'users' for verified
      const collection = isAnon ? 'anonUsers' : 'users'

      return await safeFirestoreOperation(async () => {
        const userRef = doc(firestore, collection, userId)
        const userDoc = await getDoc(userRef)

        if (userDoc.exists()) {
          // Update existing document
          await updateDoc(userRef, userData)
        } else {
          // Create new document
          await setDoc(userRef, {
            ...userData,
            uid: userId,
            createdAt: new Date(),
          })
        }
        return true
      })
    } catch (err) {
      console.warn(
        `Failed to set user data for ${userId} in ${
          isAnon ? 'anonUsers' : 'users'
        }:`,
        err
      )
      return false
    }
  }

  // Migrate data from anonymous user to verified user
  const migrateUserData = async (
    anonUserId: string,
    verifiedUserId: string
  ) => {
    if (!firestore || firestoreDisabled.value) return false

    try {
      return await safeFirestoreOperation(async () => {
        // Get anonymous user data
        const anonUserRef = doc(firestore, 'anonUsers', anonUserId)
        const anonUserDoc = await getDoc(anonUserRef)

        if (anonUserDoc.exists()) {
          const anonData = anonUserDoc.data() as UserData

          // Create verified user with anonymous user data
          const verifiedUserRef = doc(
            firestore,
            'users', // Using 'users' collection
            verifiedUserId
          )
          await setDoc(verifiedUserRef, {
            ...anonData,
            uid: verifiedUserId,
            isAnonymous: false,
            createdAt: new Date(),
            anonId: anonUserId, // Keep reference to anonymous ID
          })

          // Optionally delete the anonymous user data or mark it as migrated
          await updateDoc(anonUserRef, {
            migratedTo: verifiedUserId,
            migratedAt: new Date(),
          })

          return true
        }
        return false
      })
    } catch (err) {
      console.warn(
        `Failed to migrate user data from ${anonUserId} to ${verifiedUserId}:`,
        err
      )
      return false
    }
  }

  // Initialize auth state
  onMounted(() => {
    if (!auth) {
      console.error('Firebase Auth is not available')
      isLoading.value = false
      return
    }

    // Check if sign-in with email link
    if (
      import.meta.client &&
      isSignInWithEmailLink(auth, window.location.href)
    ) {
      console.log('Detected email sign-in link, attempting authentication...')
      // Get email from localStorage that we saved before sending the link
      const email = localStorage.getItem('emailForSignIn')

      if (email) {
        isLoading.value = true
        console.log(`Found email in localStorage: ${email.split('@')[0]}@***`)

        // Sign in with email link
        signInWithEmailLink(auth, email, window.location.href)
          .then(async (result) => {
            console.log('Email link sign-in successful')
            // Clear email from storage
            localStorage.removeItem('emailForSignIn')

            // Force token refresh to ensure Firestore will accept requests
            try {
              await auth.currentUser?.getIdToken(true)
              console.log('Authentication token forcefully refreshed')
            } catch (refreshError) {
              console.warn('Could not force refresh token:', refreshError)
            }
          })
          .catch((err) => {
            console.error('Email link sign-in failed:', err)

            // Instead of immediately redirecting, check if we're already authenticated
            setTimeout(() => {
              if (auth.currentUser) {
                console.log(
                  'Despite error, user is authenticated. Proceeding to profile.'
                )
                window.location.href = '/profile?mode=signIn'
              } else {
                // Only redirect if we're truly not authenticated
                error.value = err.message
                isLoading.value = false

                // Use console.warn instead of console.error to avoid too much noise in logs
                console.warn(
                  'Authentication truly failed, redirecting to login:',
                  err.message
                )
                window.location.href = '/login?error=sign-in-failed'
              }
            }, 1000) // Give Firebase a moment to complete any background auth processes
          })
      } else {
        // If email isn't in localStorage, we need to be smarter about handling this situation
        console.warn('Email not found in localStorage for email link sign-in')
        isLoading.value = true

        // Some email links include identity info that Firebase can use despite missing localStorage email
        // Let's give Firebase more time to complete authentication on its own
        setTimeout(() => {
          // Check if Firebase managed to authenticate the user despite missing localStorage email
          if (auth.currentUser) {
            console.log(
              'User authenticated successfully despite missing localStorage email'
            )
            // Success! Redirect to profile
            window.location.href = '/profile?mode=signIn'
          } else {
            // Still no authentication after waiting, now we can try one more approach:
            // Extract actionCode from URL and try to use it directly with signInWithEmailLink
            try {
              const url = new URL(window.location.href)
              const oobCode = url.searchParams.get('oobCode')

              if (oobCode) {
                console.log(
                  'Found oobCode in URL, attempting to use it directly'
                )
                // Instead of redirecting to login with error, we'll keep the user on this page
                // and let Firebase's built-in auth state change listener handle authentication

                // Just set a reasonable timeout to eventually stop loading if nothing happens
                setTimeout(() => {
                  if (!auth.currentUser) {
                    isLoading.value = false
                    error.value =
                      'Authentication timed out. Please request a new sign-in link.'
                  }
                }, 5000)
              } else {
                // No oobCode found, redirect to login
                isLoading.value = false
                error.value =
                  'Sign-in link appears invalid. Please request a new link.'
                window.location.href = '/login?error=invalid-link'
              }
            } catch (err) {
              console.error('Error processing email link authentication:', err)
              isLoading.value = false
              error.value = 'An error occurred processing your sign-in link.'
              window.location.href = '/login?error=processing-error'
            }
          }
        }, 2000) // Give Firebase time to complete auth process
      }
    }

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(
      auth,
      async (authUser) => {
        isLoading.value = false
        user.value = authUser

        // Clear any authentication errors when user is successfully authenticated
        if (authUser) {
          error.value = null

          // Force token refresh immediately to ensure Firestore will accept requests
          try {
            await authUser.getIdToken(true)
            console.log('Authentication token forcefully refreshed')
          } catch (refreshError) {
            console.warn('Could not force refresh token:', refreshError)
          }

          // Proceed with Firestore operations without blocking the auth state change
          if (firestore && !firestoreDisabled.value) {
            // Process the user profile in a non-blocking way
            setTimeout(async () => {
              try {
                // Determine which collection to use based on user type - 'users' for verified
                const isAnon = authUser.isAnonymous
                const collection = isAnon ? 'anonUsers' : 'users'

                await safeFirestoreOperation(async () => {
                  const userRef = doc(firestore, collection, authUser.uid)
                  const userDoc = await getDoc(userRef)

                  // Load user data if it exists
                  if (userDoc.exists()) {
                    console.log(
                      `User profile exists in ${collection}/${authUser.uid}`
                    )

                    // Apply user settings if available
                    const userData = userDoc.data() as UserData

                    // Update user profile if display name changed
                    if (
                      userData.displayName &&
                      userData.displayName !== authUser.displayName &&
                      auth.currentUser // Check if still signed in
                    ) {
                      try {
                        console.log(
                          `Updating auth profile with displayName: ${userData.displayName}`
                        )
                        await updateProfile(auth.currentUser, {
                          displayName: userData.displayName,
                        })

                        // Only update user.value if user is still the same
                        if (auth.currentUser?.uid === authUser.uid) {
                          user.value = auth.currentUser // Refresh user object
                          console.log(
                            'Updated user object with new display name'
                          )
                        }
                      } catch (err) {
                        console.warn(
                          'Failed to update profile with stored display name:',
                          err
                        )
                      }
                    }

                    // Apply theme if stored
                    if (userData.theme) {
                      const { setTheme } = useAppTheme()
                      setTheme(userData.theme)
                    }
                  } else {
                    // Create user profile if it doesn't exist
                    console.log(
                      `Creating new user profile in ${collection}/${authUser.uid}`
                    )
                    await setDoc(userRef, {
                      uid: authUser.uid,
                      createdAt: new Date(),
                      isAnonymous: authUser.isAnonymous,
                      email: authUser.email,
                      displayName: authUser.displayName,
                      photoURL: authUser.photoURL,
                      // Add additional fields as needed
                    })
                  }
                })
              } catch (err) {
                // If there's an error creating/updating the user profile, just log it
                console.warn(
                  `Error updating user profile in Firestore ${
                    authUser.isAnonymous ? 'anonUsers' : 'users'
                  }:`,
                  err
                )
                firestoreDisabled.value = true
              }
            }, 100) // Short timeout just to let the auth state update complete first
          }
        }
      },
      (err) => {
        console.error('Auth state change error:', err)
        error.value = err.message
        isLoading.value = false
      }
    )

    // Cleanup subscription on component unmount
    onUnmounted(() => unsubscribe())
  })

  // Sign in anonymously
  const signInAnonymousUser = async () => {
    if (!auth) return false

    try {
      isLoading.value = true
      error.value = null
      const result = await signInAnonymously(auth)

      // Create anonymous user doc in Firestore
      if (result.user && !firestoreDisabled.value && firestore) {
        try {
          const { currentTheme } = useAppTheme()
          await setUserData(
            result.user.uid,
            {
              isAnonymous: true,
              theme: currentTheme.value,
            },
            true
          )
        } catch (err) {
          console.warn('Failed to create anonymous user doc:', err)
        }
      }

      // Auth state listener will handle the rest
      return true
    } catch (err: any) {
      error.value = err.message
      isLoading.value = false
      return false
    }
  }

  // Sign out current user
  const signOutUser = async () => {
    if (!auth) return false

    try {
      isLoading.value = true
      error.value = null
      await signOut(auth)
      // Auth state listener will handle the state update
      return true
    } catch (err: any) {
      error.value = err.message
      isLoading.value = false
      return false
    }
  }

  // Send passwordless sign-in link
  const sendSignInLink = async (email: string) => {
    if (!auth) return false

    try {
      isLoading.value = true
      error.value = null

      // Save email in localStorage so we can access it after redirect
      if (import.meta.client) {
        localStorage.setItem('emailForSignIn', email)
      }

      // Configure sign-in link options
      const actionCodeSettings = {
        // URL you want to redirect to after sign-in
        url: `${window.location.origin}/profile`,
        handleCodeInApp: true,
      }

      // Send sign-in link
      await sendSignInLinkToEmail(auth, email, actionCodeSettings)

      isLoading.value = false
      return true
    } catch (err: any) {
      error.value = err.message
      isLoading.value = false
      return false
    }
  }

  // Convert anonymous account to passwordless email link
  const convertAnonymousToEmailLink = async (email: string) => {
    if (!auth) return false

    if (!user.value || !user.value.isAnonymous) {
      error.value = 'No anonymous user signed in'
      return false
    }

    try {
      isLoading.value = true
      error.value = null

      // Save the email for post-redirect
      if (import.meta.client) {
        localStorage.setItem('emailForSignIn', email)
        // Store the anonymous user's UID to link after redirect
        localStorage.setItem('anonymousUserToLink', user.value.uid)
      }

      // Configure sign-in link options for conversion
      const actionCodeSettings = {
        url: `${window.location.origin}/profile?mode=linkAnonymous`,
        handleCodeInApp: true,
      }

      // Send sign-in link
      await sendSignInLinkToEmail(auth, email, actionCodeSettings)

      // Update Firestore user record in anonUsers collection
      if (firestore && !firestoreDisabled.value && user.value) {
        try {
          await setUserData(
            user.value.uid,
            {
              pendingEmail: email,
              lastUpdateAt: new Date(),
            },
            true
          )
        } catch (err) {
          console.warn('Failed to update pending email in Firestore:', err)
        }
      }

      isLoading.value = false
      return true
    } catch (err: any) {
      error.value = err.message
      isLoading.value = false
      return false
    }
  }

  // Update user profile information and store in Firestore
  const updateUserProfile = async (
    userId: string,
    profileData: {
      displayName?: string
      photoURL?: string
      theme?: string
      publicGalleryImages?: any[] // Allow public gallery images
      [key: string]: any // Allow other properties
    }
  ) => {
    if (!auth) {
      error.value = 'Firebase Auth is not initialized'
      return false
    }

    // If userId is not provided, use the current user's ID
    const targetUserId = userId || auth.currentUser?.uid

    if (!targetUserId) {
      error.value = 'No user ID provided and no user is signed in'
      return false
    }

    try {
      isLoading.value = true
      error.value = null

      // If we're updating the current user's profile
      if (auth.currentUser && targetUserId === auth.currentUser.uid) {
        // Update Firebase Auth profile
        if (profileData.displayName || profileData.photoURL) {
          console.log(
            `Updating auth profile with displayName: ${profileData.displayName}`
          )
          await updateProfile(auth.currentUser, {
            displayName: profileData.displayName,
            photoURL: profileData.photoURL,
          })
        }
      }

      // Update user data in Firestore
      const isAnon = auth.currentUser?.isAnonymous || false
      const saveResult = await setUserData(
        targetUserId,
        {
          ...profileData,
          lastUpdateAt: new Date(),
        },
        isAnon
      )

      // If theme is being updated, apply it
      if (profileData.theme) {
        const { setTheme } = useAppTheme()
        setTheme(profileData.theme)
      }

      // Refresh user state to ensure UI shows updated information
      if (auth.currentUser && targetUserId === auth.currentUser.uid) {
        user.value = auth.currentUser
      }

      isLoading.value = false
      return saveResult
    } catch (err: any) {
      error.value = err.message
      isLoading.value = false
      return false
    }
  }

  return {
    user,
    isLoading,
    error,
    signInAnonymousUser,
    signOutUser,
    sendSignInLink,
    convertAnonymousToEmailLink,
    updateUserProfile,
    getUserData,
    setUserData,
    migrateUserData,
    firestoreDisabled,
    emailForSignIn,
    isFirebaseAvailable,
  }
}
