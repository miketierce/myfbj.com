<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useAppTheme } from '../../composables/useTheme'
import UserSettingsForm from '~/components/forms/UserSettingsForm.vue'

// Auth management and user data
const { user, isLoading, error, convertAnonymousToEmailLink, signOutUser, getUserData, firestoreDisabled } = useAuth()
const { currentTheme, isDark, toggleTheme } = useAppTheme()

const router = useRouter()
const route = useRoute()

// Form data for verification
const email = ref('')
const successMessage = ref('')
const showConfirmLogout = ref(false)

// For troubleshooting
const debugInfo = ref({
  userStatus: 'Checking...',
  userObj: null,
  profileStatus: 'Unknown',
  firestoreStatus: firestoreDisabled.value ? 'Disabled' : 'Enabled',
  lastError: null
})

// Computed properties
const isAnonymous = computed(() => user.value?.isAnonymous)
const isValidEmail = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return email.value ? emailRegex.test(email.value) : true
})
const isAuthenticated = computed(() => Boolean(user.value && !user.value.isAnonymous))

// Handle form submission to verify account (convert anonymous user)
const handleVerification = async () => {
  if (!isValidEmail.value) return

  const result = await convertAnonymousToEmailLink(email.value)
  if (result) {
    successMessage.value = `A verification link has been sent to ${email.value}. Please check your email to complete your account setup.`

    // Clear form
    email.value = ''
  }
}

// Handle logout
const handleLogout = async () => {
  await signOutUser()
  router.push('/')
}

// Update debug info whenever user or error changes
watch([user, error, firestoreDisabled], async () => {
  // Update user status
  if (!user.value) {
    debugInfo.value.userStatus = 'No user object'
  } else if (user.value.isAnonymous) {
    debugInfo.value.userStatus = 'Anonymous user'
  } else {
    debugInfo.value.userStatus = 'Authenticated user'
  }

  // Safe shallow copy of user object for debugging
  debugInfo.value.userObj = user.value ? {
    uid: user.value.uid,
    isAnonymous: user.value.isAnonymous,
    email: user.value.email,
    displayName: user.value.displayName,
    photoURL: user.value.photoURL,
    emailVerified: user.value.emailVerified
  } : null

  // Update Firestore status
  debugInfo.value.firestoreStatus = firestoreDisabled.value ? 'Disabled' : 'Enabled'

  // Update last error
  debugInfo.value.lastError = error.value

  // Check profile data if user exists
  if (user.value?.uid) {
    try {
      const profileData = await getUserData(user.value.uid, user.value.isAnonymous)
      debugInfo.value.profileStatus = profileData ? 'Profile exists' : 'No profile data'
    } catch (err) {
      debugInfo.value.profileStatus = `Error: ${err.message}`
    }
  } else {
    debugInfo.value.profileStatus = 'No user to check profile'
  }
})

// Handle initialization and magic link returns
onMounted(() => {
  // Show special message if coming back from email verification
  if (route.query.mode === 'linkAnonymous') {
    successMessage.value = 'Your account has been successfully verified!'
  }
})

// Set page metadata
useHead({
  title: 'Profile Settings',
  meta: [
    {
      name: 'description',
      content: 'Manage your user profile settings'
    }
  ]
})
</script>

<template>
  <div class="profile-container">
    <div v-if="isLoading" class="loading">
      <v-progress-circular indeterminate color="primary"/>
      <p>Loading your profile...</p>
    </div>

    <div v-else-if="user" class="profile-content">
      <h1>Profile Settings</h1>

      <!-- Display user verification status -->
      <v-card
        :color="isAnonymous ? 'warning-container' : 'success-container'"
        class="mb-4"
        variant="flat"
      >
        <v-card-item>
          <div class="status-header">
            <h2>Account Status</h2>
            <v-chip
              :color="isAnonymous ? 'warning' : 'success'"
              size="small"
            >
              {{ isAnonymous ? 'Temporary Account' : 'Verified Account' }}
            </v-chip>
          </div>

          <div v-if="isAnonymous" class="status-content">
            <p>
              <i class="fas fa-exclamation-triangle mr-2"/>
              Your account is temporary. To save your progress and settings,
              please verify your email address below.
            </p>
          </div>
          <div v-else class="status-content">
            <p>
              <i class="fas fa-check-circle mr-2"/>
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
        class="mb-4"
      >
        <i class="fas fa-check-circle mr-2"/>
        {{ successMessage }}
      </v-alert>

      <!-- Error message -->
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="mb-4"
      >
        <i class="fas fa-exclamation-circle mr-2"/>
        {{ error }}
      </v-alert>

      <!-- Account verification section for anonymous users -->
      <v-card v-if="isAnonymous" class="mb-4">
        <v-card-title>Verify Your Account</v-card-title>
        <v-card-text>
          <p>Enter your email address to verify your account. We'll send you a magic link to confirm.</p>

          <v-form class="profile-form" @submit.prevent="handleVerification">
            <v-text-field
              v-model="email"
              label="Email"
              type="email"
              placeholder="your@email.com"
              required
              :error-messages="!isValidEmail && email ? ['Please enter a valid email address'] : []"
              variant="outlined"
            />

            <v-btn
              block
              color="primary"
              type="submit"
              :loading="isLoading"
              :disabled="!email || !isValidEmail"
              class="mt-4"
            >
              Send Verification Link
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>

      <!-- Theme settings card -->
      <v-card class="mb-4">
        <v-card-title>Theme Settings</v-card-title>
        <v-card-text>
          <div class="theme-settings">
            <div class="current-theme">
              <p>Current theme: <strong>{{ isDark ? 'Dark' : 'Light' }}</strong></p>
            </div>

            <v-btn
              color="primary"
              :prepend-icon="isDark ? 'fas fa-sun' : 'fas fa-moon'"
              @click="toggleTheme"
            >
              Switch to {{ isDark ? 'Light' : 'Dark' }} Theme
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <!-- User settings form - Replaces the old profile form -->
      <v-card v-if="isAuthenticated" class="mb-4">
        <v-card-title>Your Profile</v-card-title>
        <v-card-text>
          <UserSettingsForm />
        </v-card-text>
      </v-card>

      <!-- Diagnostic information card -->
      <v-card class="mb-4">
        <v-card-title>Diagnostic Information</v-card-title>
        <v-card-text>
          <div class="debug-info">
            <p><strong>User Status:</strong> {{ debugInfo.userStatus }}</p>
            <p><strong>Profile Status:</strong> {{ debugInfo.profileStatus }}</p>
            <p><strong>Firestore Status:</strong> {{ debugInfo.firestoreStatus }}</p>
            <p v-if="debugInfo.lastError" class="error">
              <strong>Last Error:</strong> {{ debugInfo.lastError }}
            </p>
          </div>
        </v-card-text>
      </v-card>

      <!-- Account actions -->
      <v-card>
        <v-card-title>Account Actions</v-card-title>
        <v-card-text>
          <v-btn
            block
            color="error"
            variant="outlined"
            @click="showConfirmLogout = true"
          >
            Sign Out
          </v-btn>
        </v-card-text>
      </v-card>
    </div>

    <!-- Logout confirmation dialog -->
    <v-dialog v-model="showConfirmLogout" width="400">
      <v-card>
        <v-card-title>Sign Out</v-card-title>
        <v-card-text>Are you sure you want to sign out?</v-card-text>
        <v-card-actions>
          <v-spacer/>
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
  </div>
</template>

<style scoped>
.profile-container {
  max-width: 700px;
  margin: 40px auto;
  padding: 2rem;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.profile-content h1 {
  margin-bottom: 1rem;
  font-weight: 600;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.status-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.status-content {
  color: var(--v-text-primary);
}

.profile-section {
  padding: 1.5rem;
  border-radius: 8px;
  background-color: v-bind('isDark ? "#333333" : "#f5f5f5"');
  margin-bottom: 1rem;
}

.profile-section h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.25rem;
  font-weight: 500;
}

.profile-form {
  margin-top: 1.5rem;
}

.theme-settings {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.current-theme {
  font-weight: 500;
}

.debug-info {
  font-family: monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.error {
  color: var(--v-error-base);
  font-weight: 500;
}
</style>