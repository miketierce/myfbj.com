<template>
  <div class="vuex-form-test">
    <h2>Vuex Form Integration Test</h2>

    <v-card class="pa-4 mb-4">
      <v-card-title>User Information</v-card-title>
      <v-card-text>
        <div v-if="isUserAuthenticated">
          <p><strong>User ID:</strong> {{ currentUser?.uid }}</p>
          <p><strong>Email:</strong> {{ currentUser?.email }}</p>
          <p><strong>Display Name:</strong> {{ currentUser?.displayName }}</p>
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

    <v-alert v-if="firestoreError" type="warning" class="mb-4">
      <strong>Firestore Access Error:</strong> {{ firestoreError }}
      <p class="mt-2">Using local form state instead. This is expected in test environments without proper Firestore permissions.</p>
    </v-alert>

    <v-card class="pa-4 mb-4">
      <v-card-title>Test Form (Vuex Integration)</v-card-title>
      <v-card-subtitle>
        This form demonstrates loading and saving data with Vuex integration using the unified form system
      </v-card-subtitle>

      <v-card-text>
        <div v-if="isLoading" class="text-center py-4">
          <v-progress-circular indeterminate color="primary"/>
          <p class="mt-2">Loading form data...</p>
        </div>

        <v-form v-else @submit.prevent="handleSubmit">
          <v-text-field
            v-model="formData.title"
            label="Title"
            :error-messages="formErrors.title"
            @input="validateField('title')"
          />

          <v-textarea
            v-model="formData.description"
            label="Description"
            :error-messages="formErrors.description"
            @input="validateField('description')"
          />

          <v-select
            v-model="formData.priority"
            :items="['low', 'medium', 'high']"
            label="Priority"
            :error-messages="formErrors.priority"
          />

          <div class="d-flex mt-4">
            <v-btn type="submit" color="primary" :loading="isSubmitting" class="mr-2">
              Submit Form
            </v-btn>
            <v-btn color="secondary" @click="resetForm">
              Reset
            </v-btn>
          </div>

          <div v-if="savingStatus?.value" class="mt-2">
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

    <v-card class="pa-4">
      <v-card-title>Form Data in Vuex Store</v-card-title>
      <v-card-text>
        <pre class="code-block">{{ JSON.stringify(storeFormData, null, 2) }}</pre>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUnifiedForm } from '~/composables/forms'
import { useNuxtApp } from '#app'

// Get Vuex store
const { $store } = useNuxtApp()

// User authentication state
const currentUser = computed(() => $store.state.user?.currentUser || null)
const isUserAuthenticated = computed(() => !!currentUser.value)
const loginForm = ref({ email: '', password: '' })
const isSigningIn = ref(false)
const authError = ref('')

// Flag for loading state and errors
const isLoading = ref(true)
const firestoreError = ref('')

// Used for comparison in UI to show what's in the Vuex store
const storeFormData = computed(() => {
  return $store.state.forms.formData['vuexDemoForm'] || {}
})

// Create form without Firestore integration first
const {
  formData,
  formErrors,
  isSubmitting,
  successMessage,
  errorMessage,
  validateField,
  validateAllFields,
  handleSubmit,
  resetForm,
  updateField,
  updateFields,
  // The following props might be undefined since we're not using Firestore initially
  saveToFirestore,
  savingStatus,
  isPendingSave,
} = useUnifiedForm({
  formId: 'vuexDemoForm',
  mode: 'vuex',  // Explicitly use Vuex mode
  initialState: {
    title: '',
    description: '',
    priority: 'medium',
    category: '',
    completed: false,
    tags: [],
  },
  validationRules: {
    title: (value) => !!value || 'Title is required',
    description: (value) => value.length <= 500 || 'Description must be 500 characters or less',
  },
})

// Simulate loading state
onMounted(() => {
  // Simulate a loading delay then set initial data
  setTimeout(() => {
    isLoading.value = false

    // Set some initial data for testing
    updateFields({
      title: 'Test Task',
      description: 'This is a sample task for testing the Vuex form integration.',
      priority: 'medium',
    })

    // Clear any previous form errors/messages
    $store.commit('forms/SET_FORM_ERRORS', {})
    $store.commit('forms/SET_ERROR_MESSAGE', null)
    $store.commit('forms/SET_SUCCESS_MESSAGE', null)
  }, 1000)
})

// Helper method to show status messages
const getSavingStatusType = computed(() => {
  if (savingStatus?.value) {
    switch (savingStatus.value) {
      case 'saving': return 'info'
      case 'saved': return 'success'
      case 'error': return 'error'
      default: return 'warning'
    }
  }
  return 'info'
})

const getSavingStatusMessage = computed(() => {
  if (savingStatus?.value) {
    switch (savingStatus.value) {
      case 'saving': return 'Saving changes...'
      case 'saved': return 'Changes saved successfully'
      case 'error': return 'Error saving changes'
      case 'unsaved': return 'Changes have not been saved yet'
      default: return 'Form state: ' + savingStatus.value
    }
  }
  return 'Form ready'
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
</script>

<style scoped>
.vuex-form-test {
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