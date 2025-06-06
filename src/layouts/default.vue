<template>
  <!-- Use Vuetify's theme system without any extra props -->
  <ClientOnly>
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
              <!-- Theme toggle - using ClientOnly -->
              <v-btn
                icon
                variant="text"
                :title="isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'"
                @click="toggleAppTheme"
              >
                <i :class="isDarkTheme ? 'fas fa-sun' : 'fas fa-moon'" />
              </v-btn>

              <!-- User menu with dropdown -->
              <div class="user-menu ml-4">
                <v-menu v-model="userMenuOpen" :close-on-content-click="false">
                  <template #activator="{ props }">
                    <div v-bind="props">
                      <!-- Anonymous user avatar -->
                      <v-btn
                        v-if="user && user.isAnonymous"
                        icon
                        variant="outlined"
                        class="user-btn"
                      >
                        <i class="fas fa-user-secret" />
                      </v-btn>
                      <!-- Authenticated user avatar -->
                      <v-btn
                        v-else-if="user"
                        icon
                        variant="outlined"
                        class="user-btn"
                      >
                        <i class="fas fa-user" />
                      </v-btn>
                      <!-- Guest Login button -->
                      <v-btn
                        v-else
                        variant="outlined"
                        class="user-btn"
                      >
                        <i class="fas fa-sign-in-alt mr-2" />
                        Login
                      </v-btn>
                    </div>
                  </template>

                  <v-card min-width="300">
                    <v-card-title>
                      <template v-if="user && user.isAnonymous">Account Setup</template>
                      <template v-if="!user">Login</template>
                    </v-card-title>


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
                      <template v-if="!user">
                        <v-card-text>

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
                              color="primary"
                              class="mt-4"
                              type="submit"
                              :loading="isAuthLoading"
                            >
                              Continue with Email
                            </v-btn>

                            <div class="mt-4 text-center">
                              <v-divider class="mb-4"><span class="mx-2">or</span></v-divider>
                              <v-btn
                                block
                                variant="tonal"
                                :loading="isAuthLoading"
                                @click="loginAnonymously"
                              >
                                <i class="fas fa-user-secret mr-2" />
                                Continue as Guest
                              </v-btn>
                            </div>
                          </v-form>

                          <!-- Login success message -->
                          <v-expand-transition>
                            <div v-if="showLoginSuccess" class="mt-4">
                              <v-alert
                                type="success"
                                title="Email Link Sent"
                                text="Check your email for a sign-in link."
                                variant="tonal"
                                closable
                                @click:close="showLoginSuccess = false"
                              />
                            </div>
                          </v-expand-transition>
                        </v-card-text>
                      </template>
                      <!-- Show account actions for authenticated users -->
                      <template v-if="user && !user.isAnonymous">
                        <v-card-text>
                          <div class="user-info mb-4">
                            <div v-if="user.displayName" class="display-name font-weight-medium">
                              {{ user.displayName }}
                            </div>
                            <div class="email text-subtitle-2 text-grey">{{ user.email }}</div>
                          </div>

                          <v-divider class="mb-4" />

                          <v-btn
                            block
                            color="primary"
                            variant="tonal"
                            class="mb-2"
                            to="/profile"
                            @click="userMenuOpen = false"
                          >
                            <i class="fas fa-user-circle mr-2" />
                            User Profile
                          </v-btn>

                          <v-btn
                            block
                            color="error"
                            variant="tonal"
                            @click="signOutUser"
                          >
                            <i class="fas fa-sign-out-alt mr-2" />
                            Sign Out
                          </v-btn>
                        </v-card-text>
                      </template>


                  </v-card>
                </v-menu>
              </div>
            </div>
          </div>
        </header>

        <!-- Main content -->
        <main class="app-main">
          <slot />
        </main>

        <!-- Footer -->
        <footer class="app-footer">
          <div class="footer-content">
            <div class="copyright">
              &copy; {{ new Date().getFullYear() }} My App. All rights reserved.
            </div>
          </div>
        </footer>

        <!-- Session Recovery Dialog -->
        <v-dialog v-model="showSessionRecovery" width="auto" persistent>
          <v-card min-width="400" max-width="600" title="Continue Your Session">
            <v-card-text>
              <p>Looks like you were previously signed in. Enter your email to continue where you left off:</p>

              <div v-if="error" class="error-message my-2">{{ error }}</div>

              <v-text-field
                v-model="recoveryEmail"
                label="Email"
                type="email"
                variant="outlined"
                density="compact"
                class="mt-4"
              />
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn variant="text" @click="showSessionRecovery = false">
                Cancel
              </v-btn>
              <v-btn
                color="primary"
                :loading="isAuthLoading"
                @click="handleReLogin"
              >
                Send Link
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </div>
    </v-app>

    <template #fallback>
      <!-- Static version for SSR to avoid hydration mismatch -->
      <div class="app-wrapper-fallback">
        <div class="app-layout-fallback">
          <header class="app-header-fallback">
            <div class="header-content-fallback">
              <div class="logo-container-fallback">
                <a href="/">LOGO</a>
              </div>
              <div class="spacer-fallback"/>
              <div class="actions-fallback">
                <!-- Static placeholders for dynamic content -->
              </div>
            </div>
          </header>
          <main class="app-main-fallback">
            <div class="loading-indicator">Loading...</div>
          </main>
        </div>
      </div>
    </template>
  </ClientOnly>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { useAppTheme } from '~/composables/useTheme';
import { useAuth } from '~/composables/useAuth';
import { useHead } from '#imports';

// Get theme utilities from our simplified composable
const {
  currentTheme,
  isDark: isDarkTheme,
  availableThemes,
  toggleTheme: toggleAppTheme,
  setTheme: setAppTheme,
  isHydrated
} = useAppTheme();

// Auth management - only import what we use
const { user, isLoading: isAuthLoading, error, sendSignInLink, signInAnonymousUser, firestoreDisabled, signOutUser } = useAuth();

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
  title: 'Welcome to My App',
  meta: [
    { name: 'description', content: 'A modern web application built with Nuxt 3, Firebase and Vuetify' },
    { property: 'og:title', content: 'My App - Home' },
    { property: 'og:description', content: 'A modern web application built with Nuxt 3, Firebase and Vuetify' },
    { name: 'theme-color', content: computed(() => isDarkTheme.value ? '#121212' : '#FFFFFF') }
  ],
  htmlAttrs: {
    class: computed(() => isDarkTheme.value ? 'dark-theme' : 'light-theme')
  }
})

// Handle login with email link
const handleLogin = async () => {
  if (!email.value) return;

  try {
    await sendSignInLink(email.value);
    showLoginSuccess.value = true;
    // Don't close menu so user can see the success message
  } catch {
    // Error is handled by useAuth composable
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
  flex: 0 0 auto;
}

.logo-placeholder {
  width: 80px;
  height: 40px;
  background-color: rgba(var(--v-theme-primary), 0.8);
  color: rgb(var(--v-theme-on-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  border-radius: 4px;
}

.spacer {
  flex: 1 1 auto;
}

.user-btn {
  border-radius: 50%;
  width: 40px;
  height: 40px;
}

.app-main {
  flex: 1;
  padding: 2rem 1rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.app-footer {
  padding: 1rem;
  background-color: rgba(var(--v-theme-surface), 0.8);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-background), 0.7);
}

.error-message {
  color: rgb(var(--v-theme-error));
  font-size: 0.875rem;
}

.status-banner {
  background: rgba(var(--v-theme-surface-variant), 0.5);
  padding: 0.75rem;
  border-radius: 4px;
}

.actions {
  display: flex;
  align-items: center;
}

/* Fallback styles for SSR */
.app-wrapper-fallback {
  min-height: 100vh;
  background-color: #ffffff;
  color: #000000;
}

.app-layout-fallback {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header-fallback {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.header-content-fallback {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.app-main-fallback {
  flex: 1;
  padding: 2rem 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-indicator {
  padding: 2rem;
  text-align: center;
  font-size: 1.2rem;
}
</style>