<template>
  <div class="vuefire-form-test">
    <h2>VueFire Form Integration Test</h2>

    <v-card class="pa-4 mb-4">
      <v-card-title>User Information</v-card-title>
      <v-card-text>
        <div v-if="isAuthenticated">
          <p><strong>User ID:</strong> {{ user?.uid }}</p>
          <p><strong>Email:</strong> {{ user?.email }}</p>
          <p><strong>Auth Status:</strong> {{ user?.isAnonymous ? 'Anonymous' : 'Authenticated' }}</p>
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
        This form demonstrates loading and saving data with VueFire integration using the unified form system
      </v-card-subtitle>

      <v-card-text>
        <div v-if="isLoading" class="text-center py-4">
          <v-progress-circular indeterminate color="primary"/>
          <p class="mt-2">Loading profile data...</p>
        </div>

        <div v-else-if="permissionsError" class="my-4">
          <v-alert type="warning" border="left" colored-border icon="mdi-alert">
            <strong>Permission Error:</strong> You don't have permission to access this document.
            Make sure you have proper Firebase security rules in place.

            <div class="mt-2">
              <code>{{ permissionsError }}</code>
            </div>

            <div class="mt-2">
              <v-btn color="primary" small @click="recreateForm">
                Retry
              </v-btn>
            </div>
          </v-alert>
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
import { ref, computed, watch, onMounted } from 'vue'
// Replace useVueFireForm with useUnifiedForm
import { useUnifiedForm } from '~/composables/forms'
import { useDocument } from 'vuefire'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc } from 'firebase/firestore'
import { useFirebaseApp } from '~/composables/utils/useFirebaseApp'

// Get Firebase services
const { auth, firestore } = useFirebaseApp()
const user = computed(() => auth.currentUser)
const isAuthenticated = computed(() => !!user.value)
const permissionsError = ref(null)

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

  // Check if user is anonymous - you may need different collections for different user types
  const collectionName = user.value.isAnonymous ? 'anonymousProfiles' : 'users'

  return doc(firestore, collectionName, user.value.uid)
})

// Get raw data for display comparison
const { data: rawData, error: rawDataError } = useDocument(userDocRef)

// Watch for raw data errors (which may occur before the form is created)
watch(rawDataError, (newError) => {
  if (newError) {
    console.error('Raw data error:', newError)
    permissionsError.value = newError.message
  }
})

// Create the form reference and state holder
const formController = ref(null)

// Function to create/recreate the form
const createForm = () => {
  permissionsError.value = null

  // Only create the form if we have a valid user and document reference
  if (!user.value || !userDocRef.value) {
    return null
  }

  try {
    return useUnifiedForm({
      formId: 'profileTest',
      mode: 'vuefire', // Explicitly setting mode to vuefire
      docRef: userDocRef.value,
      initialState: {
        displayName: user.value.displayName || '',
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
    })
  } catch (error) {
    console.error('Error creating form:', error)
    permissionsError.value = error.message
    return null
  }
}

// Public function to recreate the form (useful for retrying after errors)
const recreateForm = () => {
  formController.value = createForm()
}

// Initialize the form
onMounted(() => {
  if (isAuthenticated.value) {
    formController.value = createForm()
  }
})

// Watch for authentication changes
watch(user, (newUser) => {
  if (newUser) {
    // User has logged in or changed, recreate the form
    recreateForm()
  } else {
    // User has logged out, reset everything
    formController.value = null
    permissionsError.value = null
  }
})

// Expose form methods and properties with default values for when the form is not yet created
const formData = computed(() => formController.value?.formData || {})
const formErrors = computed(() => formController.value?.formErrors || {})
const isSubmitting = computed(() => formController.value?.isSubmitting?.value || false)
const isLoading = computed(() => formController.value?.isLoading?.value || false)
const successMessage = computed(() => formController.value?.successMessage?.value || '')
const errorMessage = computed(() => formController.value?.errorMessage?.value || '')
const isDirty = computed(() => formController.value?.isDirty?.value || false)
const savingStatus = computed(() => formController.value?.savingStatus?.value || null)
const changedFields = computed(() => formController.value?.changedFields || [])

// Method proxies
const validateField = (field) => formController.value?.validateField(field)
const handleSubmit = () => formController.value?.handleSubmit()
const resetForm = () => formController.value?.resetForm()
const saveToFirestore = () => formController.value?.saveToFirestore()

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
  permissionsError.value = null

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