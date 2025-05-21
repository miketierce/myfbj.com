import {
  ref,
  reactive,
  computed,
  watch,
  onBeforeUnmount,
  toRef,
  nextTick,
} from 'vue'
import {
  DocumentReference,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore'

// Interface for form options without Firestore integration
export interface BaseFormOptions<T> {
  initialState: T
  validationRules?: Record<string, (value: any) => boolean | string>
  submitHandler?: (formData: T) => Promise<any> | any
  resetAfterSubmit?: boolean
  mode: 'standard' // Standard form mode
}

// Interface for form options with Firestore integration
export interface FirestoreFormOptions<T> {
  initialState: T
  docRef: DocumentReference
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
  mode: 'firestore' // Firestore integration mode
}

// Union type for all form options
export type FormOptions<T> = BaseFormOptions<T> | FirestoreFormOptions<T>

/**
 * Unified form composable that handles both standard forms and Firestore-synced forms
 */
export function useFormBase<T extends Record<string, any>>(
  options: FormOptions<T>
) {
  // Common form state
  const formData = reactive<T>({ ...options.initialState }) as T
  const formErrors = reactive<Record<string, string>>({})
  const isSubmitting = ref(false)
  const isSubmitted = ref(false)
  const submitCount = ref(0)
  const successMessage = ref('')
  const errorMessage = ref('')
  const touchedFields = reactive<Record<string, boolean>>({})
  const isLoading = ref(false)
  const isValid = ref(true)

  // Firestore-specific state
  const isPendingSave = ref(false)
  const loadError = ref<string | null>(null)
  const dirtyFields = ref<Set<string>>(new Set())
  const lastSaveTime = ref<number | null>(null)
  const lastChangeTime = ref<number | null>(null)
  const originalData = ref<T>({ ...options.initialState })

  // Debounce related
  let debounceTimeout: NodeJS.Timeout | null = null
  let consecutiveChanges = 0
  let unsubscribe: (() => void) | null = null

  // Form status computed properties
  const isDirty = computed(() => {
    if (options.mode === 'firestore') {
      return dirtyFields.value.size > 0
    } else {
      return Object.keys(formData).some(
        (key) => formData[key] !== options.initialState[key]
      )
    }
  })

  // Computed property to get array of changed field names
  const changedFields = computed(() => {
    if (options.mode === 'firestore') {
      return Array.from(dirtyFields.value)
    } else {
      return Object.keys(formData).filter(
        (key) => formData[key] !== options.initialState[key]
      )
    }
  })

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

  // Mark a field as dirty (changed from original) - Firestore mode only
  const markFieldDirty = (fieldName: string) => {
    if (options.mode === 'firestore') {
      dirtyFields.value.add(fieldName)
      touchedFields[fieldName] = true
      validateField(fieldName)
      lastChangeTime.value = Date.now()

      // Increment consecutive changes count
      consecutiveChanges++

      // Auto-sync to Firestore if enabled
      if ((options as FirestoreFormOptions<T>).syncImmediately) {
        debounceSaveToFirestore()
      }
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

    if (options.mode === 'firestore') {
      // Clear tracking state for Firestore
      dirtyFields.value.clear()
      isPendingSave.value = false
      consecutiveChanges = 0

      // Cancel any pending save
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
        debounceTimeout = null
      }
    } else {
      // Reset touch state for standard forms
      Object.keys(touchedFields).forEach((key) => {
        touchedFields[key] = false
      })
    }
  }

  // FIRESTORE SPECIFIC FUNCTIONS
  // ---------------------------

  // Debounced save to Firestore
  const debounceSaveToFirestore = () => {
    if (options.mode !== 'firestore') return

    const firestoreOptions = options as FirestoreFormOptions<T>

    // Cancel any existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }

    isPendingSave.value = true

    // Calculate dynamic debounce time based on consecutive changes
    let currentDebounceTime = firestoreOptions.debounceTime || 1500

    if (firestoreOptions.progressiveSave) {
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
    if (options.mode !== 'firestore') return true

    const firestoreOptions = options as FirestoreFormOptions<T>
    const docRef = firestoreOptions.docRef

    if (!docRef) {
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
        if (!firestoreOptions.excludeFields?.includes(field)) {
          updateData[field as keyof T] = formData[field]
        }
      }

      // Transform data before saving if needed
      const processedData = firestoreOptions.transformBeforeSave
        ? firestoreOptions.transformBeforeSave({
            ...updateData,
          } as T)
        : updateData

      const docSnapshot = await getDoc(docRef)

      if (docSnapshot.exists()) {
        // Update existing document
        await updateDoc(docRef, processedData)
      } else if (firestoreOptions.createIfNotExists) {
        // Create new document
        await setDoc(docRef, processedData)
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

  // Initial data loading from Firestore
  const loadFromFirestore = async () => {
    if (options.mode !== 'firestore') return

    const firestoreOptions = options as FirestoreFormOptions<T>
    const docRef = firestoreOptions.docRef

    if (!docRef) {
      loadError.value = 'No document reference provided'
      isLoading.value = false
      return
    }

    try {
      isLoading.value = true
      loadError.value = null

      const docSnapshot = await getDoc(docRef)

      if (docSnapshot.exists()) {
        // Transform data if needed and update form data
        const data = firestoreOptions.transformAfterLoad
          ? firestoreOptions.transformAfterLoad(docSnapshot.data())
          : (docSnapshot.data() as T)

        // Merge with initial state to ensure we have all required fields
        const mergedData = { ...options.initialState, ...data }

        Object.assign(formData, mergedData)
        originalData.value = JSON.parse(JSON.stringify(mergedData))
      } else if (firestoreOptions.createIfNotExists) {
        // Use initial state
        Object.assign(formData, options.initialState)
        originalData.value = JSON.parse(JSON.stringify(options.initialState))

        // Create document in Firestore
        const dataToSave = firestoreOptions.transformBeforeSave
          ? firestoreOptions.transformBeforeSave(options.initialState)
          : options.initialState

        await setDoc(docRef, dataToSave)
      } else {
        loadError.value = 'Document does not exist'
      }
    } catch (error: any) {
      console.error('Error loading from Firestore:', error)
      loadError.value = `Failed to load data: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    } finally {
      isLoading.value = false
    }
  }

  // Set up real-time listener for Firestore updates
  const setupFirestoreListener = () => {
    if (options.mode !== 'firestore') return

    const firestoreOptions = options as FirestoreFormOptions<T>
    const docRef = firestoreOptions.docRef

    if (!docRef) return

    // Remove any existing listener
    if (unsubscribe) {
      unsubscribe()
    }

    // Set up new listener
    unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          // Only update if we're not currently submitting changes
          if (!isSubmitting.value) {
            // Transform data if needed
            const data = firestoreOptions.transformAfterLoad
              ? firestoreOptions.transformAfterLoad(snapshot.data())
              : (snapshot.data() as unknown as T)

            // Merge with initial state to ensure we have all required fields
            const mergedData = { ...options.initialState, ...data }

            // Store fields currently being edited by user
            const editingFields = new Set(dirtyFields.value)

            // Update form data without overwriting fields being edited
            for (const key in mergedData) {
              if (!editingFields.has(key)) {
                // Only update fields not currently being edited by user
                formData[key] = mergedData[key]
              }
            }

            // Update original data
            originalData.value = JSON.parse(
              JSON.stringify({
                ...mergedData,
                // Keep user's edits for dirty fields
                ...Array.from(dirtyFields.value).reduce(
                  (acc, field) => ({
                    ...acc,
                    [field]: formData[field],
                  }),
                  {}
                ),
              })
            )
          }
        }
      },
      (error) => {
        console.error('Firestore listener error:', error)
        errorMessage.value = `Realtime updates error: ${error.message}`
      }
    )
  }

  // COMMON FUNCTION - SUBMIT HANDLER
  // -------------------------------

  // Submit form handler - works for both standard forms and Firestore forms
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

      // For Firestore forms, save to Firestore first
      if (options.mode === 'firestore') {
        // Save any pending changes to Firestore
        const saveResult = await saveToFirestore()
        if (!saveResult) {
          return false
        }
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

  // INITIALIZATION
  // -------------

  // Set up watchers for form fields - for Firestore forms
  const setupFieldWatchers = () => {
    if (options.mode !== 'firestore') return

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

  // Initialize Firestore form
  const initFirestoreForm = async () => {
    if (options.mode !== 'firestore') return

    // Load initial data
    await loadFromFirestore()

    // Set up real-time syncing
    setupFirestoreListener()

    // Set up watchers for field changes
    nextTick(() => {
      setupFieldWatchers()
    })
  }

  // Initialize the form based on its mode
  if (options.mode === 'firestore') {
    // Initialize Firestore form
    initFirestoreForm()
  }

  // Clean up function to remove listeners
  const cleanup = () => {
    // Cancel any pending operations
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }

    isPendingSave.value = false
    consecutiveChanges = 0

    // Remove Firestore listener
    if (unsubscribe) {
      unsubscribe()
    }
  }

  // Clean up on component unmount
  onBeforeUnmount(() => {
    cleanup()
  })

  // Build and return appropriate API based on form mode
  const commonApi = {
    // Common state
    formData,
    formErrors,
    isSubmitting,
    isSubmitted,
    submitCount,
    successMessage,
    errorMessage,
    isValid,
    isDirty,

    // Common methods
    validateField,
    validateAllFields,
    resetForm,
    handleSubmit,
    cleanup,
  }

  // Conditionally add Firestore-specific properties
  if (options.mode === 'firestore') {
    return {
      ...commonApi,
      // Firestore-specific
      isLoading,
      isPendingSave,
      loadError,
      dirtyFields: computed(() => dirtyFields.value),
      lastSaveTime,
      lastChangeTime,
      savingStatus,
      changedFields,
      originalData,
      saveToFirestore,
      loadFromFirestore,
    }
  } else {
    return {
      ...commonApi,
      touchedFields,
    }
  }
}
