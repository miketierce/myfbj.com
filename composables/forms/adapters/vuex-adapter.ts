import { computed, onUnmounted, toRef } from 'vue'
import { useNuxtApp } from '#app'
import { useFirebaseApp } from '~/composables/utils/useFirebaseApp'
import type { FormOptions, FormAPI, FirestoreFormAPI } from '../types'

export function createVuexAdapter<T extends Record<string, any>>(
  options: FormOptions<T>
): FormAPI<T> | FirestoreFormAPI<T> {
  // Get store from Nuxt app
  const { $store } = useNuxtApp()

  const { formId, initialState, validationRules, docRef } = options

  // Determine if we're using Firestore
  const useFirestore = !!docRef

  // Make sure we're using the same Firebase instance throughout the app
  const { firestore } = useFirebaseApp()

  // Initialize form in Vuex
  $store.dispatch('forms/initForm', {
    formId,
    initialData: initialState,
  })

  // If using Firestore, bind or load the data
  if (useFirestore && docRef) {
    const { transformAfterLoad } = options

    // Load initial data from Firestore
    $store.dispatch('forms/loadFormFromFirestore', {
      formId,
      docRef,
      initialState,
      transform: transformAfterLoad,
    })
  }

  // Create computed properties that bridge to Vuex state
  const formDataRaw = computed(() => {
    const formData = $store.state.forms.formData[formId] || {}
    return formData
  })

  const formErrorsRaw = computed(() => $store.state.forms.formErrors)
  const isSubmittingRaw = computed(() => $store.state.forms.isSubmitting)
  const isValidRaw = computed(() => $store.state.forms.isValid)
  const successMessageRaw = computed(
    () => $store.state.forms.successMessage || ''
  )
  const errorMessageRaw = computed(() => $store.state.forms.errorMessage || '')
  const isPendingSaveRaw = computed(() => $store.state.forms.isPendingSave)
  const savingStatusRaw = computed(() => $store.state.forms.savingStatus)
  const lastSaveTimeRaw = computed(() => $store.state.forms.lastSaveTime)

  // Convert computed properties to refs with proper types
  const formData = toRef(() => formDataRaw.value as T)
  const formErrors = toRef(() => formErrorsRaw.value as Record<string, string>)
  const isSubmitting = toRef(() => isSubmittingRaw.value as boolean)
  const isValid = toRef(() => isValidRaw.value as boolean)
  const successMessage = toRef(() => successMessageRaw.value as string)
  const errorMessage = toRef(() => errorMessageRaw.value as string)
  const isPendingSave = toRef(() => isPendingSaveRaw.value as boolean)
  const savingStatus = toRef(() => savingStatusRaw.value as string)
  const lastSaveTime = toRef(() => lastSaveTimeRaw.value as number | null)

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
    if (!useFirestore || !docRef) return false

    return await $store.dispatch('forms/saveFormToFirestore', {
      docRef: docRef,
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

  // Return the appropriate API based on whether we're using Firestore
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
