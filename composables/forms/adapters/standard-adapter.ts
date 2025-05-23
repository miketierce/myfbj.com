import { ref, reactive, computed, onBeforeUnmount, toRef } from 'vue'
import type { FormOptions, FormAPI } from '../types'

export function createStandardAdapter<T extends Record<string, any>>(
  options: FormOptions<T>
): FormAPI<T> {
  // Common form state
  const formDataRaw = reactive<T>({ ...options.initialState }) as T
  const formErrorsRaw = reactive<Record<string, string>>({})
  const isSubmittingRaw = ref(false)
  const isSubmittedRaw = ref(false)
  const submitCountRaw = ref(0)
  const successMessageRaw = ref('')
  const errorMessageRaw = ref('')
  const touchedFields = reactive<Record<string, boolean>>({})
  const isValidRaw = ref(true)

  // Form status computed property
  const isDirty = computed(() => {
    return Object.keys(formDataRaw).some(
      (key) => formDataRaw[key] !== options.initialState[key]
    )
  })

  // Computed property to get array of changed field names
  const changedFields = computed(() => {
    return Object.keys(formDataRaw).filter(
      (key) => formDataRaw[key] !== options.initialState[key]
    )
  })

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

    // Reset touch state for standard forms
    Object.keys(touchedFields).forEach((key) => {
      touchedFields[key] = false
    })
  }

  // Update a single field
  const updateField = (field: keyof T, value: any) => {
    formDataRaw[field] = value
    touchedFields[field as string] = true
    validateField(field as string)
  }

  // Update multiple fields
  const updateFields = (fields: Partial<T>) => {
    Object.entries(fields).forEach(([key, value]) => {
      formDataRaw[key as keyof T] = value
      touchedFields[key] = true
      validateField(key)
    })
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

  // Clean up on component unmount
  const cleanup = () => {
    // Clean up method for standard form (minimal cleanup needed)
  }

  onBeforeUnmount(() => {
    cleanup()
  })

  // Convert reactive objects to refs to match the interface
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
  }
}
