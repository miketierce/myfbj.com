// Standard form handling composable - unified form system entry point
import { computed } from 'vue'
import {
  type FormOptions,
  type FormAPI,
  type FirestoreFormAPI,
  type BaseFormOptions,
} from './types'
import { createStandardAdapter } from './adapters/standard-adapter'
import { createFirestoreAdapter } from './adapters/firestore-adapter'
import { createVueFireAdapter } from './adapters/vuefire-adapter'
import { createVuexAdapter } from './adapters/vuex-adapter'
import { useNuxtApp } from '#app'

export type FormOptionsCompat<T> = Omit<BaseFormOptions<T>, 'mode'> & {
  // Allowing both legacy onSubmit and new submitHandler
  onSubmit?: (formData: T) => Promise<any> | any
}

/**
 * Standard form handling composable - compatible API with previous version
 */
export function useForm<T extends Record<string, any>>(
  options: FormOptionsCompat<T>
): FormAPI<T> {
  // Map to new options format
  const baseOptions: FormOptions<T> = {
    ...options,
    mode: 'standard',
    formId: options.formId || 'standard-form',
    // Use submitHandler as primary, but fall back to onSubmit for backward compatibility
    submitHandler: options.submitHandler || options.onSubmit,
  }

  // Use standard adapter directly
  return createStandardAdapter(baseOptions)
}

/**
 * Main entry point for the unified form system
 * Selects the appropriate adapter based on the options provided
 */
export function useUnifiedForm<T extends Record<string, any>>(
  options: FormOptions<T>
): FormAPI<T> | FirestoreFormAPI<T> {
  const nuxtApp = useNuxtApp()
  const { mode = 'standard', formId = 'default-form' } = options

  // Default to standard mode if no mode specified
  if (mode === 'standard') {
    return createStandardAdapter<T>(options)
  }

  // Firestore mode using native Firestore SDK
  if (mode === 'firestore') {
    return createFirestoreAdapter<T>(options)
  }

  // VueFire mode using VueFire's reactive system
  if (mode === 'vuefire') {
    return createVueFireAdapter<T>(options)
  }

  // Vuex mode for state management integration
  if (mode === 'vuex') {
    // Get Vuex store instance
    const store = nuxtApp.$store

    if (!store) {
      console.error('Vuex store not found. Make sure the store is initialized.')
      // Fall back to standard adapter
      return createStandardAdapter<T>(options)
    }

    return createVuexAdapter<T>({
      ...options,
      store,
      namespace: 'forms', // Default to 'forms' namespace
      formId,
    })
  }

  // Default fallback to standard adapter
  console.warn(`Unknown form mode: ${mode}. Falling back to standard mode.`)
  return createStandardAdapter<T>(options)
}
