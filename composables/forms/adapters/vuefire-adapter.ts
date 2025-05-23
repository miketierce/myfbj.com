import {
  ref,
  reactive,
  computed,
  watch,
  onBeforeUnmount,
  nextTick,
  toRef,
} from 'vue'
import { useDocument, useFirestore } from 'vuefire'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import type { DocumentReference } from 'firebase/firestore'
import type { FormOptions, FirestoreFormAPI } from '../types'

export function createVueFireAdapter<T extends Record<string, any>>(
  options: FormOptions<T>
): FirestoreFormAPI<T> {
  // Common form state
  const formDataRaw = reactive<T>({ ...options.initialState }) as T
  const formErrorsRaw = reactive<Record<string, string>>({})
  const isSubmittingRaw = ref(false)
  const isSubmittedRaw = ref(false)
  const submitCountRaw = ref(0)
  const successMessageRaw = ref('')
  const errorMessageRaw = ref('')
  const isLoadingRaw = ref(true)
  const isValidRaw = ref(true)

  // Firestore-specific state
  const isPendingSaveRaw = ref(false)
  const loadErrorRaw = ref<string | null>(null)
  const dirtyFieldsRaw = ref<Set<string>>(new Set())
  const lastSaveTimeRaw = ref<number | null>(null)
  const lastChangeTimeRaw = ref<number | null>(null)
  const originalDataRaw = ref<T>({ ...options.initialState })
  const savingStatusRaw = ref('unchanged')

  // Get Firestore instance from VueFire
  const firestore = useFirestore()

  // Get document reference - either directly passed or constructed
  const docRef = options.docRef

  if (!docRef) {
    throw new Error('VueFire adapter requires a document reference')
  }

  // Use VueFire's useDocument composable for real-time data binding
  const { data, pending, error } = useDocument(docRef, {
    reset: false, // Don't reset to undefined when the document doesn't exist
  })

  // Debounce related
  let debounceTimeout: NodeJS.Timeout | null = null
  let consecutiveChanges = 0

  // Form status computed properties
  const isDirty = computed(() => dirtyFieldsRaw.value.size > 0)

  // Computed property to get array of changed field names
  const changedFields = computed(() => Array.from(dirtyFieldsRaw.value))

  // Validate a specific field
  const validateField = (fieldName: string) => {
    // Skip validation if no rules for this field
    if (!options.validationRules || !options.validationRules[fieldName]) {
      delete formErrorsRaw[fieldName]
      return true
    }

    const result = options.validationRules[fieldName](formDataRaw[fieldName])

    // If validation returns a string, it's an error message
    if (typeof result === 'string') {
      formErrorsRaw[fieldName] = result
      isValidRaw.value = false
      return false
    } else {
      // Remove error if field is valid
      delete formErrorsRaw[fieldName]

      // Check if all fields are valid
      isValidRaw.value = Object.keys(formErrorsRaw).length === 0
      return true
    }
  }

  // Validate all fields
  const validateAllFields = () => {
    let allValid = true

    // Skip validation if no rules
    if (!options.validationRules) {
      return true
    }

    // Validate each field with a validation rule
    for (const fieldName of Object.keys(options.validationRules)) {
      const isFieldValid = validateField(fieldName)
      if (!isFieldValid) {
        allValid = false
      }
    }

    isValidRaw.value = allValid
    return allValid
  }

  // Mark a field as dirty (changed from original)
  const markFieldDirty = (fieldName: string) => {
    dirtyFieldsRaw.value.add(fieldName)
    validateField(fieldName)
    lastChangeTimeRaw.value = Date.now()
    savingStatusRaw.value = 'unsaved'

    // Increment consecutive changes count
    consecutiveChanges++
  }

  // Reset form to original/initial state
  const resetForm = () => {
    // Reset form data to initial state
    Object.keys(options.initialState).forEach((key) => {
      formDataRaw[key as keyof T] = options.initialState[key]
    })

    // Clear all errors
    Object.keys(formErrorsRaw).forEach((key) => {
      delete formErrorsRaw[key]
    })

    // Reset submission state
    isSubmittedRaw.value = false
    successMessageRaw.value = ''
    errorMessageRaw.value = ''

    // Clear tracking state for Firestore
    dirtyFieldsRaw.value.clear()
    isPendingSaveRaw.value = false
    consecutiveChanges = 0
    savingStatusRaw.value = 'unchanged'

    // Cancel any pending save
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
      debounceTimeout = null
    }
  }

  // Update a single field
  const updateField = (field: keyof T, value: any) => {
    formDataRaw[field] = value
    markFieldDirty(field as string)
  }

  // Update multiple fields
  const updateFields = (fields: Partial<T>) => {
    Object.entries(fields).forEach(([key, value]) => {
      formDataRaw[key as keyof T] = value
      markFieldDirty(key)
    })
  }

  // Save form data to Firestore
  const saveToFirestore = async () => {
    if (!docRef) {
      errorMessageRaw.value = 'No document reference provided'
      isPendingSaveRaw.value = false
      return false
    }

    if (dirtyFieldsRaw.value.size === 0) {
      // No changes to save
      isPendingSaveRaw.value = false
      return true
    }

    // Validate all fields before saving
    if (!validateAllFields()) {
      errorMessageRaw.value = 'Please fix validation errors before saving'
      isPendingSaveRaw.value = false
      return false
    }

    try {
      isSubmittingRaw.value = true
      isPendingSaveRaw.value = false
      errorMessageRaw.value = ''
      savingStatusRaw.value = 'saving'

      // Create data object with only changed fields
      const updateData: Partial<T> = {}

      for (const field of dirtyFieldsRaw.value) {
        updateData[field as keyof T] = formDataRaw[field]
      }

      // Transform data before saving if needed
      const processedData = options.transformBeforeSave
        ? options.transformBeforeSave({
            ...updateData,
          } as T)
        : updateData

      // Check if the document exists using VueFire's data
      if (data.value) {
        // Update existing document with changed fields
        await updateDoc(docRef, processedData)
      } else if (options.createIfNotExists) {
        // Create new document - use all form data for initial creation
        const fullData = options.transformBeforeSave
          ? options.transformBeforeSave(formDataRaw)
          : formDataRaw
        await setDoc(docRef, fullData)
      } else {
        throw new Error(
          'Document does not exist and createIfNotExists is false'
        )
      }

      // Update last save time
      lastSaveTimeRaw.value = Date.now()
      savingStatusRaw.value = 'saved'

      // Clear dirty fields as they're now saved
      dirtyFieldsRaw.value.clear()

      // Update original data with new values
      originalDataRaw.value = JSON.parse(JSON.stringify(formDataRaw))

      successMessageRaw.value = 'Changes saved successfully'

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        if (successMessageRaw.value === 'Changes saved successfully') {
          successMessageRaw.value = ''
        }
      }, 3000)

      return true
    } catch (error: any) {
      console.error('Error saving to Firestore:', error)
      errorMessageRaw.value = `Failed to save changes: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
      savingStatusRaw.value = 'error'
      return false
    } finally {
      isSubmittingRaw.value = false
    }
  }

  // Submit form handler
  const handleSubmit = async () => {
    isSubmittingRaw.value = true
    errorMessageRaw.value = ''
    successMessageRaw.value = ''

    try {
      // Validate the form first
      const isFormValid = validateAllFields()

      if (!isFormValid) {
        errorMessageRaw.value = 'Please fix the form errors before submitting.'
        isSubmittingRaw.value = false
        return false
      }

      // Save any pending changes to Firestore
      const saveResult = await saveToFirestore()
      if (!saveResult) {
        return false
      }

      let result: { success: boolean; message?: string } | boolean = true

      // Call the submit handler if provided
      if (options.submitHandler) {
        result = await options.submitHandler(formDataRaw)

        // Handle result object with success/message properties
        if (result && typeof result === 'object' && 'success' in result) {
          if (result.success && result.message) {
            successMessageRaw.value = result.message
          } else if (!result.success && result.message) {
            errorMessageRaw.value = result.message
            return false
          }
        }
      }

      // Update form state based on submit result
      isSubmittedRaw.value = true
      submitCountRaw.value++

      // Reset form if configured to do so
      if (options.resetAfterSubmit) {
        resetForm()
      }

      return result
    } catch (error: any) {
      errorMessageRaw.value = error.message || 'An unexpected error occurred'
      return false
    } finally {
      isSubmittingRaw.value = false
    }
  }

  // INITIALIZATION AND WATCHERS
  // --------------------------

  // Watch for VueFire document data changes
  watch(
    data,
    (newData) => {
      if (newData && !isSubmittingRaw.value) {
        isLoadingRaw.value = false

        // Transform data if needed
        const transformedData = options.transformAfterLoad
          ? options.transformAfterLoad(newData)
          : (newData as T)

        // Merge with initial state to ensure we have all required fields
        const mergedData = { ...options.initialState, ...transformedData }

        // Store fields currently being edited by user
        const editingFields = new Set(dirtyFieldsRaw.value)

        // Update form data without overwriting fields being edited
        for (const key in mergedData) {
          if (!editingFields.has(key)) {
            formDataRaw[key] = mergedData[key]
          }
        }

        // Store the original data
        originalDataRaw.value = JSON.parse(JSON.stringify(mergedData))
      }
    },
    { immediate: true }
  )

  // Watch for VueFire loading state
  watch(pending, (isPending) => {
    isLoadingRaw.value = isPending
  })

  // Watch for VueFire errors
  watch(error, (err) => {
    if (err) {
      loadErrorRaw.value = err.message
      console.error('VueFire document error:', err)
    } else {
      loadErrorRaw.value = null
    }
  })

  // Set up watchers for form fields
  const setupFieldWatchers = () => {
    // Watch each field in the form
    for (const key in formDataRaw) {
      watch(
        () => formDataRaw[key],
        () => {
          // Record that this field has changed
          markFieldDirty(key)
        },
        { deep: true }
      )
    }
  }

  // Set up watchers after next tick to avoid immediate triggers
  nextTick(() => {
    setupFieldWatchers()
  })

  // Clean up function to remove listeners
  const cleanup = () => {
    // Cancel any pending operations
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }

    isPendingSaveRaw.value = false
    consecutiveChanges = 0
  }

  // Clean up on component unmount
  onBeforeUnmount(() => {
    cleanup()
  })

  // Convert reactive objects to refs to match interface
  const formData = toRef(() => formDataRaw)
  const formErrors = toRef(() => formErrorsRaw)

  // Return the API with proper Ref types to match the interface
  return {
    formData,
    formErrors,
    isSubmitting: isSubmittingRaw,
    isValid: isValidRaw,
    successMessage: successMessageRaw,
    errorMessage: errorMessageRaw,
    validateField,
    validateAllFields,
    handleSubmit,
    resetForm,
    updateField,
    updateFields,
    cleanup,
    // Firestore specific
    isPendingSave: isPendingSaveRaw,
    savingStatus: savingStatusRaw,
    saveToFirestore,
    lastSaveTime: lastSaveTimeRaw,
  }
}
