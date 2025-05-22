<template>
  <v-app :theme="currentTheme" class="app-wrapper">
    <div class="app-layout">
      <header class="app-header">
        <div class="header-content">
          <!-- Logo placeholder on the left -->
          <div class="logo-container">
            <nuxt-link to="/">
              <div class="logo-placeholder">
                <span>LOGO</span>
              </div>
            </nuxt-link>
          </div>

          <div class="spacer"/>

          <!-- Right side actions -->
          <div class="actions">
            <!-- Theme toggle wrapped in ClientOnly -->
            <ClientOnly>
              <v-btn
                icon
                variant="text"
                :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
                @click="toggleTheme"
              >
                <i :class="isDark ? 'fas fa-sun' : 'fas fa-moon'" />
              </v-btn>
              <template #fallback>
                <!-- Fallback for SSR: a simple disabled button or placeholder -->
                <v-btn icon variant="text" title="Toggle theme" disabled>
                  <i class="fas fa-circle-notch" /> <!-- Placeholder icon -->
                </v-btn>
              </template>
            </ClientOnly>

            <!-- User menu -->
            <div class="user-menu">
              <!-- For authenticated users, direct navigation to profile -->
              <v-btn
                v-if="user && !user.isAnonymous"
                variant="outlined"
                class="user-btn"
                to="/profile"
              >
                <i class="fas fa-user mr-2"/>
                <span>Profile</span>
              </v-btn>

              <!-- For anonymous/unauthenticated users, keep dropdown menu -->
              <v-menu v-else v-model="userMenuOpen" :close-on-content-click="false">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    variant="outlined"
                    class="user-btn"
                  >
                    <i class="fas fa-user mr-2"/>
                    <span v-if="user && user.isAnonymous">
                      Setup Profile
                      <span class="notification-dot"/>
                    </span>
                    <span v-else>Login</span>
                  </v-btn>
                </template>

                <v-card min-width="300">
                  <v-card-title>
                    <template v-if="user && user.isAnonymous">Account Setup</template>
                    <template v-else>Login</template>
                  </v-card-title>

                  <v-card-text>
                    <!-- Show profile setup for anonymous users -->
                    <template v-if="user && user.isAnonymous">
                      <!-- Anonymous user info -->
                      <div class="user-info">
                        <div class="status-banner mb-3">
                          <v-chip color="warning" size="small">Temporary Account</v-chip>
                          <p class="mt-2">Complete your profile to save your progress</p>
                        </div>
                      </div>

                      <!-- Theme selection -->
                      <div class="theme-selector">
                        <v-select
                          v-model="currentTheme"
                          label="Theme"
                          :items="[
                            { title: 'Light', value: 'wireframe' },
                            { title: 'Dark', value: 'wireframeDark' }
                          ]"
                          variant="outlined"
                          density="compact"
                        />
                      </div>

                      <v-btn
                        block
                        color="primary"
                        class="mt-4"
                        to="/profile"
                      >
                        Setup Profile
                      </v-btn>

                      <v-btn
                        block
                        text
                        class="mt-2"
                        @click="userMenuOpen = false"
                      >
                        Continue as Guest
                      </v-btn>
                    </template>

                    <!-- Show login for non-users -->
                    <template v-else>
                      <!-- Login form -->
                      <p class="mb-4">
                        Enter your email to sign in or create an account:
                      </p>

                      <div v-if="error" class="error-message mb-2">{{ error }}</div>

                      <v-form @submit.prevent="handleLogin">
                        <v-text-field
                          v-model="email"
                          label="Email"
                          type="email"
                          required
                          variant="outlined"
                          density="compact"
                        />

                        <div class="theme-selector">
                          <v-select
                            v-model="currentTheme"
                            label="Theme"
                            :items="[
                              { title: 'Light', value: 'wireframe' },
                              { title: 'Dark', value: 'wireframeDark' }
                            ]"
                            variant="outlined"
                            density="compact"
                          />
                        </div>

                        <v-btn
                          block
                          type="submit"
                          color="primary"
                          :loading="isAuthLoading"
                          class="mt-4"
                        >
                          Send Login Link
                        </v-btn>

                        <v-btn
                          block
                          variant="outlined"
                          class="mt-2"
                          :disabled="isAuthLoading"
                          @click="loginAnonymously"
                        >
                          Continue as Guest
                        </v-btn>
                      </v-form>
                    </template>
                  </v-card-text>
                </v-card>
              </v-menu>
            </div>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="main-content">
        <slot />
      </main>

      <!-- Session recovery dialog for when auth is lost -->
      <v-dialog v-model="showSessionRecovery" max-width="400">
        <v-card>
          <v-card-title>Session Expired</v-card-title>
          <v-card-text>
            <p>Your session has expired. Please enter your email to sign back in:</p>
            <v-form @submit.prevent="handleReLogin">
              <v-text-field
                v-model="recoveryEmail"
                label="Email"
                type="email"
                required
                variant="outlined"
                density="compact"
              />

              <v-btn
                block
                type="submit"
                color="primary"
                :loading="isAuthLoading"
                class="mt-4"
              >
                Send Login Link
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-dialog>

      <!-- Show a success message when login link is sent -->
      <v-snackbar
        v-model="showLoginSuccess"
        :timeout="6000"
        color="success"
      >
        Login link sent to your email. Please check your inbox.
      </v-snackbar>
    </div>
  </v-app>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeMount } from 'vue';
import { useAppTheme } from '~/composables/useTheme';
import { useAuth } from '~/composables/useAuth';
import { useHead } from '#app';

// Theme management from composable
const { currentTheme, isDark, toggleTheme, isLoading: themeLoading } = useAppTheme();

// Enhanced head management for SSR theme consistency
useHead(computed(() => ({
  htmlAttrs: {
    class: [
      currentTheme.value === 'wireframeDark' ? 'dark-theme' : 'light-theme',
      currentTheme.value === 'wireframeDark' ? 'v-theme--wireframeDark' : 'v-theme--wireframe',
      themeLoading.value ? 'theme-initializing' : ''
    ]
  }
})));

// Auth management
const { user, isLoading: isAuthLoading, error, sendSignInLink, signInAnonymousUser, signOutUser, convertAnonymousToEmailLink, firestoreDisabled } = useAuth();

// User menu state
const userMenuOpen = ref(false)
const email = ref('')
const showLoginSuccess = ref(false)

// Session recovery state
const showSessionRecovery = ref(false)
const recoveryEmail = ref('')
const lastStoredAuthState = ref(false)

// Check for auth state changes to detect session issues
watch(() => user.value, (newUser, oldUser) => {
  // Store authentication state in local storage for recovery
  if (import.meta.client) {
    if (newUser && !newUser.isAnonymous) {
      // Store verified user state
      localStorage.setItem('hadAuthSession', 'true')
      localStorage.setItem('authEmail', newUser.email || '')
      lastStoredAuthState.value = true

      // Hide session recovery dialog if user is now authenticated
      showSessionRecovery.value = false
    } else if (newUser && newUser.isAnonymous) {
      // If we had a verified session before but now we're anonymous,
      // this might be a case where auth was lost
      const hadAuth = localStorage.getItem('hadAuthSession') === 'true'
      if (hadAuth && lastStoredAuthState.value) {
        // Show recovery dialog
        recoveryEmail.value = localStorage.getItem('authEmail') || ''
        showSessionRecovery.value = true
      }

      // Update stored state
      lastStoredAuthState.value = false
    } else if (!newUser && lastStoredAuthState.value) { // Explicitly handle logout or session loss
        const hadAuth = localStorage.getItem('hadAuthSession') === 'true';
        if (hadAuth) {
            recoveryEmail.value = localStorage.getItem('authEmail') || '';
            showSessionRecovery.value = true;
        }
        lastStoredAuthState.value = false;
    }
  }
})

// Initialize stored auth state on component mount
onMounted(() => {
  if (import.meta.client) {
    // Check if we're coming from a magic link authentication flow
    const isFromMagicLink = window.location.href.includes('apiKey=') ||
                            window.location.href.includes('mode=');

    // Only set lastStoredAuthState if we're not in a magic link flow
    if (!isFromMagicLink) {
      lastStoredAuthState.value = localStorage.getItem('hadAuthSession') === 'true';
    }

    // Don't show the recovery dialog if we're in the middle of authentication
    if (firestoreDisabled.value && lastStoredAuthState.value && !isFromMagicLink) {
      // Add a slightly longer delay to allow auth to complete
      setTimeout(() => {
        // Double-check we're still not authenticated before showing dialog
        if (!user.value || user.value.isAnonymous) {
          recoveryEmail.value = localStorage.getItem('authEmail') || '';
          showSessionRecovery.value = true;
        }
      }, 2000); // Increased from 1000ms to 2000ms
    }
  }
})

// Handle login form submission
const handleLogin = async () => {
  if (!email.value) return

  let success

  if (user.value && user.value.isAnonymous) {
    // If user is anonymous, convert to email auth
    success = await convertAnonymousToEmailLink(email.value)
  } else {
    // Otherwise regular email link sign in
    success = await sendSignInLink(email.value)
  }

  if (success) {
    showLoginSuccess.value = true
    userMenuOpen.value = false
    email.value = ''
  }
}

// Handle re-login from session recovery
const handleReLogin = async () => {
  if (!recoveryEmail.value) return

  const success = await sendSignInLink(recoveryEmail.value)

  if (success) {
    showLoginSuccess.value = true
    showSessionRecovery.value = false
    recoveryEmail.value = ''
  }
}

// Login anonymously
const loginAnonymously = async () => {
  await signInAnonymousUser()
  userMenuOpen.value = false
}
</script>

<style scoped>
.app-wrapper {
  min-height: 100vh;
  overflow: hidden;
  background-color: rgb(var(--v-theme-background-rgb)) !important;
}

.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: rgb(var(--v-theme-background-rgb));
  color: rgb(var(--v-theme-on-background-rgb));
}

.app-header {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo-container {
  flex-shrink: 0;
}

.logo-placeholder {
  width: 80px;
  height: 40px;
  border: 1px dashed #000000; /* Default for light theme */
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Courier New', monospace;
  font-weight: bold;
}

html.dark-theme .logo-placeholder {
  border-color: #ffffff;
}

.spacer {
  flex-grow: 1;
}

.actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-menu {
  position: relative;
}

.user-btn {
  min-width: 120px;
}

.main-content {
  flex-grow: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 1rem;
}

.error-message {
  color: #cc0000; /* Default for light theme */
  font-size: 0.875rem;
}

html.dark-theme .error-message {
  color: #ff9999;
}

.theme-selector {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.user-info {
  margin-bottom: 1rem;
}

.notification-dot {
  width: 8px;
  height: 8px;
  background-color: #f44336; /* This color is theme-agnostic, so no change needed */
  border-radius: 50%;
  display: inline-block;
  margin-left: 4px;
}

.status-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>