# Unified Form System for Nuxt 3

This form system provides a flexible, unified API for handling forms with multiple backends.

## Key Features

- **Multiple Backend Support**: Choose between standard forms, direct Firestore integration, VueFire integration, or Vuex state management
- **Consistent API**: All modes expose the same interface, making it easy to switch between modes
- **Validation**: Built-in validation with customizable rules
- **Real-time Syncing**: Firestore and VueFire modes support real-time data synchronization
- **TypeScript Support**: Full TypeScript support with proper interfaces and typings

## Basic Usage

```typescript
// Import the unified form system
import { useUnifiedForm } from '~/composables/forms'

// Create a form instance with your preferred mode
const form = useUnifiedForm({
  formId: 'contact-form',
  mode: 'standard', // 'standard', 'firestore', 'vuefire', or 'vuex'
  initialState: {
    name: '',
    email: '',
    message: ''
  },
  validationRules: {
    name: v => !!v || 'Name is required',
    email: v => /^\S+@\S+\.\S+$/.test(v) || 'Email must be valid',
    message: v => v.length >= 10 || 'Message must be at least 10 characters'
  },
  submitHandler: async (data) => {
    // Submit your form data
    const result = await submitToApi(data)

    return {
      success: result.success,
      message: result.success ? 'Form submitted successfully' : 'Failed to submit'
    }
  }
})

// Now use the form in your component
// form.formData, form.handleSubmit, form.validateField, etc.
```

## Form Modes

### Standard Mode (Default)

Simple in-component state without external dependencies.

```typescript
const form = useUnifiedForm({
  formId: 'my-form',
  // mode: 'standard' is the default
  initialState: { name: '', email: '' }
})
```

### Firestore Mode

Direct integration with Firebase/Firestore.

```typescript
import { doc } from 'firebase/firestore'
import { useFirebaseApp } from '~/composables/utils/useFirebaseApp'

const { firestore } = useFirebaseApp()
const docRef = doc(firestore, 'collection', 'document-id')

const form = useUnifiedForm({
  formId: 'firestore-form',
  mode: 'firestore',
  docRef: docRef,
  initialState: { title: '', content: '' },
  createIfNotExists: true // Create document if it doesn't exist
})
```

### VueFire Mode

Integration via VueFire library.

```typescript
import { doc } from 'firebase/firestore'
import { useFirebaseApp } from '~/composables/utils/useFirebaseApp'

const { firestore } = useFirebaseApp()
const docRef = doc(firestore, 'collection', 'document-id')

const form = useUnifiedForm({
  formId: 'vuefire-form',
  mode: 'vuefire',
  docRef: docRef,
  initialState: { title: '', content: '' }
})
```

### Vuex Mode (Legacy)

Integration with Vuex for state management.

```typescript
const form = useUnifiedForm({
  formId: 'vuex-form',
  mode: 'vuex',
  initialState: { username: '', preferences: {} }
})
```

## Specialized Form Extensions

### Profile Form

```typescript
import { useProfileForm } from '~/composables/forms'

const profileForm = useProfileForm({
  mode: 'firestore', // or 'standard', 'vuefire', 'vuex'
  formId: 'user-profile'
})
```

### User Settings Form

```typescript
import { useUserSettingsForm } from '~/composables/forms'

const settingsForm = useUserSettingsForm({
  mode: 'vuefire', // or 'standard', 'firestore', 'vuex'
  formId: 'user-settings',
  initialSync: true
})
```

## Common Form Methods and Properties

| Property/Method | Description |
|----------------|-------------|
| `formData` | Reactive object containing form data |
| `formErrors` | Reactive object containing validation errors |
| `isValid` | Boolean ref indicating if the form is valid |
| `isSubmitting` | Boolean ref indicating if the form is being submitted |
| `successMessage` | Ref containing success message after submission |
| `errorMessage` | Ref containing error message if submission fails |
| `validateField(field)` | Validate a specific field |
| `validateAllFields()` | Validate all fields at once |
| `handleSubmit()` | Submit the form (triggers validation & submitHandler) |
| `resetForm()` | Reset the form to its initial state |
| `updateField(field, value)` | Update a single field |
| `updateFields(fields)` | Update multiple fields at once |

## Firestore-Specific Methods and Properties

These are available only when using 'firestore' or 'vuefire' mode:

| Property/Method | Description |
|----------------|-------------|
| `saveToFirestore()` | Save current form data to Firestore |
| `isPendingSave` | Boolean ref indicating pending save operation |
| `savingStatus` | Status of the save operation ('saving', 'saved', 'error', etc.) |
| `lastSaveTime` | Timestamp of the last successful save |

## Migration from Legacy Form System

If you're migrating from the previous form system, you can either:

1. Use the direct mode-specific functions for backward compatibility:

```typescript
// Old way - still supported
import { useFirestoreForm } from '~/composables/forms'

const form = useFirestoreForm({
  initialState: { name: '' },
  docRef: docRef
})
```

2. Or use the unified system with explicit mode:

```typescript
// New way - recommended
import { useUnifiedForm } from '~/composables/forms'

const form = useUnifiedForm({
  formId: 'my-form',
  mode: 'firestore',
  initialState: { name: '' },
  docRef: docRef
})
```

## Best Practices

1. **Choose the Right Mode**:
   - `standard`: Simple forms without external storage
   - `firestore`: Direct Firestore integration with manual Firebase setup
   - `vuefire`: Firestore integration via VueFire (simpler but less control)
   - `vuex`: Legacy integration with Vuex stores

2. **Form IDs**: Always use unique form IDs, especially for Vuex mode

3. **Validation**: Define validation rules for important fields

4. **Error Handling**: Always check `isValid` before submission

5. **Cleanup**: The cleanup method is automatically called when the component is unmounted, but can be called manually if needed