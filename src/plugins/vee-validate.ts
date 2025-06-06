import { defineNuxtPlugin } from '#app'

// Define a simplified validation helper that doesn't depend on vee-validate internals
export default defineNuxtPlugin(() => {
  // Create a simple validation system that matches the API expected by our components
  // but doesn't use the problematic vee-validate constructor
  const validationRules = new Map<string, any>()

  // Simple extend function to register rules
  const extend = (ruleName: string, config: any) => {
    validationRules.set(ruleName, config)
    return config
  }

  // Add our custom rules
  extend('required', {
    validate: (value: any) => {
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'string') return value.trim() !== ''
      return value !== null && value !== undefined
    },
    message: 'This field is required',
  })

  extend('email', {
    validate: (value: any) => {
      if (!value) return true
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value)
    },
    message: 'Please enter a valid email address',
  })

  extend('min', {
    validate: (value: any, { length }: { length: number }) => {
      if (typeof value === 'string') return value.length >= length
      return true
    },
    params: ['length'],
    message: 'This field must be at least {length} characters',
  })

  extend('max', {
    validate: (value: any, { length }: { length: number }) => {
      if (typeof value === 'string') return value.length <= length
      return true
    },
    params: ['length'],
    message: 'This field must be less than {length} characters',
  })

  extend('password', {
    validate: (value: any) => {
      if (!value) return true
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
      return passwordRegex.test(value)
    },
    message:
      'Password must be at least 8 characters and include uppercase, lowercase, and numbers',
  })

  extend('url', {
    validate: (value: any) => {
      if (!value) return true
      try {
        new URL(value)
        return true
      } catch {
        return false
      }
    },
    message: 'Please enter a valid URL',
  })

  // Expose the validation functions to the app
  return {
    provide: {
      validation: {
        validate: (value: any, ruleName: string, params?: any) => {
          const rule = validationRules.get(ruleName)
          if (!rule) return true
          return rule.validate(value, params)
        },
        getMessage: (ruleName: string, params?: any) => {
          const rule = validationRules.get(ruleName)
          if (!rule) return ''
          if (typeof rule.message === 'function') {
            return rule.message(params)
          }
          return rule.message
        },
      },
    },
  }
})
