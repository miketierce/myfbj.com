<template>
  <BaseForm class="user-settings-form">
    <h2 class="text-h4 mb-4">User Settings</h2>

    <!-- Authentication status message -->
    <v-alert
      v-if="!isAuthenticated"
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

    <!-- Authentication error -->
    <div v-else-if="error" class="my-4">
      <v-alert type="error" variant="tonal">
        {{ error.message || 'Failed to load user settings' }}
      </v-alert>
    </div>

    <!-- Form contents (shown when authenticated and loaded) -->
    <div v-else>
      <!-- Display Name -->
      <v-text-field
        v-model="formData.displayName"
        label="Display Name"
        :error-messages="formErrors.displayName"
        :disabled="!isAuthenticated || isSubmitting"
        @blur="validateField('displayName')"
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
        :disabled="!isAuthenticated || isSubmitting"
        counter="500"
        max-length="500"
        @blur="validateField('bio')"
      />

      <!-- Theme Selector -->
      <v-select
        v-model="formData.theme"
        label="Theme"
        :items="['light', 'dark', 'auto']"
        :disabled="!isAuthenticated || isSubmitting"
      />

      <!-- Notification Toggle -->
      <v-switch
        v-model="formData.notificationsEnabled"
        label="Enable notifications"
        :disabled="!isAuthenticated || isSubmitting"
        color="primary"
      />

      <!-- UI Preferences Section -->
      <v-expansion-panels variant="accordion" class="mt-4">
        <v-expansion-panel title="UI Preferences">
          <v-expansion-panel-text>
            <!-- Font Size -->
            <v-radio-group
              v-model="formData.uiPreferences.fontSize"
              label="Font Size"
              :disabled="!isAuthenticated || isSubmitting"
              inline
            >
              <v-radio label="Small" value="small" />
              <v-radio label="Medium" value="medium" />
              <v-radio label="Large" value="large" />
            </v-radio-group>

            <!-- Compact View -->
            <v-switch
              v-model="formData.uiPreferences.compactView"
              label="Compact View"
              :disabled="!isAuthenticated || isSubmitting"
              color="primary"
            />

            <!-- Sidebar Expanded -->
            <v-switch
              v-model="formData.uiPreferences.sidebarExpanded"
              label="Sidebar Expanded"
              :disabled="!isAuthenticated || isSubmitting"
              color="primary"
            />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- Form Actions -->
      <div class="d-flex justify-space-between align-center mt-6">
        <div>
          <!-- Form status -->
          <v-chip
            v-if="successMessage"
            color="success"
            variant="tonal"
            size="small"
            class="mr-2"
          >
            {{ successMessage }}
          </v-chip>
          <v-chip
            v-if="errorMessage"
            color="error"
            variant="tonal"
            size="small"
            class="mr-2"
          >
            {{ errorMessage }}
          </v-chip>
          <v-chip
            v-else-if="isDirty && !isSubmitting"
            color="warning"
            variant="tonal"
            size="small"
          >
            Unsaved changes
          </v-chip>
          <v-chip
            v-else-if="lastSaveTime && !isDirty"
            color="info"
            variant="tonal"
            size="small"
          >
            Saved {{ formatSaveTime(lastSaveTime) }}
          </v-chip>
        </div>

        <div class="d-flex">
          <v-btn
            color="secondary"
            variant="tonal"
            :disabled="!isAuthenticated || !isDirty || isSubmitting"
            @click="resetForm"
            class="mr-2"
          >
            Reset
          </v-btn>
          <v-btn
            color="primary"
            :loading="isSubmitting"
            :disabled="!isAuthenticated || !isValid || !isDirty"
            @click="saveSettings"
          >
            Save Settings
          </v-btn>
        </div>
      </div>
    </div>
  </BaseForm>
</template>

<script setup lang="ts">
import { useVueFireUserSettingsForm } from '~/composables/forms/useVueFireUserSettingsForm'

// Format save time as "2 minutes ago" etc.
function formatSaveTime(timestamp: number): string {
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

// Initialize the form with VueFire integration
const {
  formData,
  formErrors,
  isSubmitting,
  isValid,
  isDirty,
  isLoading,
  error,
  successMessage,
  errorMessage,
  isAuthenticated,
  lastSaveTime,
  validateField,
  resetForm,
  saveSettings,
} = useVueFireUserSettingsForm({
  syncImmediately: true,
  debounceTime: 1000,
})
</script>

<style scoped>
.user-settings-form {
  max-width: 800px;
  margin: 0 auto;
}
</style>