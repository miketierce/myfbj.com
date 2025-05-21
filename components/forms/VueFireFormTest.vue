<template>
  <div class="vuefire-form-test">
    <h2>VueFire Form Integration Test</h2>

    <v-card class="pa-4 mb-4">
      <v-card-title>User Information</v-card-title>
      <v-card-text>
        <div v-if="isAuthenticated">
          <p><strong>User ID:</strong> {{ user?.uid }}</p>
          <p><strong>Email:</strong> {{ user?.email }}</p>
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

    <v-card v-if="isAuthenticated" class="pa-4 mb-4">
      <v-card-title>Test Form (VueFire Integration)</v-card-title>
      <v-card-subtitle>
        This form demonstrates loading and saving data with VueFire integration
      </v-card-subtitle>

      <v-card-text>
        <div v-if="isLoading" class="text-center py-4">
          <v-progress-circular indeterminate color="primary"/>
          <p class="mt-2">Loading profile data...</p>
        </div>

        <v-form v-else @submit.prevent="handleSubmit">
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
            <v-btn color="secondary" class="mr-2" @click="resetForm">
              Reset
            </v-btn>
            <v-btn color="info" :disabled="!isDirty" @click="saveToFirestore">
              Save Changes
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

          <div v-if="isDirty" class="mt-2">
            <p><strong>Changed fields:</strong> {{ changedFields.join(', ') }}</p>
          </div>
        </v-form>
      </v-card-text>
    </v-card>

    <v-card v-if="isAuthenticated" class="pa-4">
      <v-card-title>Raw Firestore Data</v-card-title>
      <v-card-text>
        <pre class="code-block">{{ JSON.stringify(rawData, null, 2) }}</pre>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useVueFireForm } from '~/composables/forms/useVueFireForm'
import { useFirestore, useDocument } from 'vuefire'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc } from 'firebase/firestore'
import { useFirebaseApp } from '~/composables/utils/useFirebaseApp'

// Get Firebase services
const { auth } = useFirebaseApp()
const firestore = useFirestore()
const user = computed(() => auth.currentUser)
const isAuthenticated = computed(() => !!user.value)

// Login form data
const loginForm = ref({
  email: '',
  password: '',
})
const isSigningIn = ref(false)
const authError = ref('')

// Document reference for the user's profile
const userDocRef = computed(() => {
  if (!user.value) return null
  return doc(firestore, 'userProfiles', user.value.uid)
})

// Get raw data for display comparison
const { data: rawData } = useDocument(userDocRef)

// Use our VueFire Form
const {
  formData,
  formErrors,
  isSubmitting,
  isLoading,
  successMessage,
  errorMessage,
  validateField,
  handleSubmit,
  resetForm,
  saveToFirestore,
  savingStatus,
  isDirty,
  changedFields
} = useVueFireForm({
  formId: 'profileTest',
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
    updatedAt: new Date(),
  }),
  createIfNotExists: true,
  syncImmediately: false, // Only save on explicit actions
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
    await signInWithEmailAndPassword(auth, email, password)
  } catch (error) {
    console.error('Error signing in:', error)
    authError.value = error.message || 'An error occurred during sign in'
  } finally {
    isSigningIn.value = false
  }
}
</script>

<style scoped>
.vuefire-form-test {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
}
.code-block {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  max-height: 300px;
  overflow-y: auto;
}
</style>