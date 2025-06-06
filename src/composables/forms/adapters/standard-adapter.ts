import { reactive, ref, watch, computed } from 'vue'
import type { BaseFormOptions, FormAPI, SubmitResult } from '../types'

/**
 * Standard form adapter - provides basic form functionality without external storage
 * This serves as the foundation for all other adapters
 */
export function createStandardAdapter<T extends Record<string, any>>(
  options: BaseFormOptions<T>
): FormAPI<T> {
  const {
    initialState,
    validationRules = {},
    submitHandler,
    resetAfterSubmit = false,
  } = options

  // Create reactive state
  const formData = reactive<T>({ ...initialState }) as T
  const formErrors = reactive<Record<string, string>>({})
  const touchedFields = reactive<Record<string, boolean>>({})
  const isSubmitting = ref(false)
  const isSubmitted = ref(false)
  const submitCount = ref(0)
  const successMessage = ref('')
  const errorMessage = ref('')
  const isDirty = ref(false)

  // Computed valid state based on errors
  const isValid = computed(() => {
    return Object.values(formErrors).every((error) => !error)
  })

  // Method to validate a specific field
  const validateField = (field: string): boolean => {
    // Mark field as touched when validated
    touchedFields[field] = true

    // Clear previous error for this field
    formErrors[field] = ''

    // Skip validation if no rule exists for this field
    if (!validationRules[field]) {
      return true
    }

    // Apply the validation rule
    const result = validationRules[field](formData[field])

    // Handle boolean and string results
    if (typeof result === 'string') {
      formErrors[field] = result
      return false
    } else if (result === false) {
      formErrors[field] = `Invalid ${field}`
      return false
    }

    // Field is valid
    return true
  }

  // Validate all fields with rules
  const validateAllFields = (): boolean => {
    let allValid = true

    // Apply validation to each field that has a rule
    Object.keys(validationRules).forEach((field) => {
      // Skip fields that don't exist in the form data
      if (!(field in formData)) return

      // Mark all fields as touched during full validation
      touchedFields[field] = true

      // Validate the field and track overall validity
      const fieldValid = validateField(field)
      if (!fieldValid) {
        allValid = false
      }
    })

    return allValid
  }

  // Reset form to initial state
  const resetForm = (): void => {
    // Reset form data to initial values
    Object.keys(formData).forEach((key) => {
      if (key in initialState) {
        formData[key] = initialState[key]
      }
    })

    // Clear validation errors
    Object.keys(formErrors).forEach((key) => {
      formErrors[key] = ''
    })

    // Reset touch state for all fields
    Object.keys(touchedFields).forEach((key) => {
      touchedFields[key] = false
    })

    // Reset status
    isSubmitted.value = false
    successMessage.value = ''
    errorMessage.value = ''
    isDirty.value = false
  }

  // Update a single field value
  const updateField = (field: string, value: any): void => {
    if (field in formData) {
      formData[field] = value
      isDirty.value = true

      // Mark field as touched when updated
      touchedFields[field] = true

      // Optionally validate on change
      if (validationRules[field]) {
        validateField(field)
      }
    }
  }

  // Update multiple fields at once
  const updateFields = (fields: Partial<T>): void => {
    Object.entries(fields).forEach(([key, value]) => {
      if (key in formData) {
        formData[key as keyof T] = value

        // Mark updated fields as touched
        touchedFields[key] = true
      }
    })

    isDirty.value = true
  }

  // Handle form submission
  const handleSubmit = async (): Promise<boolean> => {
    // Clear previous messages
    successMessage.value = ''
    errorMessage.value = ''

    // Validate all fields first
    const isFormValid = validateAllFields()

    if (!isFormValid) {
      errorMessage.value = 'Please fix the errors in the form'
      return false
    }

    // Set submission state
    isSubmitting.value = true

    try {
      // Increment submit count
      submitCount.value++
      isSubmitted.value = true

      // Use custom submit handler if provided
      if (submitHandler) {
        const result = await Promise.resolve(submitHandler(formData))

        // Handle submission result
        if (result.success) {
          successMessage.value = result.message || 'Form submitted successfully'

          // Reset after submit if configured
          if (resetAfterSubmit) {
            resetForm()
          } else {
            isDirty.value = false
          }

          return true
        } else {
          errorMessage.value = result.message || 'Form submission failed'
          return false
        }
      }

      // Default success behavior if no custom handler
      successMessage.value = 'Form submitted successfully'
      isDirty.value = false
      return true
    } catch (error: any) {
      // Handle errors during submission
      console.error('Form submission error:', error)
      errorMessage.value =
        error.message || 'An error occurred during submission'
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  // Cleanup function for component unmount
  const cleanup = () => {
    // Nothing to clean up in standard adapter
  }

  // Watch for changes to mark form as dirty
  watch(
    formData,
    () => {
      isDirty.value = true
    },
    { deep: true }
  )

  return {
    formData,
    formErrors,
    touchedFields,
    isSubmitting,
    isSubmitted,
    submitCount,
    isValid,
    successMessage,
    errorMessage,
    isDirty,
    handleSubmit,
    validateField,
    validateAllFields,
    resetForm,
    updateField,
    updateFields,
    cleanup,
  }
}
