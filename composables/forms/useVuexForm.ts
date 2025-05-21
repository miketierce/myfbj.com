import { computed, onUnmounted } from 'vue'
import { useNuxtApp } from '#app'
import { useFirebaseApp } from '~/composables/utils/useFirebaseApp'
import type { DocumentReference } from 'firebase/firestore'

// Interface for Vuex form options
export interface VuexFormOptions<T> {
  formId: string
  initialState: T
  validationRules?: Record<string, (value: any) => boolean | string>
  submitHandler?: (formData: T) => Promise<any> | any
  resetAfterSubmit?: boolean
  // Firestore specific options
  useFirestore?: boolean
  docRef?: DocumentReference
  createIfNotExists?: boolean
  transformBeforeSave?: (data: T) => Record<string, any>
  transformAfterLoad?: (data: Record<string, any>) => T
}

/**
 * A composable for using Vuex with forms that's compatible with the existing form system
 * This allows gradual migration from the direct form system to Vuex
 */
export function useVuexForm<T extends Record<string, any>>(
  options: VuexFormOptions<T>
) {
  // Get store from Nuxt app
  const { $store } = useNuxtApp()

  const {
    formId,
    initialState,
    validationRules,
    useFirestore = false,
  } = options

  // Make sure we're using the same Firebase instance throughout the app
  const { firestore } = useFirebaseApp()

  // Initialize form in Vuex
  $store.dispatch('forms/initForm', {
    formId,
    initialData: initialState,
  })

  // If using Firestore, bind or load the data
  if (useFirestore && options.docRef) {
    const { docRef, transformAfterLoad } = options

    // Load initial data from Firestore
    $store.dispatch('forms/loadFormFromFirestore', {
      formId,
      docRef,
      initialState,
      transform: transformAfterLoad,
    })
  }

  // Create computed properties that bridge to Vuex state
  const formData = computed(() => {
    const formData = $store.state.forms.formData[formId] || {}
    return formData
  })

  const formErrors = computed(() => $store.state.forms.formErrors)
  const isSubmitting = computed(() => $store.state.forms.isSubmitting)
  const isValid = computed(() => $store.state.forms.isValid)
  const successMessage = computed(() => $store.state.forms.successMessage || '')
  const errorMessage = computed(() => $store.state.forms.errorMessage || '')
  const isPendingSave = computed(() => $store.state.forms.isPendingSave)
  const savingStatus = computed(() => $store.state.forms.savingStatus)
  const lastSaveTime = computed(() => $store.state.forms.lastSaveTime)

  // Validation method
  const validateField = (field: string) => {
    if (!validationRules || !validationRules[field]) return true

    return $store.dispatch('forms/validateField', {
      field,
      validationRules,
    })
  }

  // Validate all fields
  const validateAllFields = () => {
    return $store.dispatch('forms/validateAllFields', validationRules)
  }

  // Handle form submission
  const handleSubmit = async () => {
    return await $store.dispatch('forms/submitForm', {
      validationRules,
      submitHandler: options.submitHandler,
      resetAfterSubmit: options.resetAfterSubmit,
      initialData: initialState,
    })
  }

  // Reset form
  const resetForm = () => {
    $store.dispatch('forms/resetForm', initialState)
  }

  // Save to Firestore (for Firestore forms)
  const saveToFirestore = async () => {
    if (!useFirestore || !options.docRef) return false

    return await $store.dispatch('forms/saveFormToFirestore', {
      docRef: options.docRef,
      createIfNotExists: options.createIfNotExists ?? true,
      transform: options.transformBeforeSave,
    })
  }

  // Update form field
  const updateField = (field: keyof T, value: any) => {
    $store.dispatch('forms/updateFormField', {
      formId,
      field,
      value,
    })
  }

  // Update multiple fields
  const updateFields = (fields: Partial<T>) => {
    $store.dispatch('forms/updateFormFields', {
      formId,
      fields,
    })
  }

  // Cleanup function (for component unmount)
  const cleanup = () => {
    // Reset active form ID when component unmounts
    $store.commit('forms/SET_ACTIVE_FORM_ID', null)
  }

  // Automatically clean up when component unmounts
  onUnmounted(() => {
    cleanup()
  })

  // Return the form API - matches the shape of your existing form API
  if (useFirestore) {
    return {
      formData,
      formErrors,
      isSubmitting,
      isValid,
      successMessage,
      errorMessage,
      validateField,
      validateAllFields,
      handleSubmit,
      resetForm,
      updateField,
      updateFields,
      cleanup,
      // Firestore specific
      isPendingSave,
      savingStatus,
      saveToFirestore,
      lastSaveTime,
    }
  } else {
    return {
      formData,
      formErrors,
      isSubmitting,
      isValid,
      successMessage,
      errorMessage,
      validateField,
      validateAllFields,
      handleSubmit,
      resetForm,
      updateField,
      updateFields,
      cleanup,
    }
  }
}
