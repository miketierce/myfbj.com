// Standard form handling composable - wrapper around useFormBase
import { computed } from 'vue'
import { useFormBase, type BaseFormOptions } from './useFormBase'

export type FormOptionsCompat<T> = Omit<BaseFormOptions<T>, 'mode'> & {
  // Allowing both legacy onSubmit and new submitHandler
  onSubmit?: (formData: T) => Promise<any> | any
}

/**
 * Standard form handling composable - compatible API with previous version
 * This is now a wrapper around useFormBase for backward compatibility
 */
export function useForm<T extends Record<string, any>>(
  options: FormOptionsCompat<T>
) {
  // Map to new options format
  const baseOptions: BaseFormOptions<T> = {
    ...options,
    mode: 'standard',
    // Use submitHandler as primary, but fall back to onSubmit for backward compatibility
    submitHandler: options.submitHandler || options.onSubmit,
  }

  // Use unified base form implementation
  return useFormBase(baseOptions)
}
