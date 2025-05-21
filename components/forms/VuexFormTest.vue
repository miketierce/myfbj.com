<template>
  <div class="vuex-form-test">
    <h2>Vuex Form Integration Test</h2>

    <v-card class="pa-4 mb-4">
      <v-card-title>User Information</v-card-title>
      <v-card-text>
        <div v-if="userStore.isAuthenticated">
          <p><strong>User ID:</strong> {{ userStore.currentUser?.uid }}</p>
          <p><strong>Email:</strong> {{ userStore.userEmail }}</p>
          <p><strong>Display Name:</strong> {{ userStore.displayName }}</p>
        </div>
        <div v-else>
          <p>No user authenticated. Please sign in.</p>
          <v-form class="mt-4" @submit.prevent="handleSignIn">
            <v-text-field
              v-model="loginForm.email"
              label="Email"
              type="email"
              required
            />
            <v-text-field
              v-model="loginForm.password"
              label="Password"
              type="password"
              required
            />
            <v-btn type="submit" color="primary" :loading="isSigningIn">
              Sign In
            </v-btn>
            <p v-if="authError" class="error--text mt-2">{{ authError }}</p>
          </v-form>
        </div>
      </v-card-text>
    </v-card>

    <v-card v-if="userStore.isAuthenticated" class="pa-4 mb-4">
      <v-card-title>Test Form (Vuex Integrated)</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="handleSubmit">
          <v-text-field
            v-model="formData.displayName"
            label="Display Name"
            :error-messages="formErrors.displayName"
            @input="validateField('displayName')"
          />

          <v-text-field
            v-model="formData.bio"
            label="Bio"
            :error-messages="formErrors.bio"
            @input="validateField('bio')"
          />

          <v-select
            v-model="formData.favoriteColor"
            :items="['Red', 'Green', 'Blue', 'Yellow', 'Purple']"
            label="Favorite Color"
            :error-messages="formErrors.favoriteColor"
            @change="validateField('favoriteColor')"
          />

          <div class="d-flex mt-4">
            <v-btn type="submit" color="primary" :loading="isSubmitting" class="mr-2">
              Save Profile
            </v-btn>
            <v-btn color="secondary" @click="resetForm">
              Reset
            </v-btn>
          </div>

          <div v-if="savingStatus" class="mt-2">
            <v-alert :type="getSavingStatusType" dense>
              {{ getSavingStatusMessage }}
            </v-alert>
          </div>

          <div v-if="successMessage" class="mt-2">
            <v-alert type="success" dense>{{ successMessage }}</v-alert>
          </div>

          <div v-if="errorMessage" class="mt-2">
            <v-alert type="error" dense>{{ errorMessage }}</v-alert>
          </div>
        </v-form>
      </v-card-text>
    </v-card>

    <v-card v-if="userStore.isAuthenticated" class="pa-4">
      <v-card-title>VueFire Direct Integration Test</v-card-title>
      <v-card-text>
        <p v-if="profileLoading">Loading profile data...</p>
        <template v-else>
          <p><strong>Profile ID:</strong> {{ profileRef?.id || 'N/A' }}</p>
          <p><strong>Display Name (VueFire):</strong> {{ profile?.displayName || 'Not set' }}</p>
          <p><strong>Bio (VueFire):</strong> {{ profile?.bio || 'Not set' }}</p>
          <p><strong>Favorite Color (VueFire):</strong> {{ profile?.favoriteColor || 'Not set' }}</p>
          <p><strong>Last Updated:</strong> {{ profile?.updatedAt ? new Date(profile.updatedAt.toDate()).toLocaleString() : 'Never' }}</p>
        </template>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useNuxtApp } from '#app'
import { useFirebaseApp } from '~/composables/utils/useFirebaseApp'
import { useVuexForm } from '~/composables/forms/useVuexForm'
import { useDocument, useFirestore } from 'vuefire'
import { doc } from 'firebase/firestore'

// Get Vuex store
const { $store } = useNuxtApp()

// Create convenience store references
const userStore = {
  isAuthenticated: computed(() => $store.getters['user/isAuthenticated']),
  currentUser: computed(() => $store.getters['user/currentUser']),
  userEmail: computed(() => $store.getters['user/userEmail']),
  displayName: computed(() => $store.getters['user/displayName']),
  authError: computed(() => $store.getters['user/authError']),
}

// Firebase services
const { firestore } = useFirebaseApp()
const vueFirestore = useFirestore()

// Login form data
const loginForm = ref({
  email: '',
  password: '',
})
const isSigningIn = ref(false)
const authError = ref('')

// Get Firestore document reference for user profile
const userDocRef = computed(() => {
  const userId = userStore.currentUser.value?.uid
  if (!userId) return null
  return doc(firestore, 'userProfiles', userId)
})

// Set up direct VueFire binding to compare
const profileRef = computed(() => {
  const userId = userStore.currentUser.value?.uid
  if (!userId) return null
  return doc(vueFirestore, 'userProfiles', userId)
})

const { data: profile, pending: profileLoading } = useDocument(profileRef)

// Use Vuex form for profile
const {
  formData,
  formErrors,
  isSubmitting,
  successMessage,
  errorMessage,
  validateField,
  handleSubmit,
  resetForm,
  saveToFirestore,
  savingStatus,
} = useVuexForm({
  formId: 'profileTest',
  useFirestore: true,
  docRef: userDocRef.value,
  initialState: {
    displayName: '',
    bio: '',
    favoriteColor: '',
  },
  validationRules: {
    displayName: (value) => !!value || 'Display name is required',
    bio: (value) => value.length <= 200 || 'Bio must be 200 characters or less',
  },
  transformBeforeSave: (data) => ({
    ...data,
    lastSaved: new Date().toISOString(),
  }),
})

// Format saving status for UI
const getSavingStatusType = computed(() => {
  switch (savingStatus.value) {
    case 'saving': return 'info'
    case 'saved': return 'success'
    case 'error': return 'error'
    default: return 'warning'
  }
})

const getSavingStatusMessage = computed(() => {
  switch (savingStatus.value) {
    case 'saving': return 'Saving changes...'
    case 'saved': return 'Changes saved successfully'
    case 'error': return 'Error saving changes'
    case 'unsaved': return 'Changes have not been saved yet'
    default: return 'Form state: ' + savingStatus.value
  }
})

// Authentication methods
const handleSignIn = async () => {
  isSigningIn.value = true
  authError.value = ''

  try {
    const { email, password } = loginForm.value
    const result = await $store.dispatch('user/signIn', { email, password })

    if (!result.success) {
      authError.value = result.message || 'Sign in failed'
    }
  } catch (error) {
    console.error('Error signing in:', error)
    authError.value = error.message || 'An error occurred during sign in'
  } finally {
    isSigningIn.value = false
  }
}

// When component mounts, check if user is authenticated and load profile
onMounted(async () => {
  if (userStore.isAuthenticated.value && userDocRef.value) {
    // Load profile data from Firestore
    await saveToFirestore()
  }
})
</script>

<style scoped>
.vuex-form-test {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
}
</style>