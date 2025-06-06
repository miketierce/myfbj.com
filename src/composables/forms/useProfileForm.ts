import { useForm } from './useForm'
import { useUnifiedForm } from './useForm' // Use unified form system
import { useValidation } from './useValidation'
import { useAuth } from '../useAuth'
import { computed } from 'vue'
import { doc, type Firestore } from 'firebase/firestore'
import { useNuxtApp } from '#app'

export interface ProfileFormData {
  displayName: string
  email: string
  bio?: string
  notificationsEnabled?: boolean
  // Add other profile fields as needed
}

export interface ProfileFormOptions {
  useFirestore?: boolean // Whether to use Firestore integration
  syncImmediately?: boolean // Whether to sync changes immediately (Firestore mode only)
  debounceTime?: number // Debounce time for Firestore updates (default: 1500ms)
}

/**
 * Profile form composable that supports both standard forms and Firestore-integrated forms
 */
export const useProfileForm = (options: ProfileFormOptions = {}) => {
  const { user, updateUserProfile, getUserData } = useAuth()
  const nuxtApp = useNuxtApp()
  // Explicitly type the Firestore instance
  const firestore = nuxtApp.$firebaseFirestore as Firestore | null
  const userId = computed(() => user.value?.uid)

  // Initial form state
  const initialState: ProfileFormData = {
    displayName: '',
    email: '',
    bio: '',
    notificationsEnabled: true,
  }

  // Form validation rules
  const { rules } = useValidation()
  const validationRules = {
    displayName: rules.minLength(2),
    email: rules.email,
    bio: rules.maxLength(500),
  }

  // Submit handler to update user profile
  const handleProfileUpdate = async (formData: ProfileFormData) => {
    if (!user.value) return false

    try {
      // Update profile in Firebase Auth
      const result = await updateUserProfile({
        displayName: formData.displayName,
        // Other fields would go to Firestore document
      })

      if (result) {
        return {
          success: true,
          message: 'Profile updated successfully',
        }
      }

      return {
        success: false,
        message: 'Failed to update profile',
      }
    } catch (err: any) {
      console.error('Error updating profile:', err)
      return {
        success: false,
        message: err.message || 'An unexpected error occurred',
      }
    }
  }

  // Create the appropriate form based on options
  let profileForm: ReturnType<typeof useUnifiedForm<ProfileFormData>>

  if (options.useFirestore && userId.value && firestore) {
    // Use Firestore integration if requested and user is available
    const userDocRef = doc(firestore, 'users', userId.value)

    profileForm = useUnifiedForm<ProfileFormData>({
      mode: 'firestore', // Explicitly set mode to firestore
      formId: `user-profile-${userId.value}`,
      initialState,
      docRef: userDocRef,
      validationRules,
      submitHandler: handleProfileUpdate,
      createIfNotExists: true,
      syncImmediately: options.syncImmediately ?? false,
      debounceTime: options.debounceTime ?? 1500,
      resetAfterSubmit: false,
      progressiveSave: true,
    })
  } else {
    // Fall back to standard form
    profileForm = useUnifiedForm<ProfileFormData>({
      mode: 'standard',
      formId: `user-profile-standard-${Date.now()}`,
      initialState,
      validationRules,
      submitHandler: handleProfileUpdate,
      resetAfterSubmit: false,
    })
  }

  // Load user data from auth and Firestore
  const loadUserData = async () => {
    if (!user.value) return

    try {
      // Load display name from Firebase Auth
      if (user.value.displayName) {
        profileForm.formData.displayName = user.value.displayName
      }

      // Load email from Firebase Auth
      if (user.value.email) {
        profileForm.formData.email = user.value.email
      }

      if (!options.useFirestore) {
        // Manual loading for standard mode
        // Load additional data from Firestore
        const userData = await getUserData(
          user.value.uid,
          user.value.isAnonymous
        )

        if (userData) {
          // Map Firestore fields to form data
          if (userData.bio) profileForm.formData.bio = userData.bio
          if (userData.notificationsEnabled !== undefined) {
            profileForm.formData.notificationsEnabled =
              userData.notificationsEnabled
          }
        }
      }
      // Firestore mode handles loading automatically
    } catch (err) {
      console.error('Error loading user data:', err)
    }
  }

  // Return the form with our additional methods
  return {
    ...profileForm,
    loadUserData,
    // Flag indicating if we're using Firestore mode
    isFirestoreMode: !!options.useFirestore,
  }
}
