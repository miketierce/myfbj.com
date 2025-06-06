<template>
  <v-container class="pa-4" max-width="600">
    <v-card>
      <v-card-title>Contact Us</v-card-title>
      <v-card-text>
        <v-form ref="formRef" @submit.prevent="submitForm">
          <v-text-field
            v-model="form.name"
            label="Name"
            required
          />
          <v-text-field
            v-model="form.email"
            label="Email"
            type="email"
            required
          />
          <v-textarea
            v-model="form.message"
            label="Message"
            rows="5"
            required
          />
          <v-btn
            type="submit"
            color="primary"
            class="mt-4"
            :loading="isSubmitting"
            :disabled="isSubmitting || (!recaptchaInitialized && isClient)"
          >
            Send Message
          </v-btn>

          <v-alert
            v-if="recaptchaPluginError && isClient"
            type="warning"
            class="mt-4"
            variant="tonal"
            density="compact"
          >
            {{ recaptchaPluginError }}
          </v-alert>
        </v-form>
        <v-alert
          v-if="submitted"
          type="success"
          class="mt-4"
        >
          Your message has been sent!
        </v-alert>
        <v-alert
          v-if="error"
          type="error"
          class="mt-4"
        >
          {{ error }}
        </v-alert>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useReCaptcha } from 'vue-recaptcha-v3'

// Check if we're on client-side
const isClient = import.meta.client || (typeof window !== 'undefined')

// Access plugin provided values
const { $recaptchaReady, $recaptchaError } = useNuxtApp()

// Initialize state variables
const form = ref({
  name: '',
  email: '',
  message: ''
})
const formRef = ref(null)
const submitted = ref(false)
const isSubmitting = ref(false)
const error = ref(null)
const recaptchaInitialized = ref(false)
const recaptchaPluginError = ref($recaptchaError || null)

// Only set up reCAPTCHA on client-side
let executeRecaptcha = null

// Initialize reCAPTCHA when mounted (client-side only)
onMounted(() => {
  if (!isClient) return

  // If plugin indicated reCAPTCHA is ready, try to initialize it
  if ($recaptchaReady) {
    initializeRecaptcha()
  } else {
    recaptchaPluginError.value = $recaptchaError || 'reCAPTCHA could not be initialized'
  }
})

// Function to initialize reCAPTCHA
function initializeRecaptcha() {
  try {
    const reCaptcha = useReCaptcha()

    if (reCaptcha && reCaptcha.executeRecaptcha) {
      executeRecaptcha = reCaptcha.executeRecaptcha
      recaptchaInitialized.value = true
      recaptchaPluginError.value = null
    } else {
      recaptchaPluginError.value = 'reCAPTCHA API not available'
    }
  } catch (err) {
    console.error('Error initializing reCAPTCHA:', err)
    recaptchaPluginError.value = 'Failed to initialize reCAPTCHA'
  }
}

async function submitForm() {
  try {
    error.value = null

    // Simple validation
    if (!form.value.name || !form.value.email || !form.value.message) {
      error.value = 'Please fill out all required fields'
      return
    }

    isSubmitting.value = true

    // Check if reCAPTCHA is available
    if (!executeRecaptcha) {
      error.value = 'reCAPTCHA is not available. Please refresh and try again.'
      isSubmitting.value = false
      return
    }

    // Get reCAPTCHA token
    const token = await executeRecaptcha('contact_form')

    // Submit form with token
    const response = await $fetch('/api/submit-contact-form', {
      method: 'POST',
      body: {
        ...form.value,
        recaptchaToken: token
      }
    })

    if (response.success) {
      submitted.value = true
      form.value = { name: '', email: '', message: '' }
    } else {
      error.value = response.error || 'Failed to submit form. Please try again.'
    }
  } catch (err) {
    console.error('Form submission error:', err)
    error.value = 'An error occurred while submitting the form. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>
