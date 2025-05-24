// Export all form system components

// Main form interfaces and types
export * from './types'

// Form system entry points
export { useForm, useUnifiedForm } from './useForm'

// Deprecation warnings for legacy form composables
// These exports will be removed in a future version
import { type FirestoreFormOptions, type FormOptions } from './types'
import { createFirestoreAdapter } from './adapters/firestore-adapter'
import { createVuexAdapter } from './adapters/vuex-adapter'

// DEPRECATED: Use useUnifiedForm with mode='firestore' instead
export function useFirestoreForm<T extends Record<string, any>>(
  options: FirestoreFormOptions<T>
) {
  console.warn(
    'DEPRECATED: useFirestoreForm is deprecated. Use useUnifiedForm with mode="firestore" instead.'
  )
  return createFirestoreAdapter({
    ...options,
    formId: options.formId || `firestore-${Date.now()}`,
    mode: 'firestore',
  })
}

// DEPRECATED: Use useUnifiedForm with mode='vuex' instead
export function useVuexForm<T extends Record<string, any>>(
  options: FormOptions<T> & {
    store?: any
    namespace?: string
  }
) {
  console.warn(
    'DEPRECATED: useVuexForm is deprecated. Use useUnifiedForm with mode="vuex" instead.'
  )
  return createVuexAdapter({
    ...options,
    formId: options.formId || `vuex-${Date.now()}`,
    mode: 'vuex',
  })
}

// Specialized form composables (these are still maintained)
export { useAuthenticatedForm } from './useAuthenticatedForm'
export { useProfileForm } from './useProfileForm'
export { useUserSettingsForm } from './useUserSettingsForm'
export { useProfileGallery } from './useProfileGallery'
export { useValidation } from './useValidation'

// Export adapters for direct access (advanced use cases)
export { createStandardAdapter } from './adapters/standard-adapter'
export { createFirestoreAdapter } from './adapters/firestore-adapter'
export { createVueFireAdapter } from './adapters/vuefire-adapter'
export { createVuexAdapter } from './adapters/vuex-adapter'
