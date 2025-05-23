import type { Ref } from 'vue'
import type { DocumentReference } from 'firebase/firestore'

// Unified form mode type
export type FormMode = 'standard' | 'firestore' | 'vuefire' | 'vuex'

// Base options interface all forms share
export interface BaseFormOptions<T> {
  formId: string
  initialState: T
  validationRules?: Record<string, (value: any) => boolean | string>
  submitHandler?: (formData: T) => Promise<any> | any
  resetAfterSubmit?: boolean
}

// Firestore-specific options
export interface FirestoreOptions<T> {
  docRef?: DocumentReference
  createIfNotExists?: boolean
  transformBeforeSave?: (data: T) => Record<string, any>
  transformAfterLoad?: (data: Record<string, any>) => T
}

// Unified form options
export interface FormOptions<T>
  extends BaseFormOptions<T>,
    FirestoreOptions<T> {
  mode?: FormMode
}

// Common form API that all adapters will implement
export interface FormAPI<T> {
  formData: Ref<T>
  formErrors: Ref<Record<string, string>>
  isSubmitting: Ref<boolean>
  isValid: Ref<boolean>
  successMessage: Ref<string>
  errorMessage: Ref<string>
  validateField: (field: string) => boolean | string
  validateAllFields: () => boolean
  handleSubmit: () => Promise<any>
  resetForm: () => void
  updateField: (field: keyof T, value: any) => void
  updateFields: (fields: Partial<T>) => void
  cleanup: () => void
}

// Extended API for Firestore forms
export interface FirestoreFormAPI<T> extends FormAPI<T> {
  isPendingSave: Ref<boolean>
  savingStatus: Ref<string>
  saveToFirestore: () => Promise<boolean>
  lastSaveTime: Ref<number | null>
}
