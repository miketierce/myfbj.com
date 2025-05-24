<template>
  <BaseForm
    :form-data="formData"
    :form-errors="formErrors"
    :is-submitting="isSubmitting"
    :is-valid="isValid"
    :success-message="successMessage"
    :error-message="errorMessage"
    submit-button-text="Update Profile"
    @submit="handleSubmit"
    @reset="resetForm"
  >
    <template #default="{ formData }">
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="formData.displayName"
            label="Display Name"
            placeholder="How should we call you?"
            variant="outlined"
            density="comfortable"
            :error-messages="formErrors.displayName"
            @input="validateField('displayName')"
          />
        </v-col>

        <v-col cols="12" md="6">
          <v-text-field
            v-model="formData.email"
            label="Email"
            type="email"
            readonly
            variant="outlined"
            density="comfortable"
          />
        </v-col>

        <v-col cols="12">
          <v-textarea
            v-model="formData.bio"
            label="Bio"
            placeholder="Tell us about yourself..."
            variant="outlined"
            rows="4"
            :error-messages="formErrors.bio"
            @input="validateField('bio')"
          />
        </v-col>

        <v-col cols="12">
          <v-switch
            v-model="formData.notificationsEnabled"
            label="Enable notifications"
            color="primary"
          />
        </v-col>
      </v-row>

      <!-- Save indicator -->
      <v-fade-transition>
        <div v-if="isFirestoreMode" class="form-save-status my-2">
          <v-icon v-if="savingStatus === 'saving'" color="primary" class="animate-pulse">mdi-loading</v-icon>
          <v-icon v-else-if="savingStatus === 'pending'" color="warning">mdi-clock-outline</v-icon>
          <v-icon v-else-if="savingStatus === 'unsaved'" color="error">mdi-content-save-alert-outline</v-icon>
          <v-icon v-else-if="savingStatus === 'saved'" color="success">mdi-check-circle</v-icon>

          <span class="ml-2 text-caption">
            <template v-if="savingStatus === 'saving'">Saving changes...</template>
            <template v-else-if="savingStatus === 'pending'">Changes pending...</template>
            <template v-else-if="savingStatus === 'unsaved'">Unsaved changes</template>
            <template v-else-if="savingStatus === 'saved'">All changes saved</template>
          </span>
        </div>
      </v-fade-transition>
    </template>
  </BaseForm>
</template>

<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import { useUnifiedForm } from '~/composables/forms'
import { useAuth } from '~/composables/useAuth'
import { doc } from 'firebase/firestore'
import { useFirebaseApp } from '~/composables/utils/useFirebaseApp'
import BaseForm from '~/components/forms/BaseForm.vue'

// Get authentication and Firestore
const { user } = useAuth()
const { firestore } = useFirebaseApp()

// Document reference for profile
const profileDocRef = computed(() => {
  if (!user.value?.uid) return null
  // Use the appropriate collection based on whether the user is anonymous or not
  const collection = user.value.isAnonymous ? 'anonUsers' : 'users'
  return doc(firestore, collection, user.value.uid)
})

// Initial state
const initialState = {
  displayName: '',
  email: '',
  bio: '',
  notificationsEnabled: false,
  createdAt: null,
  updatedAt: null
}

// Validation rules
const validationRules = {
  displayName: (value: string) => !!value || 'Display name is required',
  bio: (value: string) => value.length <= 500 || 'Bio must be 500 characters or less'
}

// Transform before saving (add timestamps)
const transformBeforeSave = (data: any) => ({
  ...data,
  updatedAt: new Date()
})

// Use the unified form with reactive document reference
const {
  formData,
  formErrors,
  isSubmitting,
  isValid,
  successMessage,
  errorMessage,
  validateField,
  resetForm,
  handleSubmit,
  updateField,
  updateFields,
  // Firestore specific features
  isPendingSave,
  savingStatus,
  saveToFirestore,
  markFieldDirty
} = useUnifiedForm({
  mode: 'firestore',
  initialState,
  validationRules,
  // Use a computed for docRef to ensure reactivity
  get docRef() { return profileDocRef.value },
  createIfNotExists: true,
  transformBeforeSave,
  syncImmediately: true,
  debounceTime: 1000
})

// Flag to track if form is initialized
const formInitialized = ref(false)

// Use a safer pattern for watching - initialize after mount with a delay
onMounted(() => {
  // Mark the form as initialized after a short delay to ensure reactivity setup is complete
  setTimeout(() => {
    formInitialized.value = true
  }, 200)
})

// Define safe watchers with null/undefined checks using computed properties
const displayNameWatcher = computed(() => formData?.displayName)
watch(displayNameWatcher, (newVal) => {
  if (formInitialized.value && newVal !== undefined) {
    markFieldDirty('displayName')
  }
})

const bioWatcher = computed(() => formData?.bio)
watch(bioWatcher, (newVal) => {
  if (formInitialized.value && newVal !== undefined) {
    markFieldDirty('bio')
  }
})

const notificationsWatcher = computed(() => formData?.notificationsEnabled)
watch(notificationsWatcher, (newVal) => {
  if (formInitialized.value && newVal !== undefined) {
    markFieldDirty('notificationsEnabled')
  }
})

// For debugging - log when form changes are pending save
watch(() => isPendingSave.value, (newVal) => {
  if (newVal && formInitialized.value) {
    console.log('Form changes pending save')
  }
})

// Pre-populate with user data when available
watch(user, (newUser) => {
  if (newUser) {
    updateFields({
      displayName: newUser.displayName || '',
      email: newUser.email || ''
    })
  }
}, { immediate: true })

// Define whether we're in Firestore mode (for UI indicators)
const isFirestoreMode = computed(() => !!profileDocRef.value)
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.form-save-status {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
}
</style>