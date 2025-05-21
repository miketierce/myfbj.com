<script setup lang="ts">
const { signInAnonymousUser, isLoading, error, isFirebaseAvailable } = useAuth()
const router = useRouter()

const loginAnonymously = async () => {
  const success = await signInAnonymousUser()
  if (success) {
    router.push('/profile')
  }
}
</script>

<template>
  <div class="login-container">
    <h1>Welcome</h1>
    <p>Sign in to continue</p>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <ClientOnly>
      <template #default>
        <div v-if="!isFirebaseAvailable" class="error-message">
          Firebase authentication is not available. Check your environment variables and API keys.
        </div>

        <button
          :disabled="isLoading || !isFirebaseAvailable"
          class="login-btn"
          @click="loginAnonymously"
        >
          {{ isLoading ? 'Signing in...' : 'Continue as Guest' }}
        </button>
      </template>

      <!-- Fallback for server-side rendering -->
      <template #fallback>
        <div class="loading-btn">
          Loading authentication...
        </div>
      </template>
    </ClientOnly>

    <p class="info-text">
      You can add your email later to keep your account.
    </p>
  </div>
</template>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 100px auto;
  padding: 2rem;
  text-align: center;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.error-message {
  color: #e53935;
  margin: 1rem 0;
  padding: 0.5rem;
  background-color: #ffebee;
  border-radius: 4px;
}

.login-btn {
  width: 100%;
  padding: 12px;
  margin-top: 1rem;
  border: none;
  border-radius: 4px;
  background-color: #2196f3;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.login-btn:hover {
  background-color: #1976d2;
}

.login-btn:disabled {
  background-color: #bbdefb;
  cursor: not-allowed;
}

.loading-btn {
  width: 100%;
  padding: 12px;
  margin-top: 1rem;
  border: none;
  border-radius: 4px;
  background-color: #e0e0e0;
  color: #616161;
  font-weight: bold;
  text-align: center;
}

.info-text {
  margin-top: 1rem;
  color: #757575;
  font-size: 0.9rem;
}
</style>