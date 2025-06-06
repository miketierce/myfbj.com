import { firestoreAction, vuexfireMutations } from 'vuexfire'
import type { Module } from 'vuex'
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import type { DocumentReference, Firestore } from 'firebase/firestore'
import type { FirebaseServices } from '../index'

// State type
export interface FormsState {
  activeFormId: string | null
  formData: Record<string, any>
  formErrors: Record<string, string>
  isSubmitting: boolean
  isValid: boolean
  isPendingSave: boolean
  savingStatus: 'saving' | 'saved' | 'error' | 'pending' | 'unsaved' | null
  successMessage: string | null
  errorMessage: string | null
  lastSaveTime: number | null
  initialized: boolean // Track initialization state
}

// Default state
const initialState: FormsState = {
  activeFormId: null,
  formData: {},
  formErrors: {},
  isSubmitting: false,
  isValid: true,
  isPendingSave: false,
  savingStatus: null,
  successMessage: null,
  errorMessage: null,
  lastSaveTime: null,
  initialized: false, // Start as not initialized
}

// Create and export the module factory
export default function createFormsModule(
  services?: FirebaseServices
): Module<FormsState, any> {
  // Get firestore instance from services or undefined if not provided
  const firestore = services?.firebaseFirestore

  // Log initialization
  if (firestore) {
    console.log('Initializing forms module with Firestore:', !!firestore)
  } else {
    console.warn('Forms module initialized without Firestore')
  }

  return {
    namespaced: true,
    state: () => ({ ...initialState }),
    mutations: {
      // Include VuexFire mutations first
      ...vuexfireMutations,

      // Form mutations
      SET_ACTIVE_FORM_ID(state, formId) {
        state.activeFormId = formId
      },

      SET_FORM_DATA(state, data) {
        state.formData = { ...data }
      },

      UPDATE_FORM_FIELD(state, { field, value }) {
        if (state.formData) {
          state.formData[field] = value
        }
      },

      SET_FORM_ERRORS(state, errors) {
        state.formErrors = { ...errors }
      },

      SET_FIELD_ERROR(state, { field, error }) {
        state.formErrors = {
          ...state.formErrors,
          [field]: error,
        }
      },

      CLEAR_FIELD_ERROR(state, field) {
        const errors = { ...state.formErrors }
        delete errors[field]
        state.formErrors = errors
      },

      SET_IS_SUBMITTING(state, isSubmitting) {
        state.isSubmitting = isSubmitting
      },

      SET_IS_VALID(state, isValid) {
        state.isValid = isValid
      },

      SET_IS_PENDING_SAVE(state, isPendingSave) {
        state.isPendingSave = isPendingSave
      },

      SET_SAVING_STATUS(state, status) {
        state.savingStatus = status
      },

      SET_SUCCESS_MESSAGE(state, message) {
        state.successMessage = message
      },

      SET_ERROR_MESSAGE(state, message) {
        state.errorMessage = message
      },

      SET_LAST_SAVE_TIME(state, time) {
        state.lastSaveTime = time
      },

      SET_INITIALIZED(state, initialized) {
        state.initialized = initialized
      },

      RESET_FORM(state) {
        state.formData = {}
        state.formErrors = {}
        state.isSubmitting = false
        state.isValid = true
        state.isPendingSave = false
        state.savingStatus = null
        state.successMessage = null
        state.errorMessage = null
        state.initialized = false
      },
    },
    actions: {
      // Initialize action is now implemented
      initialize({ commit, state }) {
        console.log('Forms module initialized')
        commit('SET_INITIALIZED', true)
        return Promise.resolve()
      },

      // Initialize a form with its ID and initial data
      initForm({ commit }, { formId, initialData }) {
        commit('SET_ACTIVE_FORM_ID', formId)
        commit('SET_FORM_DATA', initialData || {})
      },

      // Validate a field using provided validation rules
      validateField({ commit, state }, { field, validationRules }) {
        if (!validationRules || !validationRules[field]) {
          commit('CLEAR_FIELD_ERROR', field)
          return true
        }

        const rule = validationRules[field]
        const value = state.formData[field]
        const result = rule(value)

        if (typeof result === 'string') {
          commit('SET_FIELD_ERROR', { field, error: result })
          return false
        } else {
          commit('CLEAR_FIELD_ERROR', field)
          return true
        }
      },

      // Validate all fields
      validateAllFields({ dispatch, commit, state }, validationRules) {
        if (!validationRules) return true

        let isValid = true

        for (const field in validationRules) {
          const fieldIsValid = dispatch('validateField', {
            field,
            validationRules,
          })
          if (!fieldIsValid) {
            isValid = false
          }
        }

        commit('SET_IS_VALID', isValid)
        return isValid
      },

      // Update a specific form field
      updateField({ commit }, { field, value }) {
        commit('UPDATE_FORM_FIELD', { field, value })
      },

      // Submit form
      async submitForm(
        { commit, state, dispatch },
        { validationRules, submitHandler, resetAfterSubmit, initialData }
      ) {
        try {
          // Validate form first
          const isValid = await dispatch('validateAllFields', validationRules)
          if (!isValid) {
            commit('SET_ERROR_MESSAGE', 'Please fix all validation errors')
            return false
          }

          // Start submission
          commit('SET_IS_SUBMITTING', true)
          commit('SET_ERROR_MESSAGE', null)
          commit('SET_SUCCESS_MESSAGE', null)

          let result = true

          // Call submit handler if provided
          if (submitHandler) {
            result = await submitHandler(state.formData)
          }

          // Handle success/error message from result object
          if (typeof result === 'object' && result !== null) {
            if ('success' in result) {
              if (result.success && result.message) {
                commit('SET_SUCCESS_MESSAGE', result.message)
              } else if (!result.success && result.message) {
                commit('SET_ERROR_MESSAGE', result.message)
              }
            }
          }

          // Reset form if requested (and if submission was successful)
          if (
            resetAfterSubmit &&
            (result === true || (result && result.success))
          ) {
            if (initialData) {
              commit('SET_FORM_DATA', { ...initialData })
            } else {
              commit('RESET_FORM')
            }
          }

          return result
        } catch (error) {
          console.error('Error submitting form:', error)
          commit('SET_ERROR_MESSAGE', error.message || 'An error occurred')
          return false
        } finally {
          commit('SET_IS_SUBMITTING', false)
        }
      },

      // Reset form to initial data
      resetForm({ commit }, initialData) {
        if (initialData) {
          commit('SET_FORM_DATA', { ...initialData })
        } else {
          commit('RESET_FORM')
        }
        commit('SET_FORM_ERRORS', {})
        commit('SET_ERROR_MESSAGE', null)
        commit('SET_SUCCESS_MESSAGE', null)
      },

      // Load form data from Firestore - handles missing Firestore gracefully
      loadFormFromFirestore: firestoreAction(
        async ({ commit, bindFirestoreRef, unbindFirestoreRef }, payload) => {
          const { formId, docRef, initialState, transform } = payload

          if (!firestore) {
            console.warn(
              'Cannot load form from Firestore: Firestore is not initialized'
            )
            commit('SET_FORM_DATA', initialState || {})
            return
          }

          try {
            if (docRef) {
              // Check if document exists
              const snapshot = await getDoc(docRef)

              if (snapshot.exists()) {
                // Document exists, bind to it
                const data = snapshot.data()

                // Handle data transformation if provided
                const transformedData = transform ? transform(data) : data

                // Merge with initial state to ensure all fields are present
                const mergedData = { ...initialState, ...transformedData }

                commit('SET_FORM_DATA', mergedData)
              } else {
                // Document doesn't exist yet
                commit('SET_FORM_DATA', initialState || {})
              }
            } else {
              console.warn('No document reference provided for form', formId)
              commit('SET_FORM_DATA', initialState || {})
            }
          } catch (error) {
            console.error(`Error loading form data for ${formId}:`, error)
            commit('SET_FORM_DATA', initialState || {})
          }
        }
      ),

      // Save form data to Firestore
      saveFormToFirestore: async ({ commit, state }, payload) => {
        const { docRef, createIfNotExists = true, transform } = payload

        if (!firestore || !docRef) {
          console.warn(
            'Cannot save to Firestore: Firestore or docRef not available'
          )
          return false
        }

        try {
          commit('SET_IS_PENDING_SAVE', true)
          commit('SET_SAVING_STATUS', 'saving')

          // Prepare data for saving, transform if needed
          const dataToSave = transform
            ? transform(state.formData)
            : { ...state.formData }

          // Add timestamps
          const dataWithTimestamp = {
            ...dataToSave,
            updatedAt: serverTimestamp(),
          }

          // Check if document exists
          const docSnapshot = await getDoc(docRef)

          if (docSnapshot.exists()) {
            // Update existing document
            await updateDoc(docRef, dataWithTimestamp)
          } else if (createIfNotExists) {
            // Create new document
            const newData = {
              ...dataWithTimestamp,
              createdAt: serverTimestamp(),
            }
            await setDoc(docRef, newData)
          } else {
            throw new Error(
              'Document does not exist and createIfNotExists is false'
            )
          }

          // Update form state
          commit('SET_SAVING_STATUS', 'saved')
          commit('SET_LAST_SAVE_TIME', Date.now())
          return true
        } catch (error) {
          console.error('Error saving form to Firestore:', error)
          commit('SET_SAVING_STATUS', 'error')
          commit('SET_ERROR_MESSAGE', `Error saving data: ${error.message}`)
          return false
        } finally {
          commit('SET_IS_PENDING_SAVE', false)
        }
      },
    },
    getters: {
      getFormData: (state) => state.formData,
      getFormErrors: (state) => state.formErrors,
      isSubmitting: (state) => state.isSubmitting,
      isValid: (state) => state.isValid,
      isPendingSave: (state) => state.isPendingSave,
      savingStatus: (state) => state.savingStatus,
      successMessage: (state) => state.successMessage,
      errorMessage: (state) => state.errorMessage,
      lastSaveTime: (state) => state.lastSaveTime,
      isInitialized: (state) => state.initialized,
    },
  }
}
