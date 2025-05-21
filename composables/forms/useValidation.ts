// Form validation utilities
export const useValidation = () => {
  /**
   * Common validation rules that can be reused across forms
   */
  const rules = {
    /**
     * Validates that a field is not empty
     */
    required: (value: any) => {
      if (Array.isArray(value))
        return value.length > 0 || 'This field is required'
      if (typeof value === 'string')
        return value.trim() !== '' || 'This field is required'
      return (value !== null && value !== undefined) || 'This field is required'
    },

    /**
     * Validates email format
     */
    email: (value: string) => {
      if (!value) return true // Skip validation if empty (use with required if needed)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value) || 'Please enter a valid email address'
    },

    /**
     * Validates minimum length of string
     */
    minLength: (min: number) => (value: string) => {
      if (!value) return true // Skip validation if empty
      return value.length >= min || `Must be at least ${min} characters`
    },

    /**
     * Validates maximum length of string
     */
    maxLength: (max: number) => (value: string) => {
      if (!value) return true // Skip validation if empty
      return value.length <= max || `Cannot exceed ${max} characters`
    },

    /**
     * Numeric validation
     */
    numeric: (value: string) => {
      if (!value) return true // Skip validation if empty
      return /^[0-9]+$/.test(value) || 'Must contain only numbers'
    },

    /**
     * Validates that a number is within a range
     */
    numberRange: (min: number, max: number) => (value: number) => {
      if (value === null || value === undefined) return true
      return (
        (value >= min && value <= max) || `Must be between ${min} and ${max}`
      )
    },

    /**
     * Custom validation with custom message
     */
    custom:
      (validationFn: (value: any) => boolean, message: string) =>
      (value: any) => {
        return validationFn(value) || message
      },

    /**
     * Password complexity validation
     */
    password: (value: string) => {
      if (!value) return true // Skip validation if empty

      // At least 8 characters, one uppercase, one lowercase, one number
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

      return (
        passwordRegex.test(value) ||
        'Password must be at least 8 characters and include uppercase, lowercase, and numbers'
      )
    },

    /**
     * URL format validation
     */
    url: (value: string) => {
      if (!value) return true // Skip validation if empty

      try {
        new URL(value)
        return true
      } catch {
        return 'Please enter a valid URL'
      }
    },

    /**
     * Match another field (e.g., password confirmation)
     */
    matches:
      (otherValue: any, fieldName: string = 'fields') =>
      (value: any) => {
        return value === otherValue || `The ${fieldName} do not match`
      },
  }

  /**
   * Combine multiple validation rules
   * Returns the first failed validation message or true if all pass
   */
  const combineRules = (rules: Array<(value: any) => boolean | string>) => {
    return (value: any) => {
      for (const rule of rules) {
        const result = rule(value)
        if (result !== true) return result
      }
      return true
    }
  }

  return {
    rules,
    combineRules,
  }
}
