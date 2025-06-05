# Nuxt App with Firebase, VueFire, and Vuex

This project is a Nuxt 3 application with Firebase integration using both VueFire and Vuex. It provides a robust foundation for building web applications with Firebase backend services.

## Template Repository

This project is set up as a template repository, which means you can:
1. Create new projects based on this template
2. Pull updates from this template into existing projects
3. Customize the template to fit your specific needs

### Creating a New Project from This Template

#### Option 1: Using GitHub's Template Feature
1. Navigate to the GitHub repository at https://github.com/Forward-Arrow-Solutions/nuxt-firebase-template
2. Click the "Use this template" button
3. Choose "Create a new repository"
4. **Important**: Select "Include only the default branch" option
   - This ensures you get only the clean template code without any development history
   - The default branch (`clean-master`) contains the carefully curated template without sensitive data
5. Follow the prompts to create your new project based on this template

#### Option 2: Manual Clone and Setup
1. Clone this repository:
   ```bash
   git clone https://github.com/Forward-Arrow-Solutions/nuxt-firebase-template.git your-project-name
   ```

2. Navigate to your new project directory:
   ```bash
   cd your-project-name
   ```

3. Remove the original Git history and initialize a new Git repository:
   ```bash
   rm -rf .git
   git init
   git add .
   git commit -m "Initial commit from template"
   ```

4. Link to your own remote repository:
   ```bash
   git remote add origin https://github.com/your-username/your-repository.git
   git push -u origin master
   ```

### Repository Structure and Security

This template repository was carefully structured to provide a secure foundation for your projects:

#### Security Features

1. **Sensitive File Exclusion**: The `.gitignore` file is configured to exclude:
   - Firebase service account credentials (`service-account.json`, etc.)
   - Environment files (`.env`, `.env.dev`, `.env.prod`, etc.)
   - Build artifacts (`.nuxt` directory)
   - Database files (`.data/content`, SQLite files)

2. **Clean Git History**: The template repository was created with a clean Git history that doesn't contain any sensitive information.

3. **Environment Variables**: The template uses environment variables for all sensitive configuration, with clear documentation on how to set them up.

#### File Structure

The template is organized with a clear separation of concerns:

```
├── assets/            # Static assets (SCSS, CSS, etc.)
├── components/        # Vue components
├── composables/       # Vue composables for shared functionality
├── config/            # Configuration files (needs your Firebase config)
├── content/           # Content files (Markdown, etc.)
├── functions/         # Firebase Cloud Functions
├── layouts/           # Nuxt layouts
├── middleware/        # Nuxt middleware
├── pages/             # Application pages (routes)
├── plugins/           # Nuxt plugins
├── public/            # Public static files
├── server/            # Server-side code
├── store/             # Vuex store modules
└── types/             # TypeScript type definitions
```

#### Required Setup Files (Not in Repository)

After creating a project from this template, you'll need to create:

1. **Firebase Configuration**:
   ```js
   // config/firebase.config.js
   export default {
     apiKey: "YOUR_API_KEY",
     // other Firebase config properties
   }
   ```

2. **Environment Variables**:
   - `.env` - For local development
   - `.env.dev` - For development environment
   - `.env.prod` - For production environment

3. **Service Account** (for server-side Firebase features):
   - `service-account.json` - Firebase service account credentials

### Pulling Updates from the Template

To keep your project up-to-date with enhancements and fixes made to the template:

#### For New Projects Created From the Template

When you create a new repository from a GitHub template, there are two common scenarios:

**Scenario 1: You created a new GitHub repo but are still working in the original template locally**

In this case, your remotes will look like this when you run `git remote -v`:
```
origin  https://github.com/Forward-Arrow-Solutions/nuxt-firebase-template.git (fetch)
origin  https://github.com/Forward-Arrow-Solutions/nuxt-firebase-template.git (push)
```

To set up your repo properly:

1. Change your origin to point to your NEW repository:
   ```bash
   git remote set-url origin https://github.com/YOUR-USERNAME/YOUR-NEW-REPO.git
   ```

2. Push your code to your new repository:
   ```bash
   git push -u origin clean-master
   ```

3. Add the template as a separate remote:
   ```bash
   git remote add template https://github.com/Forward-Arrow-Solutions/nuxt-firebase-template.git
   ```

**Scenario 2: You've already cloned your new repository from GitHub**

If you've created a new repo from the template on GitHub and then cloned YOUR repo (not the template), you're ready to set up template updates:

1. Add the template as a remote:
   ```bash
   git remote add template https://github.com/Forward-Arrow-Solutions/nuxt-firebase-template.git
   ```

2. Fetch the template branches:
   ```bash
   git fetch template
   ```

3. Verify what branches are available from the template:
   ```bash
   git branch -r | grep template
   ```
   You should see something like `template/clean-master` or `template/master`.

**Merging Template Updates**

After setting up the remotes correctly:

1. Check what changes are available:
   ```bash
   # Use the actual branch name you saw in step 3 above
   git log --oneline HEAD..template/clean-master
   ```

2. Merge the changes:
   ```bash
   git merge template/clean-master --allow-unrelated-histories
   ```

3. Resolve conflicts and test as described below.

#### If You're Still Having Issues with "Not Something We Can Merge"

If you get the error "not something we can merge", verify your branch names:

1. Check what remotes and branches are available:
   ```bash
   git remote -v
   git branch -r
   ```

2. If you see only `origin/clean-master` and no `template/clean-master`, then:
   ```bash
   # Since the template is your current origin, use:
   git merge origin/clean-master --allow-unrelated-histories

   # Or, to properly set up the template as a separate remote:
   git remote add template https://github.com/Forward-Arrow-Solutions/nuxt-firebase-template.git
   git fetch template
   git merge template/clean-master --allow-unrelated-histories
   ```

#### Tips for Managing Template Updates

- **Create a branch**: Before pulling updates, create a new branch to test the changes
  ```bash
  git checkout -b template-update
  ```

- **Selective updates**: Use `git cherry-pick` for smaller, specific updates rather than merging everything

- **Track what you've customized**: Keep notes on files you've heavily customized to make conflict resolution easier

- **Update regularly**: Pull template updates regularly to avoid large, complex merges

### Customizing the Template for Your Project

After creating a new project from the template, you should:

1. Update project details in `package.json`
2. Configure Firebase settings in `/config/firebase.config.js`
3. Update environment variables in `.env` files (see below)
4. Modify the README to reflect your project's specific details

## Development Setup

### FontAwesome Pro Setup

This project uses FontAwesome Pro. To install dependencies properly, you need to configure npm/pnpm with your FontAwesome authentication token:

1. Copy the template `.npmrc.example` file to `.npmrc`:
   ```bash
   cp .npmrc.example .npmrc
   ```

2. Edit the `.npmrc` file and replace `YOUR_TOKEN` with your actual FontAwesome Pro token:
   ```
   @awesome.me:registry=https://npm.fontawesome.com/
   @fortawesome:registry=https://npm.fontawesome.com/
   //npm.fontawesome.com/:_authToken=YOUR_ACTUAL_TOKEN
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

> **Note**: Your `.npmrc` file is git-ignored to prevent accidentally committing your authentication token. For CI/CD builds, the token is stored as a GitHub Secret (`FONTAWESOME_TOKEN`) and injected during the build process.

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

### VuexFire Adapter for Firebase v11

This project includes a custom adapter (`store/vuexfire-adapter.ts`) that provides compatibility between VuexFire 3.x and Firebase v11.x. The adapter allows your code to continue using VuexFire's familiar API while working with the latest Firebase SDK.

#### Why the Adapter Exists

VuexFire 3.x was designed for Firebase v8.x which used a different API compared to Firebase v11.x. Key differences include:

- Firebase v8.x used a callback-based API, while Firebase v11.x uses a Promise-based API
- References and queries are created differently in Firebase v11.x
- Real-time listeners are set up differently in Firebase v11.x

#### How to Use the Adapter

Instead of importing directly from VuexFire, import from the adapter:

```js
// BEFORE (with VuexFire directly)
import { firestoreAction } from 'vuexfire'

// AFTER (with the adapter)
import { firestoreAction } from '../vuexfire-adapter'
```

Then use `firestoreAction` normally in your store modules:

```js
export const actions = {
  bindProfile: firestoreAction(async function ({ bindFirestoreRef }, userId) {
    const docRef = doc(firestore, 'users', userId)
    await bindFirestoreRef('profile', docRef)
  })
}
```

#### How the Adapter Works

The adapter:

1. Creates a wrapper around the original `firestoreAction` from VuexFire
2. Intercepts calls to `bindFirestoreRef` and `unbindFirestoreRef`
3. Translates Firebase v11.x references (document and collection) to work with VuexFire
4. Sets up proper real-time listeners using Firebase v11.x's `onSnapshot` API
5. Triggers the appropriate VuexFire mutations to maintain state consistency
6. Handles cleanup of listeners to prevent memory leaks

#### Adapter Features

- **Transparent Integration**: Works as a drop-in replacement for VuexFire
- **Full Compatibility**: Supports both document and collection references
- **Real-time Updates**: Maintains live data synchronization
- **Memory Management**: Properly cleans up listeners when components unmount
- **Error Handling**: Includes robust error handling for binding operations
- **Logging**: Provides detailed logs for debugging purposes

#### Implementation Details for Developers

The adapter handles two main types of Firestore references:

1. **Document References**: Created with `doc(firestore, 'collection', 'docId')`
   - Initial data is fetched with `getDoc()`
   - Real-time updates use `onSnapshot()`
   - Mutations use either `SET_PROFILE` or `vuexfire/VUEXFIRE_DOC_MODIFIED`

2. **Collection References**: Created with `collection(firestore, 'collection')` or query functions
   - Real-time updates use `onSnapshot()`
   - Data is mapped to include document IDs
   - Mutations use `vuexfire/VUEXFIRE_ARRAY_MODIFIED`

All subscription cleanup is managed by the adapter through an internal `unsubscribeFunctions` Map.

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
const userDocRef = userId ? doc(firestore, 'users', userId) : null

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
   npm install -g firebase-tools@13.35.0
   ```

   > **Important Note:** This project currently requires Firebase Tools v13.35.0 because:
   > - Firebase Tools v14.0.0+ (released March 27, 2025) dropped support for Node.js 18
   > - This project is pinned to Node.js 18 due to compatibility issues between better-sqlite3 and nuxt/content on Node 20
   > - We'll upgrade to Node.js 20+ and Firebase Tools v14+ once these compatibility issues are resolved

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

## Deployment Options

### Local Development with Emulators

For local development without deploying to Firebase, you can use Firebase emulators which simulate Firebase services locally:

```bash
# Start Firebase emulators with data persistence
pnpm emulators

# Start both Firebase emulators and Nuxt dev server
pnpm dev:emulators
```

The emulators will save their state between restarts in the `.firebase-emulator-data` directory.

### Branch-specific Preview Deployments

For testing branches in a live environment without affecting production, use Firebase Hosting preview channels:

```bash
# Deploy current branch to a preview channel (using current Firebase project)
pnpm deploy:preview

# Deploy current branch to a preview channel using the dev project
pnpm deploy:preview:dev

# Get the URL of your preview deployment
pnpm save:preview-url
```

Preview deployments will:
- Create a unique URL based on your branch name
- Share the same Firebase project (but won't affect the live site)
- Automatically expire after 7 days (configurable in the script)
- Allow you to share a working version with teammates for review

Example preview URL format: `https://your-branch-name--your-firebase-project.web.app`

### Manual Preview Channel Management

You can also manage preview channels directly:

```bash
# List all active preview channels
firebase hosting:channel:list

# Delete a specific preview channel
firebase hosting:channel:delete CHANNEL_ID

# Open the preview URL in your browser
firebase hosting:channel:open CHANNEL_ID
```

### Production Deployment

For production deployment, continue using:

```bash
# Build and deploy to production
pnpm deploy

# Build, configure CORS, and deploy to production
pnpm deploy:with-cors
```

## CI/CD with GitHub Actions

This project includes a GitHub Actions workflow for automatic deployment to Firebase. The workflow:

1. Builds and deploys on **all branch pushes** using appropriate environment variables:
   - **Production environment**: Used for pushes to `master`/`main` branches
   - **Development environment**: Used for pushes to all other branches (including `dev`/`development`)
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

## Node.js and Firebase Compatibility

### ✨ Now Using Node.js 22! ✨

This project uses:
- Node.js 22 runtime
- PNPM 8 package manager
- Firebase Tools v13.48.0 (fully compatible with Node.js 22)
- Firebase Functions v6.4.0+ (supports Node.js 22 runtime)

**Key improvements:**
1. Latest Node.js features and performance improvements
2. PNPM 8 for faster, more reliable dependency management
3. Full compatibility with latest Firebase tools and SDKs
4. Improved development experience with Docker configuration

**For detailed migration information:**
- See [NODE22-MIGRATION.md](NODE22-MIGRATION.md) for complete details on the upgrade

**Quick start:**
```bash
# Run the setup script to prepare your development environment
./setup-dev.sh

# Or use Docker for a consistent development environment
pnpm docker:dev

# Verify your Node.js 22 + PNPM 8 setup
pnpm verify:node22
```

### Node.js 22 Tooling

#### Verification Script

The project includes a verification script to ensure your environment is properly configured for Node.js 22 and PNPM 8:

```bash
# Run the verification script
node verify-node22.js

# Or using npm script
pnpm verify:node22
```

This script checks:
- Node.js version (should be 22)
- PNPM version (should be 8)
- Firebase configuration (should use Node.js 22 runtime)
- Package.json engine requirements
- PNPM configuration files

#### Firebase Functions Performance Monitoring

For production environments, you can monitor Firebase Functions performance with the included monitoring tool:

```bash
# Basic monitoring (uses current Firebase project)
node monitor-functions.js

# Specify project ID
node monitor-functions.js --project=your-project-id

# Specify monitoring duration (in minutes)
node monitor-functions.js --duration=60

# Specify output format
node monitor-functions.js --format=json
```

The monitoring tool provides:
- Function execution times
- Cold start detection
- Error tracking
- Memory and CPU usage metrics
- Detailed logs in JSON format

Monitoring data is stored in the `function-metrics` directory for later analysis.

**Reference:**
- [Node.js 22 Release Notes](https://nodejs.org/en/blog/release/v22.0.0)
- [Firebase Functions Node.js Runtime](https://firebase.google.com/docs/functions/manage-functions#set_nodejs_version)

## License

[MIT License](LICENSE)
