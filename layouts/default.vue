<template>
  <v-app :theme="themeForRendering" class="app-wrapper" :data-theme="themeForRendering">
    <v-main class="app-layout">
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
                :title="isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'"
                @click="toggleAppTheme"
              >
                <i :class="isDarkTheme ? 'fas fa-sun' : 'fas fa-moon'" />
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
                          v-model="currentThemeValue"
                          label="Theme"
                          :items="[
                            { title: 'Light', value: 'wireframe' },
                            { title: 'Dark', value: 'wireframeDark' }
                          ]"
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

                        <div class="theme-selector">
                          <v-select
                            v-model="currentThemeValue"
                            label="Theme"
                            :items="[
                              { title: 'Light', value: 'wireframe' },
                              { title: 'Dark', value: 'wireframeDark' }
                            ]"
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
    </v-main>
  </v-app>
</template>

<script setup>
import { computed, ref, watch, onMounted, useSSRContext } from 'vue';
import { themeState } from '~/plugins/theme-state';
import { useAppTheme } from '~/composables/useTheme';
import { useAuth } from '~/composables/useAuth';
import { useHead, useRequestEvent } from '#app';

// Get SSR context and event for theme detection
const ssrContext = import.meta.server ? useSSRContext() : null;
const event = useRequestEvent();

// Get the server-provided theme if available
const serverTheme = event?.context?.theme;

// Use the global theme state directly for maximum consistency
// This ensures consistent theme behavior across the entire application
const isDarkTheme = computed(() => themeState.isDark);
const currentThemeValue = computed(() => themeState.currentTheme);

// Get theme utilities from our composable
const { initializeTheme, toggleTheme, setTheme } = useAppTheme();

// Make sure we always have a theme value for rendering
// Use the server theme for SSR hydration to prevent mismatches
const themeForRendering = computed(() => {
  if (import.meta.server && serverTheme) {
    return serverTheme; // Use server-determined theme during SSR
  }
  return currentThemeValue.value || (isDarkTheme.value ? 'wireframeDark' : 'wireframe');
});

// Use these methods to modify the theme
const toggleAppTheme = () => themeState.toggleTheme();
const setAppTheme = (theme) => themeState.setTheme(theme);

// Enhanced head management for SSR theme consistency
useHead(computed(() => {
  // During SSR, use the server-detected theme to avoid hydration mismatches
  const isDark = import.meta.server && serverTheme
    ? serverTheme === 'wireframeDark'
    : isDarkTheme.value;

  return {
    htmlAttrs: {
      class: [

        isDark ? 'v-theme--wireframeDark' : 'v-theme--wireframe'
      ]
    }
  };
}));

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

// Initialize the theme when the component is mounted
onMounted(() => {
  // Initialize with the server-provided theme if available to prevent hydration mismatch
  if (serverTheme && themeState && themeState.currentTheme !== serverTheme) {
    // Sync the client state with what the server rendered
    setTheme(serverTheme);
  } else {
    // Fallback to normal initialization
    initializeTheme();
  }

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
</script>

<style>
/* Add any component-specific styles here */
</style>