// VuexFire adapter for Firebase v11
// This adapter provides compatibility between VuexFire 3.x and Firebase 11.x

import { firestoreAction as originalFirestoreAction } from 'vuexfire'
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import type {
  Firestore,
  DocumentReference,
  CollectionReference,
  Query,
} from 'firebase/firestore'

// Interface to match VuexFire's bindFirestoreRef context
interface FirestoreBindingContext {
  state: any
  commit: any
  dispatch: any
  bindFirestoreRef: Function
  unbindFirestoreRef: Function
}

// Store unsubscribe functions to clean up listeners
const unsubscribeFunctions = new Map<string, Function>()

// Enhanced firestoreAction that works with Firebase v11
export const firestoreAction = (actionFunction: Function) => {
  return originalFirestoreAction(
    (context: FirestoreBindingContext, payload: any) => {
      // Create an enhanced context with patched binding methods
      const enhancedContext = {
        ...context,

        // Override the original bindFirestoreRef with our patched version
        bindFirestoreRef: async (key: string, ref: any) => {
          console.log(
            `[VuexFire Adapter] Binding ${key} with Firebase v11 adapter`
          )

          // Clean up any existing subscription
          if (unsubscribeFunctions.has(key)) {
            console.log(
              `[VuexFire Adapter] Cleaning up previous binding for ${key}`
            )
            unsubscribeFunctions.get(key)?.()
            unsubscribeFunctions.delete(key)
          }

          try {
            // Handle document reference
            if (
              ref &&
              typeof ref.path === 'string' &&
              ref.type === 'document'
            ) {
              console.log(`[VuexFire Adapter] Document binding for ${key}`)

              // First get initial data
              const snapshot = await getDoc(ref)
              // Set initial data
              context.commit(
                `${
                  key === 'profile'
                    ? 'SET_PROFILE'
                    : 'vuexfire/VUEXFIRE_DOC_MODIFIED'
                }`,
                {
                  data: snapshot.exists() ? snapshot.data() : null,
                  path: key,
                }
              )

              // Set up subscription for real-time updates
              const unsubscribe = onSnapshot(
                ref,
                (docSnapshot) => {
                  if (docSnapshot.exists()) {
                    // Update the state through the same mutation used by VuexFire
                    context.commit(
                      `${
                        key === 'profile'
                          ? 'SET_PROFILE'
                          : 'vuexfire/VUEXFIRE_DOC_MODIFIED'
                      }`,
                      {
                        data: docSnapshot.data(),
                        path: key,
                      }
                    )
                  } else {
                    // Document deleted or doesn't exist
                    context.commit(
                      `${
                        key === 'profile'
                          ? 'SET_PROFILE'
                          : 'vuexfire/VUEXFIRE_DOC_REMOVED'
                      }`,
                      {
                        data: null,
                        path: key,
                      }
                    )
                  }
                },
                (error) => {
                  console.error(
                    `[VuexFire Adapter] Error in ${key} binding:`,
                    error
                  )
                }
              )

              // Store the unsubscribe function
              unsubscribeFunctions.set(key, unsubscribe)
              return ref
            }
            // Handle collection reference
            else if (
              ref &&
              (ref.type === 'collection' || ref.type === 'query')
            ) {
              console.log(`[VuexFire Adapter] Collection binding for ${key}`)

              // Set initial empty array if state doesn't have it
              if (!Array.isArray(context.state[key])) {
                context.commit('vuexfire/VUEXFIRE_ARRAY_INITIALIZE', {
                  path: key,
                  data: [],
                })
              }

              // Set up subscription for real-time updates
              const unsubscribe = onSnapshot(
                ref,
                (querySnapshot) => {
                  const data = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                  }))

                  // Update the state through the same mutation used by VuexFire
                  context.commit('vuexfire/VUEXFIRE_ARRAY_MODIFIED', {
                    path: key,
                    data,
                  })
                },
                (error) => {
                  console.error(
                    `[VuexFire Adapter] Error in ${key} collection binding:`,
                    error
                  )
                }
              )

              // Store the unsubscribe function
              unsubscribeFunctions.set(key, unsubscribe)
              return ref
            } else {
              console.error(
                `[VuexFire Adapter] Unsupported reference type for ${key}:`,
                ref
              )
              return null
            }
          } catch (error) {
            console.error(`[VuexFire Adapter] Error binding ${key}:`, error)
            return null
          }
        },

        // Override unbindFirestoreRef to properly clean up
        unbindFirestoreRef: (key: string) => {
          console.log(`[VuexFire Adapter] Unbinding ${key}`)
          if (unsubscribeFunctions.has(key)) {
            unsubscribeFunctions.get(key)?.()
            unsubscribeFunctions.delete(key)

            // Also call the original unbind for cleanup
            context.unbindFirestoreRef(key)
          }
        },
      }

      // Call the original action function with our enhanced context
      return actionFunction(enhancedContext, payload)
    }
  )
}

// Export to make the original VuexFire mutations available
export { vuexfireMutations } from 'vuexfire'
