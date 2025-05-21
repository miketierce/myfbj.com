import { useFormBase, type FirestoreFormOptions } from './useFormBase'

// Type for backward compatibility with existing code
export type FirestoreFormOptionsCompat<T> = Omit<
  FirestoreFormOptions<T>,
  'mode'
>

/**
 * Firestore-specific form handling composable - wrapper around useFormBase
 * This maintains backward compatibility with previous code
 */
export function useFirestoreForm<T extends Record<string, any>>(
  options: FirestoreFormOptionsCompat<T>
) {
  // Map to new options format with explicit mode
  const firestoreOptions: FirestoreFormOptions<T> = {
    ...options,
    mode: 'firestore',
  }

  // Use unified base form implementation
  return useFormBase(firestoreOptions)
}
