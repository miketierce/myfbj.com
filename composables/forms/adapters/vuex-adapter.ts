import { watch, ref, computed, onUnmounted } from 'vue'
import { createStandardAdapter } from './standard-adapter'
import type { BaseFormOptions, VuexFormAPI } from '../types'
import { useNuxtApp } from '#app'

/**
 * Vuex form adapter - integrates with Vuex store for form state management
 */
export function createVuexAdapter<T extends Record<string, any>>(
  options: BaseFormOptions<T> & {
    store: any // Vuex store instance
    namespace?: string // Optional Vuex module namespace
    syncImmediately?: boolean
  }
): VuexFormAPI<T> {
  // Create the base form using standard adapter
  const baseForm = createStandardAdapter<T>(options)

  const {
    store,
    namespace = 'forms',
    formId = 'default-form',
    syncImmediately = true,
  } = options

  // Check if store is available
  if (!store) {
    console.error('Vuex store is required for Vuex form adapter')
    return baseForm
  }

  // Check if forms module exists in store
  if (!store.state[namespace]) {
    console.error(
      `Vuex module '${namespace}' not found. Make sure it's registered.`
    )
    return baseForm
  }

  // Initialize form data in Vuex store if not already present
  if (store.state[namespace] && !store.state[namespace].formData[formId]) {
    store.dispatch(`${namespace}/initForm`, {
      formId,
      initialData: { ...options.initialState },
    })
  }

  // Load initial data from store if it exists
  if (store.state[namespace].formData[formId]) {
    const storeFormData = store.state[namespace].formData[formId]
    baseForm.updateFields(storeFormData)
    baseForm.isDirty.value = false
  }

  // Create computed properties that bridge to Vuex state
  const formData = computed(() => {
    const formData = store.state.forms.formData[formId] || {}
    return formData
  })

  const formErrors = computed(() => store.state.forms.formErrors)
  const isSubmitting = computed(() => store.state.forms.isSubmitting)
  const isValid = computed(() => store.state.forms.isValid)
  const successMessage = computed(() => store.state.forms.successMessage || '')
  const errorMessage = computed(() => store.state.forms.errorMessage || '')
  const isPendingSave = computed(() => store.state.forms.isPendingSave)
  const savingStatus = computed(() => store.state.forms.savingStatus)
  const lastSaveTime = computed(() => store.state.forms.lastSaveTime)
  const isDirty = computed(() => store.state.forms.isDirty)
  const changedFields = computed(() => store.state.forms.changedFields || [])

  // Validation method
  const validateField = (field: string) => {
    if (!options.validationRules || !options.validationRules[field]) return true

    return store.dispatch('forms/validateField', {
      formId,
      field,
      validationRules: options.validationRules,
    })
  }

  // Validate all fields
  const validateAllFields = () => {
    return store.dispatch('forms/validateAllFields', {
      formId,
      validationRules: options.validationRules,
    })
  }

  // Handle form submission
  const handleSubmit = async () => {
    return await store.dispatch('forms/submitForm', {
      formId,
      validationRules: options.validationRules,
      submitHandler: options.submitHandler,
      resetAfterSubmit: options.resetAfterSubmit,
      initialData: options.initialState,
    })
  }

  // Reset form
  const resetForm = () => {
    store.dispatch('forms/resetForm', {
      formId,
      initialState: options.initialState,
    })
  }

  // Save to Firestore (for Firestore forms)
  const saveToFirestore = async () => {
    if (!options.docRef) return false

    return await store.dispatch('forms/saveFormToFirestore', {
      formId,
      docRef: options.docRef,
      createIfNotExists: options.createIfNotExists ?? true,
      transform: options.transformBeforeSave,
    })
  }

  // Update form field
  const updateField = (field: keyof T, value: any) => {
    store.dispatch(`${namespace}/updateField`, {
      field,
      value,
    })
  }

  // Update multiple fields
  const updateFields = (fields: Partial<T>) => {
    // Since there's no dedicated action for updating multiple fields,
    // update each field individually
    Object.entries(fields).forEach(([field, value]) => {
      store.dispatch(`${namespace}/updateField`, {
        field,
        value,
      })
    })
  }

  // Mark field as dirty
  const markFieldDirty = (field: string) => {
    store.dispatch('forms/markFieldDirty', {
      formId,
      field,
    })
  }

  // Cleanup function (for component unmount)
  const cleanup = () => {
    // Reset active form ID when component unmounts
    store.commit('forms/SET_ACTIVE_FORM_ID', null)
  }

  // Automatically clean up when component unmounts
  onUnmounted(() => {
    cleanup()
  })

  // Watch for store changes if form might be updated from elsewhere
  const stopWatching = store.watch(
    (state: any) => state[namespace].formData[formId],
    (newVal: any) => {
      if (newVal && !baseForm.isSubmitting.value) {
        // Update local form with store data
        Object.entries(newVal).forEach(([key, value]) => {
          if (key in baseForm.formData && baseForm.formData[key] !== value) {
            baseForm.formData[key] = value
          }
        })
      }
    },
    { deep: true }
  )

  // Cleanup function to remove store watchers
  const cleanupWatchers = () => {
    if (stopWatching && typeof stopWatching === 'function') {
      stopWatching()
    }
  }

  // Return enhanced form API with Vuex integration
  return {
    ...baseForm,
    updateField,
    updateFields,
    handleSubmit,
    resetForm,
    cleanup,
    // Firestore specific
    saveToFirestore,
    isPendingSave,
    savingStatus,
    lastSaveTime,
    markFieldDirty,
    changedFields,
  }
}
