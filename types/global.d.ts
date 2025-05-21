// Types augmentations for global window object
interface Window {
  // Flag to track if VueFire has been detected
  __VUEFIRE_DETECTED__?: boolean
}

// Extend process type
declare namespace NodeJS {
  interface ProcessEnv {
    USE_FIREBASE_EMULATORS?: string
    NODE_ENV: string
    DEPLOY_ENV?: string
  }
}
