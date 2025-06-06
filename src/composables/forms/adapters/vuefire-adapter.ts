import { ref, computed, watch } from 'vue'
import { useDocument } from 'vuefire'
import { createStandardAdapter } from './standard-adapter'
import type { FirestoreFormOptions, VueFireFormAPI } from '../types'
import { debounce } from 'lodash-es'
import { serverTimestamp } from 'firebase/firestore'

/**
 * VueFire form adapter - leverages VueFire's reactive system for Firestore integration
 */
export function createVueFireAdapter<T extends Record<string, any>>(
  options: FirestoreFormOptions<T>
): VueFireFormAPI<T> {
  // Create the base form using standard adapter
  const baseForm = createStandardAdapter<T>(options)

  const {
    docRef = null,
    createIfNotExists = false,
    syncImmediately = false,
    debounceTime = 1000,
    progressiveSave = false,
    excludeFields = [],
    transformBeforeSave,
    transformAfterLoad,
  } = options

  // Additional VueFire-specific state
  const isPendingSave = ref(false)
  const savingStatus = ref<
    'saving' | 'saved' | 'error' | 'unsaved' | 'pending'
  >('unsaved')
  const isLoading = ref(false)
  const lastSaveTime = ref<number | null>(null)
  const loadError = ref<string | null>(null)
  const changedFields: string[] = []

  // Track original data for comparison
  const originalData = ref<T>({ ...options.initialState })

  // Use VueFire's useDocument hook for reactive connection to Firestore
  const vueFireDocRef = computed(() => docRef)
  const { data: vueFireData, pending, error } = useDocument(vueFireDocRef)

  // Improved dirty tracking that checks actual data differences
  const isDirty = computed(() => {
    if (changedFields.length > 0) return true

    if (!vueFireData.value) return true

    // Check for deep differences
    for (const key in baseForm.formData) {
      // Skip excluded fields
      if (excludeFields.includes(key)) continue

      const currentValue = baseForm.formData[key]
      const originalValue = originalData.value[key]

      // Compare with JSON.stringify for complex objects
      if (JSON.stringify(currentValue) !== JSON.stringify(originalValue)) {
        return true
      }
    }

    return false
  })

  // Watch VueFire loading state
  watch(pending, (isPending) => {
    isLoading.value = isPending
  })

  // Watch VueFire errors
  watch(error, (newError) => {
    if (newError) {
      console.error('VueFire document error:', newError)
      baseForm.errorMessage.value = newError.message || 'Failed to load data'
      loadError.value = newError.message || 'Failed to load data'
    }
  })

  // Watch VueFire data changes and update form
  watch(
    vueFireData,
    (newData) => {
      if (newData) {
        // Convert data if needed
        let formattedData = { ...newData }

        // Apply custom transform if provided
        if (transformAfterLoad) {
          formattedData = transformAfterLoad(formattedData)
        }

        // Only update if we're not currently saving
        if (savingStatus.value !== 'saving') {
          // Update form with data from Firestore via VueFire
          baseForm.updateFields(formattedData as Partial<T>)

          // Store original data for comparison
          originalData.value = JSON.parse(
            JSON.stringify({
              ...options.initialState,
              ...formattedData,
            })
          ) as T

          baseForm.isDirty.value = false
        }
      } else if (createIfNotExists && docRef) {
        // Document doesn't exist but we want to create it
        saveToFirestore()
      }
    },
    { deep: true }
  )

  // Handle transformations for saving data
  const prepareDataForSave = (data: T): Record<string, any> => {
    let preparedData: Record<string, any> = { ...data }

    // Apply custom transform if provided
    if (transformBeforeSave) {
      preparedData = transformBeforeSave(data)
    }

    // Filter out excluded fields
    if (excludeFields.length > 0) {
      excludeFields.forEach((field) => {
        delete preparedData[field]
      })
    }

    // Add timestamp fields
    preparedData.updatedAt = serverTimestamp()

    // Add createdAt only for new documents
    if (createIfNotExists && !lastSaveTime.value) {
      preparedData.createdAt = serverTimestamp()
    }

    return preparedData
  }

  // Save to Firestore using VueFire
  const saveToFirestore = async (): Promise<boolean> => {
    if (!docRef) {
      console.warn('Cannot save to Firestore: No document reference provided')
      return false
    }

    try {
      isPendingSave.value = false
      savingStatus.value = 'saving'

      const dataToSave = prepareDataForSave(baseForm.formData)

      // Determine if document exists
      const docExists = !!vueFireData.value

      if (docExists) {
        // Use progressive save if enabled
        if (progressiveSave && changedFields.length > 0) {
          const updates: Record<string, any> = {}
          changedFields.forEach((field) => {
            if (field in dataToSave) {
              updates[field] = dataToSave[field]
            }
          })

          // Update document with only changed fields
          await docRef.update(updates)
        } else {
          // Otherwise update the whole document
          await docRef.update(dataToSave)
        }
      } else {
        // Document doesn't exist, create it
        await docRef.set(dataToSave)
      }

      // Update status
      savingStatus.value = 'saved'
      lastSaveTime.value = Date.now()
      baseForm.isDirty.value = false
      changedFields.length = 0 // Clear changed fields

      return true
    } catch (error: any) {
      console.error('Error saving to Firestore:', error)
      savingStatus.value = 'error'
      baseForm.errorMessage.value = error.message || 'Failed to save data'
      return false
    }
  }

  // Create debounced save function
  const debouncedSave = debounce(() => {
    if (isPendingSave.value) {
      saveToFirestore()
    }
  }, debounceTime)

  // Mark a field as dirty (for progressive saves)
  const markFieldDirty = (field: string): void => {
    if (!changedFields.includes(field)) {
      changedFields.push(field)
    }

    // Update status
    baseForm.isDirty.value = true

    if (syncImmediately) {
      isPendingSave.value = true
      savingStatus.value = 'pending'
      debouncedSave()
    } else {
      savingStatus.value = 'unsaved'
    }
  }

  // Enhance the base submit handler to also save to Firestore
  const originalSubmit = baseForm.handleSubmit
  baseForm.handleSubmit = async (): Promise<boolean> => {
    if (!baseForm.isValid.value) {
      return false
    }

    if (docRef) {
      return saveToFirestore()
    }

    // Fall back to the original submit if no docRef
    return originalSubmit()
  }

  // Enhanced cleanup (no snapshot unsubscribe needed with VueFire)
  const cleanup = () => {
    baseForm.cleanup()
  }

  // Return enhanced form API
  return {
    ...baseForm,
    saveToFirestore,
    isPendingSave,
    savingStatus,
    markFieldDirty,
    changedFields,
    isLoading,
    lastSaveTime,
    cleanup,
  }
}
