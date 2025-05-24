<template>
  <BaseForm
    class="user-settings-form"
    :form-data="formData"
    :form-errors="formErrors"
    :is-submitting="isSubmitting"
    :is-valid="isValid"
    :success-message="successMessage"
    :error-message="errorMessage"
    submit-button-text="Save Settings"
    :show-reset-button="isDirty"
    reset-button-text="Reset"
    @submit="saveSettings"
    @reset="resetForm"
  >
    <template #default>
      <div class="my-6"/>

      <!-- Authentication status message -->
      <v-alert
        v-if="!isUserAvailable"
        type="warning"
        class="mb-4"
        text="You must be signed in to manage your settings"
        variant="tonal"
      />

      <!-- Loading indicator -->
      <div v-if="isLoading" class="d-flex justify-center my-4">
        <v-progress-circular indeterminate color="primary" />
        <span class="ml-3">Loading user settings...</span>
      </div>

      <!-- Form error -->
      <div v-else-if="errorMessage" class="my-4">
        <v-alert type="error" variant="tonal">
          {{ errorMessage }}
        </v-alert>
      </div>

      <!-- Form contents (shown when authenticated and loaded) -->
      <div v-else>
        <!-- Display Name -->
        <v-text-field
          v-model="formData.displayName"
          label="Display Name"
          :error-messages="formErrors.displayName"
          :disabled="!isUserAvailable || isSubmitting"
          @blur="validateField('displayName')"
          @update:model-value="onFieldUpdate('displayName')"
        />

        <!-- Email (read-only) -->
        <v-text-field
          v-model="formData.email"
          label="Email"
          disabled
          hint="Email can only be changed in account settings"
          persistent-hint
        />

        <!-- Bio -->
        <v-textarea
          v-model="formData.bio"
          label="Bio"
          :error-messages="formErrors.bio"
          :disabled="!isUserAvailable || isSubmitting"
          counter="500"
          max-length="500"
          @blur="validateField('bio')"
          @update:model-value="onFieldUpdate('bio')"
        />

        <!-- Notification Toggle -->
        <v-switch
          v-model="formData.notificationsEnabled"
          label="Enable notifications"
          :disabled="!isUserAvailable || isSubmitting"
          color="primary"
          @change="onFieldUpdate('notificationsEnabled')"
        />

        <!-- UI Preferences Section -->
        <v-expansion-panels variant="accordion" class="mt-4">
          <v-expansion-panel>
            <v-expansion-panel-title>
              UI Preferences
              <template #actions="{ expanded }">
                <v-icon :icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"/>
              </template>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <!-- Font Size -->
              <v-radio-group
                v-model="formData.uiPreferences.fontSize"
                label="Font Size"
                :disabled="!isUserAvailable || isSubmitting"
                inline
                @change="onFieldUpdate('uiPreferences')"
              >
                <v-radio label="Small" value="small" />
                <v-radio label="Medium" value="medium" />
                <v-radio label="Large" value="large" />
              </v-radio-group>

              <!-- Compact View -->
              <v-switch
                v-model="formData.uiPreferences.compactView"
                label="Compact View"
                :disabled="!isUserAvailable || isSubmitting"
                color="primary"
                @change="onFieldUpdate('uiPreferences')"
              />

              <!-- Sidebar Expanded -->
              <v-switch
                v-model="formData.uiPreferences.sidebarExpanded"
                label="Sidebar Expanded"
                :disabled="!isUserAvailable || isSubmitting"
                color="primary"
                @change="onFieldUpdate('uiPreferences')"
              />
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
    </template>

    <template #form-actions="{ submit, reset, submitting }">
      <div class="d-flex justify-space-between align-center mt-6">
        <div>
          <!-- Form status -->
          <v-chip
            v-if="lastSaveTime && !isDirty"
            color="info"
            variant="tonal"
            size="small"
          >
            Last saved {{ formatSaveTime(lastSaveTime) }}
          </v-chip>
          <v-chip
            v-else-if="isDirty && !isSubmitting"
            color="warning"
            variant="tonal"
            size="small"
          >
            Unsaved changes
          </v-chip>
        </div>

        <div class="d-flex">
          <v-btn
            color="secondary"
            variant="tonal"
            :disabled="!isUserAvailable || !isDirty || isSubmitting"
            class="mr-2"
            @click="reset"
          >
            Reset
          </v-btn>
          <v-btn
            color="primary"
            :loading="submitting"
            :disabled="!isUserAvailable || !isValid || !isDirty"
            @click="submit"
          >
            Save Settings
          </v-btn>
        </div>
      </div>
    </template>
  </BaseForm>
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue'
import type { Ref } from 'vue'
import { useUserSettingsForm } from '~/composables/forms/useUserSettingsForm'
import BaseForm from '~/components/forms/BaseForm.vue'

// Use the existing user settings form composable
const {
  formData,
  formErrors,
  isSubmitting,
  isValid,
  successMessage,
  errorMessage,
  validateField,
  resetForm,
  isDirty,
  isLoading,
  isUserAvailable,
  lastSaveTime,
  saveSettings,
  changedFields = []
} = useUserSettingsForm({
  initialSync: true,
  syncImmediately: true,
  debounceTime: 1000
})

// Format save time as "2 minutes ago" etc.
function formatSaveTime(timestamp) {
  if (!timestamp) return 'never'

  const now = Date.now()
  const diff = now - timestamp

  // Less than a minute
  if (diff < 60 * 1000) {
    return 'just now'
  }

  // Minutes
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  }

  // Hours
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }

  // Days
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  return `${days} day${days > 1 ? 's' : ''} ago`
}

// Handle field updates
function onFieldUpdate(field) {
  // No need for special handling as useUserSettingsForm already handles the updates
  // This function exists to allow for future enhancements if needed
}

// Set up the form when the component is mounted
onMounted(() => {
  if (isUserAvailable) {
    console.log('Form is ready - user is available')
  } else {
    console.log('User not available - form will initialize when user signs in')
  }

  // Force re-evaluation to prevent hydration mismatch with theme
  nextTick(() => {
    console.log('Settings form rehydrated after initial render')
  })
})
</script>

<style scoped>
.user-settings-form {
  max-width: 800px;
  margin: 0 auto;
}
</style>