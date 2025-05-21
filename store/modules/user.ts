import { firestoreAction } from 'vuexfire'
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore'
import { type UserCredential } from 'firebase/auth'
import type { Module } from 'vuex'
import type { FirebaseServices } from '../index'

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
      SET_PROFILE(state, profile) {
        state.profile = profile
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
          commit('SET_PROFILE', null)
        }
      },

      // Load user profile from Firestore
      loadUserProfile: firestoreAction(
        async ({ state, commit, bindFirestoreRef }, userId) => {
          if (!state.firestore) {
            console.error('Firestore not available in user module')
            return
          }

          try {
            const userProfileRef = doc(state.firestore, 'userProfiles', userId)

            // First check if profile exists
            const docSnap = await getDoc(userProfileRef)

            if (docSnap.exists()) {
              commit('SET_PROFILE', docSnap.data())
            } else {
              // Create a basic profile if it doesn't exist
              const newProfile = {
                userId,
                email: state.user?.email || '',
                displayName: state.user?.displayName || '',
                photoURL: state.user?.photoURL || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }

              await setDoc(userProfileRef, newProfile)
              commit('SET_PROFILE', newProfile)
            }
          } catch (error: any) {
            console.error('Error loading user profile:', error)
            commit(
              'SET_AUTH_ERROR',
              error.message || 'Error loading user profile'
            )
          }
        }
      ),

      // Update user profile in Firestore
      updateUserProfile: firestoreAction(
        async ({ state, commit }, profileData) => {
          if (!state.firestore || !state.user?.uid) {
            console.error('Firestore or User ID not available')
            return { success: false, message: 'Not authenticated' }
          }

          try {
            const userProfileRef = doc(
              state.firestore,
              'userProfiles',
              state.user.uid
            )

            // Add metadata
            const updatedProfile = {
              ...profileData,
              updatedAt: new Date().toISOString(),
            }

            await updateDoc(userProfileRef, updatedProfile)
            commit('SET_PROFILE', { ...state.profile, ...updatedProfile })

            return { success: true, message: 'Profile updated successfully' }
          } catch (error: any) {
            console.error('Error updating profile:', error)
            return {
              success: false,
              message: error.message || 'Error updating profile',
              error,
            }
          }
        }
      ),

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
    },
  }
}
