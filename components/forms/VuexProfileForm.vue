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

        <!-- Avatar upload with image compression -->
        <v-col cols="12">
          <div class="d-flex flex-column align-center mb-4">
            <v-avatar size="120" class="mb-3">
              <v-img v-if="avatarPreview" :src="avatarPreview" />
              <v-icon v-else size="48">mdi-account</v-icon>
            </v-avatar>

            <v-btn
              variant="outlined"
              prepend-icon="mdi-camera"
              @click="triggerFileInput"
              :loading="isCompressing"
            >
              Change Profile Photo
            </v-btn>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="d-none"
              @change="handleFileUpload"
            />
            <div v-if="compressionError" class="text-error mt-2">{{ compressionError }}</div>
          </div>
        </v-col>
      </v-row>

      <!-- Save indicator for Firestore mode -->
      <v-fade-transition>
        <div class="form-save-status my-2">
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
import { onMounted, ref, computed } from 'vue'
import { useStore } from 'vuex'
import { doc } from 'firebase/firestore'
import { useUnifiedForm } from '~/composables/forms'
import { useImageCompression } from '~/composables/utils/useImageCompression'
import { useFirebaseApp } from '~/composables/utils/useFirebaseApp'
import BaseForm from '~/components/forms/BaseForm.vue'

// Get Vuex store
const store = useStore()

// Get Firebase services from our unified utility
const { auth, firestore } = useFirebaseApp()

// Get current user ID
const userId = computed(() => store.getters['user/currentUser']?.uid || '')

// Define Firestore document reference
const userDocRef = computed(() => {
  if (!userId.value || !firestore) return null
  return doc(firestore, 'users', userId.value)
})

// Setup image compression
const { processProfileImage, isCompressing, error: compressionError } = useImageCompression()
const fileInput = ref<HTMLInputElement | null>(null)
const avatarPreview = ref<string | null>(null)

// Initialize the profile form using our unified form system with Vuex mode
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
  saveToFirestore,
  savingStatus
} = useUnifiedForm({
  mode: 'vuex',
  formId: 'vuex-profile',
  initialState: {
    displayName: store.getters['user/displayName'] || '',
    email: store.getters['user/userEmail'] || '',
    bio: '',
    notificationsEnabled: true,
    photoURL: store.getters['user/userPhotoURL'] || ''
  },
  validationRules: {
    displayName: (value) => !!value || 'Display name is required',
    bio: (value) => !value || value.length <= 500 || 'Bio must be 500 characters or less'
  },
  // Use Firestore for persistence
  docRef: userDocRef.value,
  createIfNotExists: true,
  // Transform data before saving to add timestamp
  transformBeforeSave: (data) => ({
    ...data,
    lastUpdated: new Date().toISOString()
  }),
  // Custom submit handler to update Vuex store after successful submission
  submitHandler: async (data) => {
    try {
      // Save to Firestore first
      const result = await saveToFirestore()

      if (result) {
        // Then update the user profile in Vuex store
        await store.dispatch('user/updateUserProfile', {
          displayName: data.displayName,
          bio: data.bio,
          photoURL: data.photoURL,
          notificationsEnabled: data.notificationsEnabled
        })

        return {
          success: true,
          message: 'Profile updated successfully!'
        }
      }

      return {
        success: false,
        message: 'Failed to save profile'
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'An error occurred'
      }
    }
  }
})

// Trigger file input click
const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

// Handle file upload with image compression
const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    // Process and compress the image
    const compressedFile = await processProfileImage(file)
    if (compressedFile) {
      // Create a preview
      avatarPreview.value = URL.createObjectURL(compressedFile)

      // Update form data with the new image
      updateField('photoURL', avatarPreview.value)

      // In a real application, you would upload to Firebase Storage
      // and then set the download URL in formData
      // For this example, we'll just use the local preview

      // Save changes to Firestore
      await saveToFirestore()
    }
  } catch (error) {
    console.error('Error processing image:', error)
  }

  // Reset the file input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Load existing user data on component mount
onMounted(async () => {
  // Check if user is authenticated
  const currentUser = store.getters['user/currentUser']
  const userProfile = store.getters['user/userProfile']

  if (currentUser) {
    // Update form data with user profile information
    updateFields({
      email: currentUser.email || '',
      displayName: currentUser.displayName || '',
      bio: userProfile?.bio || '',
      notificationsEnabled: userProfile?.notificationsEnabled !== false
    })

    // If user has a profile image, set the preview
    if (currentUser.photoURL) {
      avatarPreview.value = currentUser.photoURL
      updateField('photoURL', currentUser.photoURL)
    }
  }
})
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