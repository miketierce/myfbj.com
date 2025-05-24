import type { Ref } from 'vue'
import { DocumentReference } from 'firebase/firestore'

/**
 * Form mode options for our unified form system
 */
export type FormMode = 'standard' | 'firestore' | 'vuefire' | 'vuex'

/**
 * Base form options that all adapters should support
 */
export interface BaseFormOptions<T> {
  initialState: T
  validationRules?: Record<string, (value: any) => boolean | string>
  submitHandler?: (formData: T) => Promise<SubmitResult> | SubmitResult
  resetAfterSubmit?: boolean
  formId?: string
}

/**
 * Extended options for forms that support Firestore
 */
export interface FirestoreFormOptions<T> extends BaseFormOptions<T> {
  docRef?: DocumentReference | null
  createIfNotExists?: boolean
  syncImmediately?: boolean
  debounceTime?: number
  progressiveSave?: boolean
  excludeFields?: string[]
  transformBeforeSave?: (data: T) => Record<string, any>
  transformAfterLoad?: (data: Record<string, any>) => Partial<T>
}

/**
 * Form options with specific mode selection
 */
export interface FormOptions<T> extends FirestoreFormOptions<T> {
  mode?: FormMode
}

/**
 * Result returned from form submission
 */
export interface SubmitResult {
  success: boolean
  message?: string
  data?: any
}

/**
 * Core form API that all form adapters must implement
 */
export interface FormAPI<T> {
  // Form state
  formData: T
  formErrors: Record<string, string>
  isSubmitting: Ref<boolean>
  isValid: Ref<boolean>
  successMessage: Ref<string>
  errorMessage: Ref<string>
  isDirty: Ref<boolean>

  // Form methods
  handleSubmit: () => Promise<boolean>
  validateField: (field: string) => boolean
  validateAllFields: () => boolean
  resetForm: () => void
  updateField: (field: string, value: any) => void
  updateFields: (fields: Partial<T>) => void
  cleanup: () => void
}

/**
 * Extended API for Firestore-based forms
 */
export interface FirestoreFormAPI<T> extends FormAPI<T> {
  saveToFirestore: () => Promise<boolean>
  isPendingSave?: Ref<boolean>
  savingStatus?: Ref<'saving' | 'saved' | 'error' | 'unsaved' | 'pending'>
  markFieldDirty: (field: string) => void
  changedFields: string[]
  isLoading?: Ref<boolean>
  lastSaveTime?: Ref<number | null>
}

/**
 * Extended API for VueFire-based forms
 */
export interface VueFireFormAPI<T> extends FirestoreFormAPI<T> {
  // VueFire specific extensions could be added here
}

/**
 * Extended API for Vuex-based forms
 */
export interface VuexFormAPI<T> extends FormAPI<T> {
  // Vuex specific extensions
}
