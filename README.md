# Nuxt App with Firebase, VueFire, and Vuex

This project is a Nuxt 3 application with Firebase integration using both VueFire and Vuex. It provides a robust foundation for building web applications with Firebase backend services.

## Getting Started

This section guides new developers on setting up and running the project.

**Prerequisites:**

*   **Node.js:** Version 22 or higher. We recommend using [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm) to manage Node.js versions.
*   **pnpm:** Version 8 or higher.
*   **Firebase CLI:** Version 13.48.0 or higher.
*   **Git:** For version control.
*   **(Optional) Docker:** For containerized development.

**Initial Setup Steps:**

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd <your-project-name>
    ```

2.  **Run the Development Setup Script:**
    This script will attempt to:
    *   Verify and/or set up the correct Node.js version (using `nvm` if available).
    *   Install or update `pnpm` to the required version.
    *   Install or update Firebase CLI.
    *   Install project dependencies.
    ```bash
    ./setup-dev.sh
    ```
    If the script encounters issues (e.g., `nvm` not found), it will provide guidance. You might need to install `nvm` manually first:
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    ```
    Then, source `nvm` and try the `./setup-dev.sh` script again.

3.  **Firebase Configuration:**
    *   Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
    *   Create a web app in your Firebase project.
    *   Copy your Firebase project configuration (apiKey, authDomain, etc.).
    *   Create `config/firebase.config.js` (this file is gitignored) and add your configuration:
        ```javascript
        // /config/firebase.config.js
        export default {
          apiKey: "YOUR_API_KEY",
          authDomain: "your-project.firebaseapp.com",
          projectId: "your-project",
          storageBucket: "your-project.appspot.com",
          messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
          appId: "YOUR_APP_ID"
          // measurementId: "YOUR_MEASUREMENT_ID" // Optional
        };
        ```
    *   **(Server-Side Features)** For features requiring admin privileges (like some server routes or Firebase Admin SDK usage in `nuxt.config.ts` for VueFire):
        *   Go to your Firebase Project Settings -> Service accounts.
        *   Generate a new private key and download the JSON file.
        *   Save this file as `service-account.json` in the root of your project (this file is gitignored).

4.  **Environment Variables:**
    *   Copy the example environment file:
        ```bash
        cp .env-example .env
        ```
    *   Review and update `.env` with your local development settings. Key variables include:
        *   `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, etc. (if you prefer to manage them via env vars for the client-side part of Firebase, though `firebase.config.js` is also used).
        *   `FIREBASE_PROJECT_ID` (can be useful for scripts or server-side logic).
        *   `FIREBASE_USE_EMULATOR=true` (if you plan to use Firebase Emulators).
    *   For different deployment environments, you'll also use `.env.dev` and `.env.prod`.

5.  **FontAwesome Pro Setup (If Applicable):**
    This project might be configured to use FontAwesome Pro. If so:
    *   Copy the template `.npmrc.example` file to `.npmrc`:
        ```bash
        cp .npmrc.example .npmrc
        ```
    *   Edit the `.npmrc` file and replace `YOUR_TOKEN` with your actual FontAwesome Pro token.
        ```
        @awesome.me:registry=https://npm.fontawesome.com/
        @fortawesome:registry=https://npm.fontawesome.com/
        //npm.fontawesome.com/:_authToken=YOUR_ACTUAL_TOKEN
        ```
    *   Your `.npmrc` is gitignored. For CI/CD, the token is usually stored as a secret (e.g., `FONTAWESOME_TOKEN`).

6.  **Install Dependencies (if not already done by `setup-dev.sh`):**
    ```bash
    pnpm install
    ```

**Running the Development Server:**

*   **With Firebase Emulators (Recommended for full backend testing):**
    ```bash
    pnpm dev:emulators
    ```
    This starts the Firebase emulators and then the Nuxt development server. The app will be available at `http://localhost:3000`. Emulators UI is usually at `http://localhost:4000`.

*   **Nuxt Development Server Only:**
    ```bash
    pnpm dev
    ```
    The app will be available at `http://localhost:3000`.

**Key Scripts:**

*   `pnpm dev`: Starts the Nuxt development server.
*   `pnpm build`: Builds the application for production.
*   `pnpm preview`: Locally previews the production build.
*   `pnpm emulators`: Starts Firebase emulators.
*   `pnpm dev:emulators`: Starts emulators and the dev server.
*   `./setup-dev.sh`: Runs the initial development environment setup.
*   `pnpm verify:node22`: Checks if Node.js and pnpm versions meet project requirements.

## Project Structure Overview

This project now uses a `src/` directory for most of its Nuxt-related application code.

**Root Directory Structure:**

The following table describes the main files and folders remaining in the project's root directory:

| File/Folder             | Description                                                                                                |
| :---------------------- | :--------------------------------------------------------------------------------------------------------- |
| `.data/`                | Used for local data storage, often by Firebase emulators or other development tools. (Gitignored)        |
| `.env`                  | Local environment variables. (Gitignored)                                                                  |
| `.env-example`          | Example environment file, a template for `.env`.                                                           |
| `.env.dev`              | Environment variables for development-specific builds/deployments.                                           |
| `.env.prod`             | Environment variables for production-specific builds/deployments.                                            |
| `.git/`                 | Git version control system directory.                                                                      |
| `.github/`              | GitHub specific files, typically for workflows (CI/CD), issue templates, etc.                              |
| `.gitignore`            | Specifies intentionally untracked files that Git should ignore.                                            |
| `.node-version`         | Used by version managers like `asdf` to specify the Node.js version for the project.                       |
| `.npmrc`                | Configuration file for npm; pnpm can also use it for certain settings (e.g., FontAwesome token).           |
| `.nuxt/`                | Nuxt.js build directory, generated during development and build. (Gitignored)                              |
| `.nvmrc`                | Specifies the Node.js version for NVM (Node Version Manager).                                              |
| `.output/`              | Default Nuxt 3 build output directory. (Gitignored)                                                        |
| `.pnpmrc`               | Configuration file for pnpm.                                                                               |
| `NODE22-MIGRATION.md`   | Markdown document detailing the migration to Node.js 22.                                                   |
| `README.md`             | This file: provides information about the project.                                                         |
| `VUEX-INTEGRATION.md`   | Markdown document explaining Vuex integration details.                                                     |
| `config/`               | Contains project-specific configurations, notably `firebase.config.js`.                                    |
| `devEnv_base64.txt`     | Base64 encoded development environment variables, typically for CI/CD pipeline injection. (Gitignored)     |
| `docker-compose.yml`    | Docker Compose file for defining and running multi-container Docker applications.                          |
| `eslint.config.mjs`     | ESLint (linter) configuration file (JavaScript module format).                                             |
| `firebase.json`         | Firebase project configuration (hosting rules, functions deployment settings, emulator settings, etc.).    |
| `firestore.indexes.json`| Defines Firestore database indexes for optimal query performance.                                          |
| `firestore.rules`       | Security rules for Firestore, defining data access permissions.                                            |
| `functions/`            | Directory for Firebase Cloud Functions source code (Node.js environment).                                  |
| `monitor-functions.js`  | Script for monitoring Firebase Cloud Functions performance.                                                |
| `node_modules/`         | Directory where project dependencies are installed by pnpm. (Gitignored)                                   |
| `nuxt.config.ts`        | Main Nuxt.js configuration file. Defines modules, plugins, build settings, runtime config, etc.            |
| `package.json`          | Defines project metadata, dependencies (npm/pnpm packages), and scripts.                                   |
| `pnpm-lock.yaml`        | Pnpm lockfile, ensures consistent and reproducible dependency installs across all environments.            |
| `pnpm-workspace.yaml`   | Pnpm workspace configuration file (if using pnpm workspaces for monorepo setup).                           |
| `prodEnv_base64.txt`    | Base64 encoded production environment variables, for CI/CD. (Gitignored)                                   |
| `scripts/`              | Contains utility scripts for the project (e.g., `configure-storage-cors.js`).                              |
| `service-account.json`  | Firebase service account credentials (JSON key file) for server-side admin access. (Gitignored)            |
| `setup-dev.sh`          | Shell script for automating the initial development environment setup.                                     |
| `storage.rules`         | Security rules for Firebase Cloud Storage.                                                                 |
| `tsconfig.json`         | TypeScript configuration file for the project root (global settings, references).                          |
| `verify-node22.js`      | Script to verify that the Node.js 22 environment is correctly set up.                                      |

**`src/` Directory Structure:**

The `src/` directory now contains the core Nuxt application code:

```
src/
├── assets/            # Static assets (SCSS, global CSS, images not in public/)
├── components/        # Reusable Vue components
├── composables/       # Vue 3 composables (shared reactive logic)
├── content/           # Markdown or other content files (if using @nuxt/content or similar)
├── layouts/           # Nuxt page layouts
├── middleware/        # Nuxt route middleware
├── pages/             # Application pages (defines routes)
├── plugins/           # Nuxt plugins (Vue plugins, global utilities)
├── public/            # Static files served directly from the root (e.g., favicon.ico, robots.txt)
├── server/            # Server-side API routes and middleware (Nitro server engine)
├── store/             # Vuex store modules (if using Vuex)
├── types/             # TypeScript type definitions specific to the Nuxt app
├── app.html           # Main HTML template for Nuxt pages (if app.html.bak is renamed)
├── content.config.ts  # Configuration for @nuxt/content (if used)
└── vuetify.config.ts  # Configuration for Vuetify
```

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

## Deployment

To deploy this Nuxt app with Firebase integration, you have multiple options:

1. **Firebase Hosting (Recommended)**: For deploying the app as a static site with Firebase's global CDN.
2. **Vercel**: For deploying as a server-rendered app with Vercel's platform.
3. **Netlify**: For deploying as a static site with Netlify's platform.
4. **Docker**: For containerized deployment on any platform that supports Docker.

### Firebase Hosting Setup

To deploy to Firebase Hosting:

1. Install Firebase CLI if you haven't already:
   ```bash
   npm install -g firebase-tools@14.6.0
   ```

   > **Note:** This project uses Firebase Tools v14.6.0 and requires Node.js 22
   > - The project has been upgraded to use Node.js 22 with PNPM 8
   > - Firebase Tools v14+ is fully compatible with Node.js 22
   > - See NODE22-MIGRATION.md for more details about the upgrade

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

### Vercel Deployment

To deploy on Vercel:

1. Push your code to a GitHub repository.
2. Import your GitHub repository in Vercel.
3. Set the framework preset to "Next.js".
4. Set up environment variables in Vercel's dashboard.
5. Deploy the site.

Vercel will automatically detect the Nuxt.js framework and configure the deployment settings.

### Netlify Deployment

To deploy on Netlify:

1. Push your code to a GitHub repository.
2. Import your GitHub repository in Netlify.
3. Set the build command to `nuxt generate` and the publish directory to `dist`.
4. Set up environment variables in Netlify's dashboard.
5. Deploy the site.

Netlify will build the site as a static site using the generated files.

### Docker Deployment

To deploy using Docker:

1. Build the Docker image:
   ```bash
   docker build -t your-image-name .
   ```

2. Run the Docker container:
   ```bash
   docker run -p 3000:3000 your-image-name
   ```

3. Access the app at `http://localhost:3000`.

For production, consider using Docker Compose or Kubernetes for orchestration.

### CI/CD with GitHub Actions

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
- Firebase Tools @latest (fully compatible with Node.js 22)
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
# Workflow test Fri 06 Jun 2025 09:14:50 PM CDT
# Testing dynamic project ID resolution from dev secrets
