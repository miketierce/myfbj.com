import {
  ref,
  reactive,
  computed,
  watch,
  onUnmounted,
  nextTick,
  toRef,
} from 'vue'
import { getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { useFirebaseApp } from '~/composables/utils/useFirebaseApp'
import type { FormOptions, FirestoreFormAPI } from '../types'

export function createFirestoreAdapter<T extends Record<string, any>>(
  options: FormOptions<T>
): FirestoreFormAPI<T> {
  // Get Firebase instance
  const { firestore } = useFirebaseApp()

  // Form state
  const formDataRaw = reactive<T>({ ...options.initialState }) as T
  const formErrorsRaw = reactive<Record<string, string>>({})
  const isSubmittingRaw = ref(false)
  const successMessageRaw = ref('')
  const errorMessageRaw = ref('')
  const isValidRaw = ref(true)

  // Firestore-specific state
  const isLoadingRaw = ref(false)
  const isPendingSaveRaw = ref(false)
  const loadErrorRaw = ref<string | null>(null)
  const dirtyFieldsRaw = ref<Set<string>>(new Set())
  const lastSaveTimeRaw = ref<number | null>(null)
  const lastChangeTimeRaw = ref<number | null>(null)
  const originalDataRaw = ref<T>({ ...options.initialState })
  const savingStatusRaw = ref('unchanged')

  // Debounce related
  let debounceTimeout: NodeJS.Timeout | null = null
  let consecutiveChanges = 0
  let unsubscribe: (() => void) | null = null

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

    // Update saving status
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
    const { docRef } = options

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

      const docSnapshot = await getDoc(docRef)

      if (docSnapshot.exists()) {
        // Update existing document
        await updateDoc(docRef, processedData)
      } else if (options.createIfNotExists) {
        // Create new document
        await setDoc(docRef, processedData)
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

  // Initial data loading from Firestore
  const loadFromFirestore = async () => {
    const { docRef } = options

    if (!docRef) {
      loadErrorRaw.value = 'No document reference provided'
      isLoadingRaw.value = false
      return
    }

    try {
      isLoadingRaw.value = true
      loadErrorRaw.value = null

      const docSnapshot = await getDoc(docRef)

      if (docSnapshot.exists()) {
        // Transform data if needed and update form data
        const data = options.transformAfterLoad
          ? options.transformAfterLoad(docSnapshot.data())
          : (docSnapshot.data() as T)

        // Merge with initial state to ensure we have all required fields
        const mergedData = { ...options.initialState, ...data }

        Object.assign(formDataRaw, mergedData)
        originalDataRaw.value = JSON.parse(JSON.stringify(mergedData))
      } else if (options.createIfNotExists) {
        // Use initial state
        Object.assign(formDataRaw, options.initialState)
        originalDataRaw.value = JSON.parse(JSON.stringify(options.initialState))

        // Create document in Firestore
        const dataToSave = options.transformBeforeSave
          ? options.transformBeforeSave(options.initialState)
          : options.initialState

        await setDoc(docRef, dataToSave)
      } else {
        loadErrorRaw.value = 'Document does not exist'
      }
    } catch (error: any) {
      console.error('Error loading from Firestore:', error)
      loadErrorRaw.value = `Failed to load data: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    } finally {
      isLoadingRaw.value = false
    }
  }

  // Set up real-time listener for Firestore updates
  const setupFirestoreListener = () => {
    const { docRef } = options

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
          if (!isSubmittingRaw.value) {
            // Transform data if needed
            const data = options.transformAfterLoad
              ? options.transformAfterLoad(snapshot.data())
              : (snapshot.data() as unknown as T)

            // Merge with initial state to ensure we have all required fields
            const mergedData = { ...options.initialState, ...data }

            // Store fields currently being edited by user
            const editingFields = new Set(dirtyFieldsRaw.value)

            // Update form data without overwriting fields being edited
            for (const key in mergedData) {
              if (!editingFields.has(key)) {
                // Only update fields not currently being edited by user
                formDataRaw[key] = mergedData[key]
              }
            }

            // Update original data
            originalDataRaw.value = JSON.parse(
              JSON.stringify({
                ...mergedData,
                // Keep user's edits for dirty fields
                ...Array.from(dirtyFieldsRaw.value).reduce(
                  (acc, field) => ({
                    ...acc,
                    [field]: formDataRaw[field],
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
        errorMessageRaw.value = `Realtime updates error: ${error.message}`
      }
    )
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

  // Initialize the form
  const initForm = async () => {
    // Load initial data
    await loadFromFirestore()

    // Set up real-time syncing
    setupFirestoreListener()

    // Set up watchers for field changes
    nextTick(() => {
      setupFieldWatchers()
    })
  }

  // Initialize the form
  initForm()

  // Clean up function to remove listeners
  const cleanup = () => {
    // Cancel any pending operations
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }

    // Remove Firestore listener
    if (unsubscribe) {
      unsubscribe()
    }
  }

  // Automatically clean up when component unmounts
  onUnmounted(() => {
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
