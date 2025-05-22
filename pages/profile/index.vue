<template>
  <v-container class="profile-container pa-md-6" fluid>
    <div v-if="isLoading" class="loading d-flex flex-column align-center justify-center my-8">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="mt-4 text-body-1">Loading your profile...</p>
    </div>

    <template v-else-if="user">
      <!-- Account status banner -->
      <v-card
        :color="isAnonymous ? 'warning-container' : 'success-container'"
        class="mb-8"
        variant="flat"
      >
        <v-card-item>
          <div class="status-header d-flex justify-space-between align-center">
            <h2 class="text-h5">Account Status</h2>
            <v-chip
              :color="isAnonymous ? 'warning' : 'success'"
              size="small"
            >
              {{ isAnonymous ? 'Temporary Account' : 'Verified Account' }}
            </v-chip>
          </div>

          <div v-if="isAnonymous" class="status-content">
            <p>
              <v-icon icon="fas fa-exclamation-triangle" class="me-2" size="small" />
              Your account is temporary. To save your progress and settings,
              please verify your email address using the form below.
            </p>
          </div>
          <div v-else class="status-content">
            <p>
              <v-icon icon="fas fa-check-circle" class="me-2" size="small" />
              Your account is verified and your settings will be saved.
            </p>
          </div>
        </v-card-item>
      </v-card>

      <!-- Success message -->
      <v-alert
        v-if="successMessage"
        type="success"
        variant="tonal"
        class="mb-8"
        closable
        @click:close="successMessage = ''"
      >
        <v-icon icon="fas fa-check-circle" class="me-2" />
        {{ successMessage }}
      </v-alert>

      <!-- Error message -->
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="mb-8"
        closable
        @click:close="error = null"
      >
        <v-icon icon="fas fa-exclamation-circle" class="me-2" />
        {{ error }}
      </v-alert>

      <v-row>
        <!-- Left sidebar with settings navigation -->
        <v-col cols="12" md="3">
          <div class="text-h6 font-weight-medium mb-2">Settings</div>

          <v-list
            v-model:selected="activeTab"
            active-class="border-thin border-primary border-opacity-25"
            bg-color="transparent"
            class="pa-0 ga-2 d-flex flex-column"
            color="primary"
            density="comfortable"
            slim
          >
            <v-list-item
              v-if="isAnonymous"
              prepend-icon="fas fa-user-shield"
              title="Account Verification"
              subtitle="Verify your temporary account"
              rounded="lg"
              border="thin surface"
              :value="0"
            />

            <v-list-item
              prepend-icon="fas fa-user"
              title="Profile"
              subtitle="Personal information and settings"
              rounded="lg"
              border="thin surface"
              :value="1"
            />

            <v-list-item
              prepend-icon="fas fa-image"
              title="Photo Gallery"
              subtitle="Manage your profile photos"
              rounded="lg"
              border="thin surface"
              :value="2"
            />

            <v-list-item
              prepend-icon="fas fa-palette"
              title="Theme Settings"
              subtitle="Customize the appearance"
              rounded="lg"
              border="thin surface"
              :value="3"
            />

            <v-list-item
              prepend-icon="fas fa-cog"
              title="Preferences"
              subtitle="General application settings"
              rounded="lg"
              border="thin surface"
              :value="4"
            />
          </v-list>

          <!-- Sign out button -->
          <v-btn
            block
            color="error"
            variant="outlined"
            prepend-icon="fas fa-sign-out-alt"
            class="mt-6"
            @click="showConfirmLogout = true"
          >
            Sign Out
          </v-btn>

          <!-- Debug info (collapsible) -->
          <v-expansion-panels class="mt-6" variant="accordion">
            <v-expansion-panel title="Diagnostic Information">
              <v-expansion-panel-text>
                <div class="debug-info">
                  <p><strong>User Status:</strong> {{ debugInfo.userStatus }}</p>
                  <p><strong>Profile Status:</strong> {{ debugInfo.profileStatus }}</p>
                  <p><strong>Firestore Status:</strong> {{ debugInfo.firestoreStatus }}</p>
                  <p v-if="debugInfo.lastError" class="error">
                    <strong>Last Error:</strong> {{ debugInfo.lastError }}
                  </p>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-col>

        <!-- Right panel with content -->
        <v-col cols="12" md="9">
          <v-window v-model="activeTab">
            <!-- Account verification form for anonymous users -->
            <v-window-item :value="0" v-if="isAnonymous">
              <v-card border rounded="lg" class="pa-4">
                <v-card-title>
                  <div class="d-flex align-center justify-space-between mb-4">
                    <div>
                      <div class="text-h6 font-weight-medium">Account Verification</div>
                      <div class="text-body-2 text-medium-emphasis">Verify your email to save your progress</div>
                    </div>
                    <v-avatar
                      color="primary"
                      variant="tonal"
                      rounded
                      size="42"
                    >
                      <v-icon icon="fas fa-user-shield" />
                    </v-avatar>
                  </div>
                </v-card-title>

                <v-card-text>
                  <p class="mb-6">Enter your email address to verify your account. We'll send you a magic link to confirm.</p>

                  <v-form class="verification-form" @submit.prevent="handleVerification">
                    <v-text-field
                      v-model="verificationEmail"
                      label="Email"
                      type="email"
                      placeholder="your@email.com"
                      required
                      :error-messages="!isValidEmail && verificationEmail ? ['Please enter a valid email address'] : []"
                      variant="outlined"
                    />

                    <v-btn
                      block
                      color="primary"
                      type="submit"
                      :loading="isAuthLoading"
                      :disabled="!verificationEmail || !isValidEmail"
                      class="mt-4"
                    >
                      Send Verification Link
                      <v-icon end>fas fa-paper-plane</v-icon>
                    </v-btn>
                  </v-form>
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- Profile settings -->
            <v-window-item :value="1">
              <v-card border rounded="lg" class="pa-4">
                <v-card-title>
                  <div class="d-flex align-center justify-space-between mb-4">
                    <div>
                      <div class="text-h6 font-weight-medium">Profile Settings</div>
                      <div class="text-body-2 text-medium-emphasis">Manage your personal information</div>
                    </div>
                    <v-avatar
                      :image="profileImageUrl"
                      :color="profileImageUrl ? undefined : 'primary'"
                      variant="tonal"
                      rounded
                      size="42"
                    >
                      <v-icon v-if="!profileImageUrl" icon="fas fa-user" />
                    </v-avatar>
                  </div>
                </v-card-title>

                <v-card-text>
                  <UserSettingsForm />
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- Photo gallery tab -->
            <v-window-item :value="2">
              <v-card border rounded="lg" class="pa-4">
                <v-card-title>
                  <div class="d-flex align-center justify-space-between mb-4">
                    <div>
                      <div class="text-h6 font-weight-medium">Photo Gallery</div>
                      <div class="text-body-2 text-medium-emphasis">Manage your profile images</div>
                    </div>
                    <v-btn
                      v-if="galleryDirty"
                      color="primary"
                      prepend-icon="fas fa-save"
                      :loading="isSavingGallery"
                      @click="saveGallery"
                    >
                      Save Changes
                    </v-btn>
                  </div>
                </v-card-title>

                <v-card-text>
                  <ImageGalleryUpload
                    v-model="galleryData"
                    :max-images="5"
                    :max-size-m-b="2"
                    storage-folder="profile-images"
                    @upload-complete="handleGalleryUpdate"
                    @delete-image="handleGalleryUpdate"
                  />
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- Theme settings -->
            <v-window-item :value="3">
              <v-card border rounded="lg" class="pa-4">
                <v-card-title>
                  <div class="d-flex align-center justify-space-between mb-4">
                    <div>
                      <div class="text-h6 font-weight-medium">Theme Settings</div>
                      <div class="text-body-2 text-medium-emphasis">Customize your experience</div>
                    </div>
                    <v-avatar
                      color="primary"
                      variant="tonal"
                      rounded
                      size="42"
                    >
                      <v-icon :icon="isDark ? 'fas fa-moon' : 'fas fa-sun'" />
                    </v-avatar>
                  </div>
                </v-card-title>

                <v-card-text>
                  <div class="theme-settings">
                    <v-row align="center" class="mb-6">
                      <v-col cols="12" sm="4">
                        <div class="current-theme">
                          <p class="mb-2">Current theme:</p>
                          <v-chip color="primary" size="large" variant="elevated">
                            <v-icon :icon="isDark ? 'fas fa-moon' : 'fas fa-sun'" start />
                            {{ isDark ? 'Dark' : 'Light' }} Mode
                          </v-chip>
                        </div>
                      </v-col>
                      <v-col cols="12" sm="8">
                        <v-btn
                          size="large"
                          block
                          :color="isDark ? 'warning' : 'primary'"
                          :prepend-icon="isDark ? 'fas fa-sun' : 'fas fa-moon'"
                          @click="toggleTheme"
                          class="theme-toggle-btn"
                        >
                          Switch to {{ isDark ? 'Light' : 'Dark' }} Theme
                        </v-btn>
                      </v-col>
                    </v-row>

                    <v-row>
                      <v-col cols="12" sm="6">
                        <v-card variant="outlined" class="theme-preview light-theme">
                          <v-card-title class="text-center">Light Theme</v-card-title>
                          <v-card-text class="d-flex flex-column align-center">
                            <div class="theme-color-swatches light">
                              <div class="color-swatch primary"></div>
                              <div class="color-swatch surface"></div>
                              <div class="color-swatch error"></div>
                              <div class="color-swatch warning"></div>
                              <div class="color-swatch success"></div>
                            </div>
                            <v-btn
                              variant="outlined"
                              size="small"
                              class="mt-4"
                              :disabled="!isDark"
                              @click="setTheme('wireframe')"
                            >
                              Apply
                            </v-btn>
                          </v-card-text>
                        </v-card>
                      </v-col>
                      <v-col cols="12" sm="6">
                        <v-card variant="outlined" class="theme-preview dark-theme">
                          <v-card-title class="text-center">Dark Theme</v-card-title>
                          <v-card-text class="d-flex flex-column align-center">
                            <div class="theme-color-swatches dark">
                              <div class="color-swatch primary"></div>
                              <div class="color-swatch surface"></div>
                              <div class="color-swatch error"></div>
                              <div class="color-swatch warning"></div>
                              <div class="color-swatch success"></div>
                            </div>
                            <v-btn
                              variant="outlined"
                              size="small"
                              class="mt-4"
                              :disabled="isDark"
                              @click="setTheme('wireframeDark')"
                            >
                              Apply
                            </v-btn>
                          </v-card-text>
                        </v-card>
                      </v-col>
                    </v-row>
                  </div>
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- Preferences -->
            <v-window-item :value="4">
              <v-card border rounded="lg" class="pa-4">
                <v-card-title>
                  <div class="d-flex align-center justify-space-between mb-4">
                    <div>
                      <div class="text-h6 font-weight-medium">Preferences</div>
                      <div class="text-body-2 text-medium-emphasis">General application settings</div>
                    </div>
                    <v-avatar
                      color="primary"
                      variant="tonal"
                      rounded
                      size="42"
                    >
                      <v-icon icon="fas fa-cog" />
                    </v-avatar>
                  </div>
                </v-card-title>

                <v-card-text>
                  <v-list lines="two">
                    <v-list-item>
                      <template v-slot:prepend>
                        <v-icon icon="fas fa-bell" />
                      </template>
                      <v-list-item-title>Notifications</v-list-item-title>
                      <v-list-item-subtitle>Enable email and push notifications</v-list-item-subtitle>
                      <template v-slot:append>
                        <v-switch v-model="preferences.notifications" color="primary" hide-details />
                      </template>
                    </v-list-item>

                    <v-divider />

                    <v-list-item>
                      <template v-slot:prepend>
                        <v-icon icon="fas fa-language" />
                      </template>
                      <v-list-item-title>Language</v-list-item-title>
                      <v-list-item-subtitle>Select your preferred language</v-list-item-subtitle>
                      <template v-slot:append>
                        <v-select
                          v-model="preferences.language"
                          :items="['English', 'Spanish', 'French', 'German', 'Japanese']"
                          variant="underlined"
                          density="compact"
                          hide-details
                          style="max-width: 140px"
                        />
                      </template>
                    </v-list-item>

                    <v-divider />

                    <v-list-item>
                      <template v-slot:prepend>
                        <v-icon icon="fas fa-font" />
                      </template>
                      <v-list-item-title>Text Size</v-list-item-title>
                      <v-list-item-subtitle>Adjust the text size across the application</v-list-item-subtitle>
                      <template v-slot:append>
                        <v-btn-toggle
                          v-model="preferences.textSize"
                          color="primary"
                          density="comfortable"
                          mandatory
                        >
                          <v-btn value="small">
                            <v-icon>fas fa-text-height</v-icon>
                          </v-btn>
                          <v-btn value="medium">
                            <v-icon>fas fa-text-height fa-lg</v-icon>
                          </v-btn>
                          <v-btn value="large">
                            <v-icon>fas fa-text-height fa-xl</v-icon>
                          </v-btn>
                        </v-btn-toggle>
                      </template>
                    </v-list-item>

                    <v-divider />

                    <v-list-item>
                      <template v-slot:prepend>
                        <v-icon icon="fas fa-compress" />
                      </template>
                      <v-list-item-title>Compact Mode</v-list-item-title>
                      <v-list-item-subtitle>Use compact layout to fit more content</v-list-item-subtitle>
                      <template v-slot:append>
                        <v-switch v-model="preferences.compactMode" color="primary" hide-details />
                      </template>
                    </v-list-item>

                    <v-divider />

                    <v-list-item>
                      <template v-slot:prepend>
                        <v-icon icon="fas fa-save" />
                      </template>
                      <v-btn
                        color="primary"
                        :loading="isSavingPreferences"
                        :disabled="!preferencesDirty"
                        @click="savePreferences"
                      >
                        Save Preferences
                      </v-btn>
                    </v-list-item>
                  </v-list>
                </v-card-text>
              </v-card>
            </v-window-item>
          </v-window>
        </v-col>
      </v-row>
    </template>

    <!-- Logout confirmation dialog -->
    <v-dialog v-model="showConfirmLogout" width="400">
      <v-card>
        <v-card-title class="text-h6">Sign Out</v-card-title>
        <v-card-text>
          <p>Are you sure you want to sign out?</p>
          <p v-if="isAnonymous" class="text-error mt-2">
            <v-icon icon="fas fa-exclamation-triangle" class="me-2" />
            Warning: Your temporary account data may be lost if you sign out without verifying your email.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showConfirmLogout = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            @click="handleLogout"
          >
            Sign Out
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, reactive } from 'vue';
import { useAuth } from '../../composables/useAuth';
import { useAppTheme } from '../../composables/useTheme';
import { useProfileGallery } from '~/composables/forms/useProfileGallery';
import UserSettingsForm from '~/components/forms/UserSettingsForm.vue';
import ImageGalleryUpload from '~/components/forms/ImageGalleryUpload.vue';

// Auth management and user data
const { user, isLoading: isAuthLoading, error: authError, convertAnonymousToEmailLink, signOutUser, getUserData, updateUserProfile, firestoreDisabled } = useAuth();
const { currentTheme, isDark, toggleTheme, setTheme } = useAppTheme();

const router = useRouter();
const route = useRoute();

// Tab state
const activeTab = ref(0);

// Form data for verification
const verificationEmail = ref('');
const successMessage = ref('');
const error = ref(authError.value);
const showConfirmLogout = ref(false);

// User preferences state
const isSavingPreferences = ref(false);
const preferencesDirty = ref(false);
const preferences = reactive({
  notifications: true,
  language: 'English',
  textSize: 'medium',
  compactMode: false,
});

// Gallery state
const {
  galleryData,
  isDirty: galleryDirty,
  isSaving: isSavingGallery,
  profileImageUrl,
  saveGalleryToProfile
} = useProfileGallery({
  initialValue: { images: [], mainImageId: null }
});

// For troubleshooting
const debugInfo = ref({
  userStatus: 'Checking...',
  userObj: null,
  profileStatus: 'Unknown',
  firestoreStatus: firestoreDisabled.value ? 'Disabled' : 'Enabled',
  lastError: null
});

// Computed properties
const isAnonymous = computed(() => user.value?.isAnonymous);
const isValidEmail = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return verificationEmail.value ? emailRegex.test(verificationEmail.value) : true;
});
const isLoading = computed(() => isAuthLoading.value);

// Watch for changes in preferences to mark as dirty
watch(preferences, () => {
  preferencesDirty.value = true;
}, { deep: true });

// Handle form submission to verify account (convert anonymous user)
const handleVerification = async () => {
  if (!isValidEmail.value) return;

  const result = await convertAnonymousToEmailLink(verificationEmail.value);
  if (result) {
    successMessage.value = `A verification link has been sent to ${verificationEmail.value}. Please check your email to complete your account setup.`;
    // Clear form
    verificationEmail.value = '';
  }
};

// Handle logout
const handleLogout = async () => {
  await signOutUser();
  router.push('/');
};

// Save gallery changes to profile
const saveGallery = async () => {
  const result = await saveGalleryToProfile(async (data) => {
    if (!user.value) return false;

    try {
      await updateUserProfile(user.value.uid, { photoURL: data.profileImageUrl });
      return true;
    } catch (err) {
      console.error('Failed to update user profile with image:', err);
      return false;
    }
  });

  if (result) {
    successMessage.value = 'Gallery changes saved successfully!';
    setTimeout(() => {
      if (successMessage.value === 'Gallery changes saved successfully!') {
        successMessage.value = '';
      }
    }, 3000);
  } else {
    error.value = 'Failed to save gallery changes';
  }
};

// Save preferences
const savePreferences = async () => {
  isSavingPreferences.value = true;

  try {
    // Simulate API call to save preferences
    await new Promise(resolve => setTimeout(resolve, 800));

    preferencesDirty.value = false;
    successMessage.value = 'Preferences saved successfully!';

    setTimeout(() => {
      if (successMessage.value === 'Preferences saved successfully!') {
        successMessage.value = '';
      }
    }, 3000);

  } catch (err) {
    error.value = 'Failed to save preferences';
    console.error('Failed to save preferences:', err);
  } finally {
    isSavingPreferences.value = false;
  }
};

// Handle gallery updates
const handleGalleryUpdate = () => {
  // This is called when images are uploaded or deleted
  console.log('Gallery updated:', galleryData.value);
};

// Update error watcher
watch(authError, (newError) => {
  if (newError) {
    error.value = newError;
  }
});

// Update debug info whenever user or error changes
watch([user, error, firestoreDisabled], async () => {
  // Update user status
  if (!user.value) {
    debugInfo.value.userStatus = 'No user object';
  } else if (user.value.isAnonymous) {
    debugInfo.value.userStatus = 'Anonymous user';
  } else {
    debugInfo.value.userStatus = 'Authenticated user';
  }

  // Safe shallow copy of user object for debugging
  debugInfo.value.userObj = user.value ? {
    uid: user.value.uid,
    isAnonymous: user.value.isAnonymous,
    email: user.value.email,
    displayName: user.value.displayName,
    photoURL: user.value.photoURL,
    emailVerified: user.value.emailVerified
  } : null;

  // Update Firestore status
  debugInfo.value.firestoreStatus = firestoreDisabled.value ? 'Disabled' : 'Enabled';

  // Update last error
  debugInfo.value.lastError = error.value;

  // Check profile data if user exists
  if (user.value?.uid) {
    try {
      const profileData = await getUserData(user.value.uid, user.value.isAnonymous);
      debugInfo.value.profileStatus = profileData ? 'Profile exists' : 'No profile data';
    } catch (err: any) {
      debugInfo.value.profileStatus = `Error: ${err.message}`;
    }
  } else {
    debugInfo.value.profileStatus = 'No user to check profile';
  }
});

// Handle initialization and magic link returns
onMounted(() => {
  // Show special message if coming back from email verification
  if (route.query.mode === 'linkAnonymous') {
    successMessage.value = 'Your account has been successfully verified!';
  }

  // Set active tab based on route or user state
  if (route.hash === '#gallery') {
    activeTab.value = 2;
  } else if (route.hash === '#theme') {
    activeTab.value = 3;
  } else if (route.hash === '#preferences') {
    activeTab.value = 4;
  } else if (isAnonymous.value) {
    activeTab.value = 0; // Account verification for anonymous users
  }
});

// Set page metadata
useHead({
  title: 'Profile Settings',
  meta: [
    {
      name: 'description',
      content: 'Manage your user profile settings and preferences'
    }
  ]
});
</script>

<style scoped>
.profile-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* Theme previews */
.theme-preview {
  overflow: hidden;
  transition: transform 0.2s;
  height: 180px;
}

.theme-preview:hover {
  transform: translateY(-3px);
}

.theme-preview.light-theme {
  background-color: #fafafa;
  color: #333;
}

.theme-preview.dark-theme {
  background-color: #121212;
  color: #fff;
}

.theme-color-swatches {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}

.color-swatch {
  width: 30px;
  height: 30px;
  border-radius: 50%;
}

/* Light theme swatches */
.light .color-swatch.primary { background-color: #000000; }
.light .color-swatch.surface { background-color: #FFFFFF; border: 1px solid #e0e0e0; }
.light .color-swatch.error { background-color: #B00020; }
.light .color-swatch.warning { background-color: #FB8C00; }
.light .color-swatch.success { background-color: #388E3C; }

/* Dark theme swatches */
.dark .color-swatch.primary { background-color: #FFFFFF; }
.dark .color-swatch.surface { background-color: #121212; border: 1px solid #333; }
.dark .color-swatch.error { background-color: #CF6679; }
.dark .color-swatch.warning { background-color: #FFB74D; }
.dark .color-swatch.success { background-color: #81C784; }

/* Debug info */
.debug-info {
  font-family: monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 0.85rem;
}

.error {
  color: var(--v-error-base);
  font-weight: 500;
}
</style>