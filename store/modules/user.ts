import { firestoreAction } from '../vuexfire-adapter'
import { doc, setDoc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore'
import { type UserCredential } from 'firebase/auth'
import type { Module } from 'vuex'
import type { FirebaseServices } from '../index'
import type { GalleryImage } from '~/types'

// Define user state interface
interface UserState {
  user: any | null // Firebase auth user
  profile: any | null // Firestore user profile
  isAuthenticated: boolean
  isLoading: boolean
  authError: string | null
  lastLogin: string | null
  firebaseAuth: any | null
  firestore: any | null
  initialized: boolean // Track initialization state
}

// Factory function to create the user module with Firebase services
export default function createUserModule(
  services?: FirebaseServices
): Module<UserState, any> {
  return {
    namespaced: true,

    state: () => ({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      authError: null,
      lastLogin: null,
      firebaseAuth: services?.firebaseAuth || null,
      firestore: services?.firebaseFirestore || null,
      initialized: false, // Start as not initialized
    }),

    mutations: {
      SET_USER(state, user) {
        state.user = user
        state.isAuthenticated = !!user
        if (user) {
          state.lastLogin = new Date().toISOString()
        }
      },
      SET_LOADING(state, isLoading) {
        state.isLoading = isLoading
      },
      SET_AUTH_ERROR(state, error) {
        state.authError = error
      },
      CLEAR_AUTH_ERROR(state) {
        state.authError = null
      },
      SET_SERVICES(state, { auth, firestore }) {
        state.firebaseAuth = auth
        state.firestore = firestore
      },
      SET_INITIALIZED(state, initialized) {
        state.initialized = initialized
      },
      SET_PROFILE(state, profile) {
        state.profile = profile
      },
    },

    actions: {
      // Initialize the user module
      initialize({ state, commit }) {
        console.log(
          'Initializing user module with Firebase Auth:',
          !!state.firebaseAuth
        )
        commit('SET_INITIALIZED', true)
        return Promise.resolve()
      },

      // Handle auth state changes
      onAuthStateChanged({ state, commit, dispatch }, firebaseUser) {
        console.log('Auth state changed:', !!firebaseUser)
        commit(
          'SET_USER',
          firebaseUser && {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            metadata: {
              creationTime: firebaseUser.metadata?.creationTime,
              lastSignInTime: firebaseUser.metadata?.lastSignInTime,
            },
          }
        )

        // If user is authenticated, load their profile
        if (firebaseUser) {
          dispatch('loadUserProfile', firebaseUser.uid)
        } else {
          dispatch('unbindUserProfile')
        }
      },

      // Use firestoreAction to bind user profile to Vuex state
      loadUserProfile: firestoreAction(async function (context, userId) {
        const { state, bindFirestoreRef } = context

        if (!state.firestore) {
          console.error('Firestore not available in user module')
          return
        }

        try {
          console.log(`Binding user profile for ${userId}`)

          // Reference to the user profile document
          const userRef = doc(state.firestore, 'users', userId)

          // First check if profile exists
          const userSnap = await getDoc(userRef)

          if (!userSnap.exists()) {
            console.log('No profile found, creating a new one')
            // Create a basic profile
            const newProfile = {
              userId,
              email: state.user?.email || '',
              displayName: state.user?.displayName || '',
              photoURL: state.user?.photoURL || '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              publicGalleryImages: [],
              mainGalleryImageId: null,
            }

            // Save to Firestore
            await setDoc(userRef, newProfile)
            console.log('Created new user profile in Firestore')
          }

          // Bind the reference to the profile state using VuexFire
          // Pass the string for the property name and the document reference
          await bindFirestoreRef('profile', userRef)
          console.log('User profile binding complete')

          return userRef
        } catch (error) {
          console.error('Error binding user profile:', error)
        }
      }),

      // Unbind profile when logging out
      unbindUserProfile: firestoreAction(function (context) {
        const { unbindFirestoreRef } = context
        console.log('Unbinding user profile')
        unbindFirestoreRef('profile')
      }),

      // Update user profile in Firestore
      updateUserProfile: firestoreAction(async function (context, profileData) {
        const { state } = context

        if (!state.firestore || !state.user?.uid) {
          return { success: false, message: 'Not authenticated' }
        }

        try {
          const userId = state.user.uid
          const userRef = doc(state.firestore, 'users', userId)

          // Add metadata
          const updatedProfile = {
            ...profileData,
            updatedAt: new Date().toISOString(),
          }

          // Check if document exists
          const userSnap = await getDoc(userRef)

          if (userSnap.exists()) {
            // Update existing document in Firestore
            await updateDoc(userRef, updatedProfile)
          } else {
            // Create new document if it doesn't exist
            const newProfile = {
              ...updatedProfile,
              userId,
              createdAt: new Date().toISOString(),
            }

            // Save to Firestore
            await setDoc(userRef, newProfile)
          }

          return { success: true, message: 'Profile updated successfully' }
        } catch (error: any) {
          return {
            success: false,
            message: error.message || 'Error updating profile',
            error,
          }
        }
      }),

      // Save public gallery images to Firestore
      savePublicGalleryImages: firestoreAction(async function (
        context,
        { mainImageId = null, publicImages = [] }
      ) {
        const { state, dispatch } = context

        console.log(
          'GALLERY DEBUG - Starting savePublicGalleryImages with state:',
          {
            hasFirestore: !!state.firestore,
            hasUser: !!state.user,
            userId: state.user?.uid,
            profileIsBound: !!state.profile,
          }
        )

        if (!state.firestore || !state.user?.uid) {
          console.error('GALLERY DEBUG - Firestore or User ID not available')
          return { success: false, message: 'Not authenticated' }
        }

        try {
          console.log('GALLERY DEBUG - Saving public gallery images:', {
            mainImageId,
            publicImagesCount: publicImages.length,
          })

          // Find the main image URL if mainImageId is provided
          let mainImageUrl = null
          if (mainImageId && publicImages.length > 0) {
            const mainImage = publicImages.find((img) => img.id === mainImageId)
            if (mainImage) {
              mainImageUrl = mainImage.url
            }
          }

          // Only update Firestore, not state directly
          const profileUpdate = {
            publicGalleryImages: publicImages,
            mainGalleryImageId: mainImageId,
          }

          // Only include photoURL if we have a valid value to avoid Firebase errors
          if (mainImageUrl) {
            profileUpdate.photoURL = mainImageUrl
          } else if (state.profile?.photoURL) {
            profileUpdate.photoURL = state.profile.photoURL
          }
          // If both are undefined, we'll omit photoURL entirely from the update

          console.log('GALLERY DEBUG - Profile update payload:', profileUpdate)

          // Use the dispatch from context parameter
          const result = await dispatch('updateUserProfile', profileUpdate)
          console.log('GALLERY DEBUG - updateUserProfile result:', result)

          return result
        } catch (error: any) {
          console.error(
            'GALLERY DEBUG - Error saving public gallery images:',
            error
          )
          return {
            success: false,
            message: error.message || 'Error saving gallery images',
            error,
          }
        }
      }),

      // Sign in with email and password
      async signIn({ state, commit, dispatch }, { email, password }) {
        if (!state.firebaseAuth) {
          commit('SET_AUTH_ERROR', 'Firebase Auth not initialized')
          return { success: false, message: 'Firebase Auth not initialized' }
        }

        try {
          commit('SET_LOADING', true)
          commit('CLEAR_AUTH_ERROR')

          const { signInWithEmailAndPassword } = await import('firebase/auth')
          const userCredential: UserCredential =
            await signInWithEmailAndPassword(
              state.firebaseAuth,
              email,
              password
            )

          // Auth state change listener will handle setting user
          return {
            success: true,
            user: userCredential.user,
            message: 'Signed in successfully',
          }
        } catch (error: any) {
          console.error('Sign in error:', error)
          commit('SET_AUTH_ERROR', error.message)
          return {
            success: false,
            message: error.message || 'Failed to sign in',
            error,
          }
        } finally {
          commit('SET_LOADING', false)
        }
      },

      // Sign up with email and password
      async signUp({ state, commit }, { email, password, displayName }) {
        if (!state.firebaseAuth) {
          commit('SET_AUTH_ERROR', 'Firebase Auth not initialized')
          return { success: false, message: 'Firebase Auth not initialized' }
        }

        try {
          commit('SET_LOADING', true)
          commit('CLEAR_AUTH_ERROR')

          const { createUserWithEmailAndPassword, updateProfile } =
            await import('firebase/auth')
          const userCredential = await createUserWithEmailAndPassword(
            state.firebaseAuth,
            email,
            password
          )

          // Update display name if provided
          if (displayName && userCredential.user) {
            await updateProfile(userCredential.user, { displayName })
          }

          // Auth state change listener will handle setting user and creating profile
          return {
            success: true,
            user: userCredential.user,
            message: 'Account created successfully',
          }
        } catch (error: any) {
          console.error('Sign up error:', error)
          commit('SET_AUTH_ERROR', error.message)
          return {
            success: false,
            message: error.message || 'Failed to create account',
            error,
          }
        } finally {
          commit('SET_LOADING', false)
        }
      },

      // Sign out
      async signOut({ state, commit }) {
        if (!state.firebaseAuth) {
          commit('SET_AUTH_ERROR', 'Firebase Auth not initialized')
          return { success: false, message: 'Firebase Auth not initialized' }
        }

        try {
          commit('SET_LOADING', true)

          const { signOut } = await import('firebase/auth')
          await signOut(state.firebaseAuth)

          // Auth state change listener will handle clearing user
          return { success: true, message: 'Signed out successfully' }
        } catch (error: any) {
          console.error('Sign out error:', error)
          commit('SET_AUTH_ERROR', error.message)
          return {
            success: false,
            message: error.message || 'Failed to sign out',
            error,
          }
        } finally {
          commit('SET_LOADING', false)
        }
      },
    },

    getters: {
      isAuthenticated: (state) => state.isAuthenticated,
      currentUser: (state) => state.user,
      userProfile: (state) => state.profile,
      authError: (state) => state.authError,
      isAuthLoading: (state) => state.isLoading,
      displayName: (state) =>
        state.user?.displayName || state.profile?.displayName || 'User',
      userEmail: (state) => state.user?.email || state.profile?.email || null,
      userPhotoURL: (state) =>
        state.user?.photoURL || state.profile?.photoURL || null,
      publicGalleryImages: (state) => state.profile?.publicGalleryImages || [],
      mainGalleryImageId: (state) => state.profile?.mainGalleryImageId || null,
      mainGalleryImageUrl: (state) => {
        if (
          state.profile?.mainGalleryImageId &&
          state.profile?.publicGalleryImages
        ) {
          const mainImage = state.profile.publicGalleryImages.find(
            (img: GalleryImage) => img.id === state.profile.mainGalleryImageId
          )
          return mainImage?.url || state.profile?.photoURL || null
        }
        return state.profile?.photoURL || null
      },
    },
  }
}
