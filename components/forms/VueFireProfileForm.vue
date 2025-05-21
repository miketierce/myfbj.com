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
import { onMounted } from 'vue'
import { useVueFireProfileForm } from '~/composables/forms/useVueFireProfileForm'
import BaseForm from '~/components/forms/BaseForm.vue'

// Initialize the profile form using our VueFire composable
// This maintains the same behavior as the original ProfileForm but uses VueFire
const {
  formData,
  formErrors,
  isSubmitting,
  isValid,
  successMessage,
  errorMessage,
  handleSubmit,
  validateField,
  resetForm,
  loadUserData,
  isFirestoreMode,
  savingStatus
} = useVueFireProfileForm({
  useFirestore: true,         // Enable Firestore integration
  syncImmediately: true,      // Sync changes as they happen
  debounceTime: 1000          // 1 second debounce for text inputs
})

// Load existing user data on component mount
onMounted(async () => {
  await loadUserData()
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