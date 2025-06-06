<template>
  <v-form @submit.prevent="onSubmit">
    <slot
      :form-data="formData"
      :form-errors="formErrors"
      :is-submitting="isSubmitting"
      :is-submitted="isSubmitted"
      :has-errors="hasErrors"
      :is-valid="isValid"
    />

    <div v-if="successMessage" class="success-message mt-4">
      <v-alert
        type="success"
        variant="tonal"
        :text="successMessage"
        class="mb-4"
      />
    </div>

    <div v-if="errorMessage" class="error-message mt-4">
      <v-alert
        type="error"
        variant="tonal"
        :text="errorMessage"
        class="mb-4"
      />
    </div>

    <slot name="form-actions" :submit="onSubmit" :reset="resetForm" :submitting="isSubmitting">
      <div class="form-actions mt-4">
        <v-btn
          v-if="showResetButton"
          variant="outlined"
          class="mr-2"
          :disabled="isSubmitting"
          @click="resetForm"
        >
          {{ resetButtonText }}
        </v-btn>

        <v-btn
          type="submit"
          color="primary"
          :loading="isSubmitting"
          :disabled="disableSubmit && (!isValid || isSubmitting)"
        >
          {{ submitButtonText }}
        </v-btn>
      </div>
    </slot>
  </v-form>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'

const props = defineProps({
  formData: {
    type: Object,
    required: true
  },
  formErrors: {
    type: Object,
    default: () => ({})
  },
  isSubmitting: {
    type: Boolean,
    default: false
  },
  isSubmitted: {
    type: Boolean,
    default: false
  },
  successMessage: {
    type: String,
    default: ''
  },
  errorMessage: {
    type: String,
    default: ''
  },
  isValid: {
    type: Boolean,
    default: true
  },
  submitButtonText: {
    type: String,
    default: 'Submit'
  },
  resetButtonText: {
    type: String,
    default: 'Reset'
  },
  showResetButton: {
    type: Boolean,
    default: false
  },
  disableSubmit: {
    type: Boolean,
    default: true
  }
})

const emits = defineEmits(['submit', 'reset'])

const hasErrors = computed(() => {
  return Object.values(props.formErrors).some(error => error)
})

// Submit the form
const onSubmit = async () => {
  emits('submit', props.formData)
}

// Reset the form
const resetForm = () => {
  emits('reset')
}

// Watch for success or error messages and scroll to them
watch([
  () => props.successMessage,
  () => props.errorMessage
], ([newSuccessMessage, newErrorMessage]) => {
  if (newSuccessMessage || newErrorMessage) {
    // Auto-scroll to the message if it appears below the fold
    setTimeout(() => {
      const messageEl = document.querySelector('.success-message, .error-message')
      if (messageEl) {
        messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 100)
  }
})
</script>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
}
</style>