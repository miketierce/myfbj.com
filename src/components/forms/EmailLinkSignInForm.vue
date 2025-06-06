<template>
  <v-card border rounded="lg" class="pa-4">
    <v-card-title>
      <div class="d-flex align-center justify-space-between mb-4">
        <div>
          <div class="text-h6 font-weight-medium">Complete Email Sign-in</div>
          <div class="text-body-2 text-medium-emphasis">Enter your email to finish the sign-in process</div>
        </div>
        <v-avatar
          color="primary"
          variant="tonal"
          rounded
          size="42"
        >
          <v-icon icon="fas fa-envelope" />
        </v-avatar>
      </div>
    </v-card-title>

    <v-card-text>
      <p class="mb-4">
        You clicked a sign-in link from your email, but we couldn't find your email address in this browser.
        Please enter the same email address you used to request the sign-in link.
      </p>

      <v-form @submit.prevent="handleSubmit">
        <v-text-field
          v-model="email"
          label="Email"
          type="email"
          placeholder="your@email.com"
          required
          :error-messages="emailError"
          variant="outlined"
        />

        <v-btn
          block
          color="primary"
          type="submit"
          :loading="isSubmitting"
          :disabled="!email || isSubmitting"
          class="mt-4"
        >
          Complete Sign-in
          <v-icon end>fas fa-sign-in-alt</v-icon>
        </v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref } from 'vue';
import { useAuth } from '~/composables/useAuth';

// Props for flexibility
const props = defineProps({
  redirectUrl: {
    type: String,
    default: '/profile'
  }
});

// Emits for parent component communication
const emit = defineEmits(['success', 'error']);

// Form state
const email = ref('');
const emailError = ref('');
const isSubmitting = ref(false);

// Access auth composable
const { completeSignInWithEmail, error: authError } = useAuth();

// Validate email format
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Handle form submission
const handleSubmit = async () => {
  // Reset errors
  emailError.value = '';

  // Validate email format
  if (!validateEmail(email.value)) {
    emailError.value = 'Please enter a valid email address';
    return;
  }

  // Set loading state
  isSubmitting.value = true;

  try {
    // Call the auth composable to complete sign-in
    const result = await completeSignInWithEmail(email.value);

    if (result) {
      // Success - emit event to parent
      emit('success', { message: 'Sign-in successful' });
    } else {
      // Error from auth composable
      emailError.value = authError.value || 'Sign-in failed. Please try again.';
      emit('error', { message: emailError.value });
    }
  } catch (err) {
    // Handle unexpected errors
    emailError.value = err.message || 'An unexpected error occurred';
    emit('error', { message: emailError.value });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
/* Optional component styling */
</style>