import { ref, watch, computed } from 'vue'
import {
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { createStandardAdapter } from './standard-adapter'
import type { FirestoreFormOptions, FirestoreFormAPI } from '../types'
import { debounce } from 'lodash-es'

/**
 * Firestore form adapter - extends standard form adapter with Firestore integration
 */
export function createFirestoreAdapter<T extends Record<string, any>>(
  options: FirestoreFormOptions<T>
): FirestoreFormAPI<T> {
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

  // Additional Firestore-specific state
  const isPendingSave = ref(false)
  const savingStatus = ref<
    'saving' | 'saved' | 'error' | 'unsaved' | 'pending'
  >('unsaved')
  const isLoading = ref(false)
  const lastSaveTime = ref<number | null>(null)
  const loadError = ref<string | null>(null)
  const changedFields: string[] = []
  let unsubscribeSnapshot: (() => void) | null = null

  // Track original data for comparison
  const originalData = ref<T>({ ...options.initialState })

  // Improved isDirty computation that checks actual differences
  const isDirty = computed(() => {
    if (changedFields.length > 0) return true

    // Check for deep differences between current form data and original data
    for (const key in baseForm.formData) {
      const currentValue = baseForm.formData[key]
      const originalValue = originalData.value[key]

      // Compare by JSON string since we can have complex objects
      if (JSON.stringify(currentValue) !== JSON.stringify(originalValue)) {
        return true
      }
    }

    return false
  })

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

    // Add timestamps for tracking
    preparedData.updatedAt = serverTimestamp()

    // Add createdAt only for new documents
    if (createIfNotExists && !lastSaveTime.value) {
      preparedData.createdAt = serverTimestamp()
    }

    // Convert special types like Date to Firestore Timestamp
    Object.entries(preparedData).forEach(([key, value]) => {
      if (value instanceof Date) {
        preparedData[key] = Timestamp.fromDate(value)
      }
    })

    return preparedData
  }

  // Convert Firestore data to form data format
  const convertFromFirestore = (data: Record<string, any>): Partial<T> => {
    const result: Record<string, any> = {}

    // Basic conversion of Firestore types
    Object.entries(data).forEach(([key, value]) => {
      if (value && typeof value === 'object' && 'toDate' in value) {
        // Convert Timestamp to Date
        result[key] = value.toDate()
      } else {
        result[key] = value
      }
    })

    // Apply custom transform if provided
    if (transformAfterLoad) {
      return transformAfterLoad(result)
    }

    return result as Partial<T>
  }

  // Load data from Firestore
  const loadFromFirestore = async (): Promise<void> => {
    if (!docRef) return

    try {
      isLoading.value = true

      const docSnapshot = await getDoc(docRef)

      if (docSnapshot.exists()) {
        // Document exists, update form data
        const firestoreData = docSnapshot.data()
        const convertedData = convertFromFirestore(firestoreData)

        // Update form with data from Firestore
        baseForm.updateFields(convertedData)
        baseForm.isDirty.value = false
      } else if (createIfNotExists) {
        // Document doesn't exist but we want to create it
        await saveToFirestore()
      }
    } catch (error: any) {
      console.error('Error loading data from Firestore:', error)
      baseForm.errorMessage.value = error.message || 'Failed to load data'
    } finally {
      isLoading.value = false
    }
  }

  // Save data to Firestore with debounce support
  const saveToFirestore = async (): Promise<boolean> => {
    if (!docRef) {
      console.warn('Cannot save to Firestore: No document reference provided')
      return false
    }

    try {
      isPendingSave.value = false
      savingStatus.value = 'saving'

      const dataToSave = prepareDataForSave(baseForm.formData)

      // Try to get the document first to determine if it exists
      const docSnapshot = await getDoc(docRef)

      if (docSnapshot.exists()) {
        // Only update fields that have changed if using progressive save
        if (progressiveSave && changedFields.length > 0) {
          const updates: Record<string, any> = {}
          changedFields.forEach((field) => {
            if (field in dataToSave) {
              updates[field] = dataToSave[field]
            }
          })

          await updateDoc(docRef, updates)
        } else {
          // Otherwise update the whole document
          await updateDoc(docRef, dataToSave)
        }
      } else {
        // Document doesn't exist, create it
        await setDoc(docRef, dataToSave)
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

  // Set up real-time sync with Firestore if enabled
  const setupFirestoreSync = () => {
    if (!docRef) return

    // Unsubscribe from previous snapshot listener if any
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot()
      unsubscribeSnapshot = null
    }

    // Set up new snapshot listener
    unsubscribeSnapshot = onSnapshot(
      docRef,
      // Success handler
      (snapshot) => {
        if (snapshot.exists()) {
          const firestoreData = snapshot.data()
          const convertedData = convertFromFirestore(firestoreData)

          // Only update if not currently saving to avoid loops
          if (savingStatus.value !== 'saving') {
            baseForm.updateFields(convertedData)
            baseForm.isDirty.value = false
            savingStatus.value = 'saved'
          }
        }
      },
      // Error handler
      (error) => {
        console.error('Error in Firestore sync:', error)
      }
    )
  }

  // Enhanced cleanup to remove Firestore listeners
  const cleanup = () => {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot()
      unsubscribeSnapshot = null
    }
    baseForm.cleanup()
  }

  // Watch docRef changes to reload data when it changes
  watch(
    () => options.docRef,
    (newDocRef, oldDocRef) => {
      if (newDocRef && newDocRef !== oldDocRef) {
        // Re-setup with new docRef
        loadFromFirestore()

        if (syncImmediately) {
          setupFirestoreSync()
        }
      }
    },
    { immediate: true }
  )

  // Initialize - load data from Firestore
  if (docRef) {
    loadFromFirestore()

    if (syncImmediately) {
      setupFirestoreSync()
    }
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
