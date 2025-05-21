# Nuxt App with Firebase, VueFire, and Vuex

This project is a Nuxt 3 application with Firebase integration using both VueFire and Vuex. It provides a robust foundation for building web applications with Firebase backend services.

## Setup

Make sure to install dependencies:

```bash
# pnpm
pnpm install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# pnpm
pnpm dev
```

## Production

Build the application for production:

```bash
# pnpm
pnpm build
```

Locally preview production build:

```bash
# pnpm
pnpm preview
```

## Firebase Configuration

This app uses Firebase for authentication, Firestore database, and storage. You need to:

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/)
2. Create a web app in your Firebase project
3. Create `/config/firebase.config.js` with your Firebase configuration:

```js
export default {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

4. (Optional) For server-side features, place a service account JSON file at the root as `service-account.json`

## Firebase Integration

This app uses a dual approach to Firebase integration:

1. **VueFire**: Used for simple Firebase data bindings via Nuxt's module system
2. **Vuex + VuexFire**: Used for more complex state management needs

### Accessing Firebase Services

Use the `useFirebaseApp()` composable to get Firebase services consistently:

```js
import { useFirebaseApp } from '~/composables/utils/useFirebaseApp'

// Get Firebase services
const { app, auth, firestore, storage } = useFirebaseApp()
```

This ensures you get the same Firebase instances throughout the app, whether from VueFire or direct initialization.

## State Management

### VueFire for Simple State

For simple Firebase data bindings, use VueFire's composables:

```vue
<script setup>
import { useFirestore, useDocument } from 'vuefire'
import { doc } from 'firebase/firestore'

const firestore = useFirestore()
const docRef = doc(firestore, 'collection', 'docId')
const { data, pending } = useDocument(docRef)
</script>

<template>
  <div v-if="pending">Loading...</div>
  <div v-else>{{ data }}</div>
</template>
```

### Vuex for Complex State

For more complex state management, use Vuex:

```js
import { useNuxtApp } from '#app'

// Get the Vuex store
const { $store } = useNuxtApp()

// Use Vuex store
const user = $store.getters['user/currentUser']
$store.dispatch('user/signIn', { email, password })
```

## Form System

This application includes multiple form handling systems:

1. **Standard Form System**: Direct form management with validation
2. **Firestore Form System**: Forms with direct Firestore integration
3. **Vuex Form System**: Forms using Vuex for state management

### Using Vuex Forms

```vue
<script setup>
import { useVuexForm } from '~/composables/forms/useVuexForm'
import { useNuxtApp } from '#app'
import { useFirebaseApp } from '~/composables/utils/useFirebaseApp'
import { doc } from 'firebase/firestore'

// Get services
const { $store } = useNuxtApp()
const { firestore } = useFirebaseApp()

// Create document reference
const userId = $store.getters['user/currentUser']?.uid
const userDocRef = userId ? doc(firestore, 'userProfiles', userId) : null

// Use Vuex form
const {
  formData,
  formErrors,
  isSubmitting,
  handleSubmit,
  validateField,
  updateField,
  resetForm,
} = useVuexForm({
  formId: 'profile',
  useFirestore: true,
  docRef: userDocRef,
  initialState: {
    displayName: '',
    email: '',
    bio: ''
  },
  validationRules: {
    displayName: (value) => !!value || 'Display name is required'
  }
})
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <v-text-field
      v-model="formData.displayName"
      label="Display Name"
      :error-messages="formErrors.displayName"
      @input="validateField('displayName')"
    />

    <v-text-field
      v-model="formData.email"
      label="Email"
      :error-messages="formErrors.email"
    />

    <v-btn type="submit" :loading="isSubmitting">Submit</v-btn>
  </form>
</template>
```

See the [VUEX-INTEGRATION.md](./VUEX-INTEGRATION.md) file for detailed information about the Vuex and VueFire integration.

## Project Structure

- `components/`: Vue components
- `composables/`: Vue composables for shared functionality
- `config/`: Configuration files
- `layouts/`: Nuxt layouts
- `middleware/`: Nuxt middleware
- `pages/`: Application pages
- `plugins/`: Nuxt plugins
- `public/`: Public assets
- `server/`: Server-side code
- `store/`: Vuex store and modules

## Key Features

- **Authentication**: Firebase authentication with Vuex state management
- **Firestore Integration**: Real-time database with VueFire and VuexFire
- **Form Management**: Multiple form management approaches
- **SSR Support**: Server-side rendering with Firebase
- **Vuetify**: Material Design component framework

## Deployment

### Local Deployment

To deploy to Firebase from your local development environment:

1. Make sure you have the Firebase CLI installed:
   ```bash
   npm install -g firebase-tools
   ```

2. Log in to Firebase:
   ```bash
   firebase login
   ```

3. Build the application with the Firebase preset:
   ```bash
   # Set Node.js to v18 if using nvm
   nvm use 18

   # Build using the Firebase preset
   NITRO_PRESET=firebase pnpm build
   ```

4. Deploy to Firebase:
   ```bash
   firebase deploy
   ```

If you encounter any issues with the build related to dependencies:

```bash
# Ensure vue-recaptcha-v3 is installed
pnpm add vue-recaptcha-v3
```

### Firebase Gen2 Functions Configuration

This project is configured to use Firebase Gen2 functions for enhanced performance and features. The `firebase.json` configuration is already set up for SSR deployment with:

```json
{
  "hosting": {
    "public": ".output/public",
    "cleanUrls": true,
    "rewrites": [
      {
        "source": "**",
        "function": "server"
      }
    ]
  },
  "functions": {
    "source": ".output/server",
    "runtime": "nodejs18"
  }
}
```

## CI/CD with GitHub Actions

This project includes a GitHub Actions workflow for automatic deployment to Firebase. The workflow:

1. Builds and deploys on pushes to `master`/`main` (production) and `dev`/`development` branches
2. Runs checks on pull requests to the main branches
3. Uses different environment variables and Firebase projects for production vs. development
4. Properly configures Node.js 18 for compatibility with Firebase Gen2 functions

### Required GitHub Secrets

To use the GitHub Actions workflow, you need to set up the following repository secrets:

| Secret Name | Description |
|------------|-------------|
| `PROD_FIREBASE_SERVICE_ACCOUNT` | Production Firebase service account JSON content |
| `DEV_FIREBASE_SERVICE_ACCOUNT` | Development Firebase service account JSON content |
| `PROD_FIREBASE_PROJECT_ID` | Your production Firebase project ID |
| `DEV_FIREBASE_PROJECT_ID` | Your development Firebase project ID |
| `PROD_RECAPTCHA_SITE_KEY` | Production reCAPTCHA site key |
| `PROD_RECAPTCHA_SECRET_KEY` | Production reCAPTCHA secret key |
| `DEV_RECAPTCHA_SITE_KEY` | Development reCAPTCHA site key |
| `DEV_RECAPTCHA_SECRET_KEY` | Development reCAPTCHA secret key |
| `FONTAWESOME_TOKEN` | FontAwesome Pro authentication token |
| `PROD_envKeys` | Base64-encoded production environment variables |
| `DEV_envKeys` | Base64-encoded development environment variables |

### Setting Up Environment Variables

To prepare your environment variables for GitHub secrets:

```bash
# For production
cat .env.prod | base64 > prod_env_base64.txt

# For development
cat .env.dev | base64 > dev_env_base64.txt
```

Copy the contents of these files to the corresponding GitHub secrets.

### Service Account Setup

For each environment (development and production):

1. Generate a service account key from the Firebase console:
   - Go to Project Settings > Service accounts
   - Click "Generate new private key"
   - Save the JSON file securely

2. Copy the entire JSON content to the respective GitHub secret:
   - Production service account → `PROD_FIREBASE_SERVICE_ACCOUNT`
   - Development service account → `DEV_FIREBASE_SERVICE_ACCOUNT`

The workflow automatically selects the appropriate service account based on the branch being deployed.

### Firebase Project Setup

For a multi-environment setup with development and production projects:

1. Create two Firebase projects (one for development, one for production)
2. Add both project IDs to your GitHub secrets
3. Make sure each service account has access to its respective project

## License

[MIT License](LICENSE)
