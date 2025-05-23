<template>
  <!-- Simply use Vuetify's theme system without extra props -->
  <v-app class="app-wrapper">
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
            <!-- Theme toggle - simplified with ClientOnly -->
            <ClientOnly>
              <v-btn
                icon
                variant="text"
                :title="isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'"
                @click="toggleAppTheme"
              >
                <i :class="isDarkTheme ? 'fas fa-sun' : 'fas fa-moon'" />
              </v-btn>
              <template #fallback>
                <v-btn icon variant="text" title="Toggle theme" disabled>
                  <i class="fas fa-circle-notch" />
                </v-btn>
              </template>
            </ClientOnly>

            <!-- User menu -->
            <div class="user-menu">
              <!-- For authenticated users -->
              <v-btn
                v-if="user && !user.isAnonymous"
                variant="outlined"
                class="user-btn"
                to="/profile"
              >
                <i class="fas fa-user mr-2"/>
                <span>Profile</span>
              </v-btn>

              <!-- For anonymous/unauthenticated users -->
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

                      <!-- Simplified theme selection -->
                      <div class="theme-selector">
                        <v-select
                          v-model="currentTheme"
                          label="Theme"
                          :items="availableThemes"
                          item-title="label"
                          item-value="name"
                          variant="outlined"
                          density="compact"
                          @update:model-value="setAppTheme"
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

                        <!-- Simplified theme selection -->
                        <div class="theme-selector">
                          <v-select
                            v-model="currentTheme"
                            label="Theme"
                            :items="availableThemes"
                            item-title="label"
                            item-value="name"
                            variant="outlined"
                            density="compact"
                            @update:model-value="setAppTheme"
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
import { computed, ref, watch, onMounted } from 'vue';
import { useAppTheme } from '~/composables/useTheme';
import { useAuth } from '~/composables/useAuth';
import { useHead } from '#imports';

// Get theme utilities from our composable
const {
  currentTheme,
  isDark: isDarkTheme,
  availableThemes,
  toggleTheme: toggleAppTheme,
  setTheme: setAppTheme
} = useAppTheme();

// Auth management - only import what we use
const { user, isLoading: isAuthLoading, error, sendSignInLink, signInAnonymousUser, firestoreDisabled } = useAuth();

// User menu state
const userMenuOpen = ref(false)
const email = ref('')
const showLoginSuccess = ref(false)

// Session recovery state
const showSessionRecovery = ref(false)
const recoveryEmail = ref('')
const lastStoredAuthState = ref(false)

// Add basic head management for improved SEO and social sharing
useHead({
  htmlAttrs: {
    // This will be applied during SSR and hydrated on client
    class: computed(() => [isDarkTheme.value ? 'dark-theme' : 'light-theme'])
  }
})

// Check for auth state changes to detect session issues
watch(() => user.value, (newUser) => {
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

// Initialize client-side behavior
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
        // Double-check we're still not authenticated
        if (!user.value || user.value.isAnonymous) {
          // Show recovery dialog
          recoveryEmail.value = localStorage.getItem('authEmail') || '';
          showSessionRecovery.value = true;
        }
      }, 2000);
    }
  }
})

// Handle login form submission
const handleLogin = async () => {
  if (email.value) {
    try {
      await sendSignInLink(email.value);
      showLoginSuccess.value = true;
      userMenuOpen.value = false;
    } catch {
      // Error is handled by useAuth composable
    }
  }
};

// Handle anonymous login
const loginAnonymously = async () => {
  try {
    await signInAnonymousUser();
    userMenuOpen.value = false;
  } catch {
    // Error is handled by useAuth composable
  }
};

// Handle re-login from session recovery dialog
const handleReLogin = async () => {
  if (recoveryEmail.value) {
    try {
      await sendSignInLink(recoveryEmail.value);
      showLoginSuccess.value = true;
      showSessionRecovery.value = false;
    } catch {
      // Error is handled by useAuth composable
    }
  }
};
</script>

<style scoped>
.app-wrapper {
  min-height: 100vh;
  overflow: hidden;
}

.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
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

:deep(.v-theme--wireframeDark) .logo-placeholder {
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

:deep(.v-theme--wireframeDark) .error-message {
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