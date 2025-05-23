// Standard form handling composable - wrapper around useFormBase
import { computed } from 'vue'
import { useFormBase, type BaseFormOptions } from './useFormBase'
import { type FormOptions, type FormAPI, type FirestoreFormAPI } from './types'
import { createStandardAdapter } from './adapters/standard-adapter'
import { createFirestoreAdapter } from './adapters/firestore-adapter'
import { createVueFireAdapter } from './adapters/vuefire-adapter'
import { createVuexAdapter } from './adapters/vuex-adapter'

export type FormOptionsCompat<T> = Omit<BaseFormOptions<T>, 'mode'> & {
  // Allowing both legacy onSubmit and new submitHandler
  onSubmit?: (formData: T) => Promise<any> | any
}

/**
 * Standard form handling composable - compatible API with previous version
 * This is now a wrapper around useFormBase for backward compatibility
 */
export function useForm<T extends Record<string, any>>(
  options: FormOptionsCompat<T>
) {
  // Map to new options format
  const baseOptions: BaseFormOptions<T> = {
    ...options,
    mode: 'standard',
    // Use submitHandler as primary, but fall back to onSubmit for backward compatibility
    submitHandler: options.submitHandler || options.onSubmit,
  }

  // Use unified base form implementation
  return useFormBase(baseOptions)
}

/**
 * Unified form composable that supports multiple backends:
 * - 'standard': Simple in-component form state
 * - 'firestore': Direct Firestore integration
 * - 'vuefire': Firestore integration via VueFire
 * - 'vuex': Legacy Vuex integration for compatibility
 *
 * @example
 * // Standard form
 * const form = useUnifiedForm({
 *   formId: 'contact-form',
 *   initialState: { name: '', email: '' },
 *   validationRules: {
 *     name: v => !!v || 'Name is required'
 *   }
 * })
 *
 * @example
 * // Firestore form
 * const form = useUnifiedForm({
 *   formId: 'user-profile',
 *   mode: 'firestore',
 *   docRef: doc(firestore, 'users', userId),
 *   initialState: { displayName: '', bio: '' }
 * })
 *
 * @example
 * // VueFire form
 * const form = useUnifiedForm({
 *   formId: 'settings',
 *   mode: 'vuefire',
 *   docRef: doc(firestore, 'settings', userId),
 *   initialState: { theme: 'light', notifications: true }
 * })
 *
 * @example
 * // Vuex form (legacy)
 * const form = useUnifiedForm({
 *   formId: 'vuex-form',
 *   mode: 'vuex',
 *   initialState: { username: '' }
 * })
 */
export function useUnifiedForm<T extends Record<string, any>>(
  options: FormOptions<T>
): FormAPI<T> | FirestoreFormAPI<T> {
  const { mode = 'standard', docRef } = options

  // Auto-detect mode if not specified but docRef is provided
  const effectiveMode = mode === 'standard' && docRef ? 'firestore' : mode

  // Select the appropriate adapter based on mode
  switch (effectiveMode) {
    case 'firestore':
      return createFirestoreAdapter(options)
    case 'vuefire':
      return createVueFireAdapter(options)
    case 'vuex':
      return createVuexAdapter(options)
    default:
      return createStandardAdapter(options)
  }
}
