// filepath: /home/mike/Documents/Code/new-nuxt/composables/forms/useVueFireForm.ts
import { ref, reactive, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { useDocument, useFirestore } from 'vuefire'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import type { DocumentReference, Firestore } from 'firebase/firestore'

// Same interface as your existing FirestoreFormOptions
export interface VueFireFormOptions<T> {
  initialState: T
  docRef?: DocumentReference
  docPath?: string
  collectionName?: string
  documentId?: string
  validationRules?: Record<string, (value: any) => boolean | string>
  submitHandler?: (formData: T) => Promise<any> | any
  createIfNotExists?: boolean
  syncImmediately?: boolean
  debounceTime?: number
  excludeFields?: string[]
  transformBeforeSave?: (data: T) => Record<string, any>
  transformAfterLoad?: (data: Record<string, any>) => T
  progressiveSave?: boolean
  resetAfterSubmit?: boolean
}

/**
 * VueFire form composable that matches the API of useFirestoreForm but uses VueFire for integration
 */
export function useVueFireForm<T extends Record<string, any>>(
  options: VueFireFormOptions<T>
) {
  // Common form state
  const formData = reactive<T>({ ...options.initialState }) as T
  const formErrors = reactive<Record<string, string>>({})
  const isSubmitting = ref(false)
  const isSubmitted = ref(false)
  const submitCount = ref(0)
  const successMessage = ref('')
  const errorMessage = ref('')
  const isLoading = ref(true)
  const isValid = ref(true)

  // Firestore-specific state
  const isPendingSave = ref(false)
  const loadError = ref<string | null>(null)
  const dirtyFields = ref<Set<string>>(new Set())
  const lastSaveTime = ref<number | null>(null)
  const lastChangeTime = ref<number | null>(null)
  const originalData = ref<T>({ ...options.initialState })

  // Get Firestore instance from VueFire
  const firestore = useFirestore()

  // Get document reference - either directly passed or constructed from path components
  const docRef = computed(() => {
    if (options.docRef) {
      return options.docRef
    } else if (options.docPath) {
      return doc(firestore, options.docPath)
    } else if (options.collectionName && options.documentId) {
      return doc(firestore, options.collectionName, options.documentId)
    }
    return null
  })

  // Use VueFire's useDocument composable for real-time data binding
  const { data, pending, error } = useDocument(docRef, {
    reset: false, // Don't reset to undefined when the document doesn't exist
  })

  // Debounce related
  let debounceTimeout: NodeJS.Timeout | null = null
  let consecutiveChanges = 0

  // Form status computed properties
  const isDirty = computed(() => dirtyFields.value.size > 0)

  // Computed property to get array of changed field names
  const changedFields = computed(() => Array.from(dirtyFields.value))

  // Computed property to indicate saving status for UI feedback
  const savingStatus = computed(() => {
    if (isSubmitting.value) return 'saving'
    if (isPendingSave.value) return 'pending'
    if (lastSaveTime.value && isDirty.value) return 'unsaved'
    if (lastSaveTime.value) return 'saved'
    return 'unchanged'
  })

  // Validate a specific field
  const validateField = (fieldName: string) => {
    // Skip validation if no rules for this field
    if (!options.validationRules || !options.validationRules[fieldName]) {
      delete formErrors[fieldName]
      return true
    }

    const result = options.validationRules[fieldName](formData[fieldName])

    // If validation returns a string, it's an error message
    if (typeof result === 'string') {
      formErrors[fieldName] = result
      isValid.value = false
      return false
    } else {
      // Remove error if field is valid
      delete formErrors[fieldName]

      // Check if all fields are valid
      isValid.value = Object.keys(formErrors).length === 0
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

    isValid.value = allValid
    return allValid
  }

  // Mark a field as dirty (changed from original)
  const markFieldDirty = (fieldName: string) => {
    dirtyFields.value.add(fieldName)
    validateField(fieldName)
    lastChangeTime.value = Date.now()

    // Increment consecutive changes count
    consecutiveChanges++

    // Auto-sync to Firestore if enabled
    if (options.syncImmediately) {
      debounceSaveToFirestore()
    }
  }

  // Reset form to original/initial state
  const resetForm = () => {
    // Reset form data to initial state
    Object.keys(options.initialState).forEach((key) => {
      Object.assign(formData, { [key]: options.initialState[key] })
    })

    // Clear all errors
    Object.keys(formErrors).forEach((key) => {
      delete formErrors[key]
    })

    // Reset submission state
    isSubmitted.value = false
    successMessage.value = ''
    errorMessage.value = ''

    // Clear tracking state for Firestore
    dirtyFields.value.clear()
    isPendingSave.value = false
    consecutiveChanges = 0

    // Cancel any pending save
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
      debounceTimeout = null
    }
  }

  // Debounced save to Firestore
  const debounceSaveToFirestore = () => {
    // Cancel any existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }

    isPendingSave.value = true

    // Calculate dynamic debounce time based on consecutive changes
    let currentDebounceTime = options.debounceTime || 1500

    if (options.progressiveSave) {
      // For first change, use shorter debounce (300ms) for quick feedback
      // For continuous typing, use longer debounce to reduce Firestore operations
      if (consecutiveChanges === 1) {
        currentDebounceTime = Math.min(300, currentDebounceTime)
      } else if (consecutiveChanges > 5) {
        // For rapid consecutive changes, extend the debounce time
        currentDebounceTime = Math.min(2000, currentDebounceTime * 1.5)
      }
    }

    // Create new timeout
    debounceTimeout = setTimeout(() => {
      saveToFirestore()
      // Reset consecutive changes after save
      consecutiveChanges = 0
    }, currentDebounceTime)
  }

  // Save form data to Firestore
  const saveToFirestore = async () => {
    if (!docRef.value) {
      errorMessage.value = 'No document reference provided'
      isPendingSave.value = false
      return false
    }

    if (dirtyFields.value.size === 0) {
      // No changes to save
      isPendingSave.value = false
      return true
    }

    // Validate all fields before saving
    if (!validateAllFields()) {
      errorMessage.value = 'Please fix validation errors before saving'
      isPendingSave.value = false
      return false
    }

    try {
      isSubmitting.value = true
      isPendingSave.value = false
      errorMessage.value = ''

      // Create data object with only changed fields
      const updateData: Partial<T> = {}

      for (const field of dirtyFields.value) {
        if (!options.excludeFields?.includes(field)) {
          updateData[field as keyof T] = formData[field]
        }
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
        await updateDoc(docRef.value, processedData)
      } else if (options.createIfNotExists) {
        // Create new document - use all form data for initial creation
        const fullData = options.transformBeforeSave
          ? options.transformBeforeSave(formData)
          : formData
        await setDoc(docRef.value, fullData)
      } else {
        throw new Error(
          'Document does not exist and createIfNotExists is false'
        )
      }

      // Update last save time
      lastSaveTime.value = Date.now()

      // Clear dirty fields as they're now saved
      dirtyFields.value.clear()

      // Update original data with new values
      originalData.value = JSON.parse(JSON.stringify(formData))

      successMessage.value = 'Changes saved successfully'

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        if (successMessage.value === 'Changes saved successfully') {
          successMessage.value = ''
        }
      }, 3000)

      return true
    } catch (error: any) {
      console.error('Error saving to Firestore:', error)
      errorMessage.value = `Failed to save changes: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  // Submit form handler
  const handleSubmit = async () => {
    isSubmitting.value = true
    errorMessage.value = ''
    successMessage.value = ''

    try {
      // Validate the form first
      const isFormValid = validateAllFields()

      if (!isFormValid) {
        errorMessage.value = 'Please fix the form errors before submitting.'
        isSubmitting.value = false
        return false
      }

      let result: { success: boolean; message?: string } | boolean = true

      // Save any pending changes to Firestore
      const saveResult = await saveToFirestore()
      if (!saveResult) {
        return false
      }

      // Call the submit handler if provided
      if (options.submitHandler) {
        result = await options.submitHandler(formData)

        // Handle result object with success/message properties
        if (result && typeof result === 'object' && 'success' in result) {
          if (typeof result === 'object' && result.success && result.message) {
            successMessage.value = result.message
          } else if (!result.success && result.message) {
            errorMessage.value = result.message
            return false
          }
        }
      }

      // Update form state based on submit result
      isSubmitted.value = true
      submitCount.value++

      // Reset form if configured to do so
      if (options.resetAfterSubmit) {
        resetForm()
      }

      return result
    } catch (error: any) {
      errorMessage.value = error.message || 'An unexpected error occurred'
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  // INITIALIZATION AND WATCHERS
  // --------------------------

  // Watch for VueFire document data changes
  watch(
    data,
    (newData) => {
      if (newData && !isSubmitting.value) {
        isLoading.value = false

        // Transform data if needed
        const transformedData = options.transformAfterLoad
          ? options.transformAfterLoad(newData)
          : (newData as T)

        // Merge with initial state to ensure we have all required fields
        const mergedData = { ...options.initialState, ...transformedData }

        // Store fields currently being edited by user
        const editingFields = new Set(dirtyFields.value)

        // Update form data without overwriting fields being edited
        for (const key in mergedData) {
          if (!editingFields.has(key)) {
            formData[key] = mergedData[key]
          }
        }

        // Store the original data
        originalData.value = JSON.parse(JSON.stringify(mergedData))
      }
    },
    { immediate: true }
  )

  // Watch for VueFire loading state
  watch(pending, (isPending) => {
    isLoading.value = isPending
  })

  // Watch for VueFire errors
  watch(error, (err) => {
    if (err) {
      loadError.value = err.message
      console.error('VueFire document error:', err)
    } else {
      loadError.value = null
    }
  })

  // Set up watchers for form fields
  const setupFieldWatchers = () => {
    // Watch each field in the form
    for (const key in formData) {
      watch(
        () => formData[key],
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

    isPendingSave.value = false
    consecutiveChanges = 0
  }

  // Clean up on component unmount
  onBeforeUnmount(() => {
    cleanup()
  })

  return {
    formData,
    formErrors,
    isSubmitting,
    isSubmitted,
    submitCount,
    successMessage,
    errorMessage,
    isValid,
    isDirty,
    isLoading,
    isPendingSave,
    loadError,
    dirtyFields: computed(() => dirtyFields.value),
    lastSaveTime,
    lastChangeTime,
    savingStatus,
    changedFields,
    originalData,
    validateField,
    validateAllFields,
    resetForm,
    handleSubmit,
    cleanup,
    saveToFirestore,
  }
}

// Type for backward compatibility with existing code
export type VueFireFormOptionsCompat<T> = VueFireFormOptions<T>

/**
 * Wrapper that maintains backward compatibility with previous code
 */
export function useVueFireStoreForm<T extends Record<string, any>>(
  options: VueFireFormOptionsCompat<T>
) {
  return useVueFireForm<T>(options)
}
