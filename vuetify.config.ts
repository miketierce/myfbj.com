// vuetify.config.ts
import type { ThemeDefinition } from 'vuetify'

// Define the wireframe light theme with all required properties
export const wireframeTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    primary: '#000000',
    'primary-darken-1': '#333333',
    secondary: '#333333',
    'secondary-darken-1': '#555555',
    error: '#B00020',
    info: '#444444',
    success: '#333333',
    warning: '#555555',
    'on-background': '#000000',
    'on-surface': '#000000',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-error': '#FFFFFF',
    'on-info': '#FFFFFF',
    'on-success': '#FFFFFF',
    'on-warning': '#000000',
  },
  variables: {
    // Light theme shadow variables
    'shadow-key-umbra-opacity': '0.2',
    'shadow-key-penumbra-opacity': '0.14',
    'shadow-key-ambient-opacity': '0.12',
    'shadow-color': '0, 0, 0',
    'shadow-opacity': '0.2',
  },
}

// Define the wireframe dark theme with all required properties
export const wireframeDarkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#121212',
    surface: '#121212',
    primary: '#FFFFFF',
    'primary-darken-1': '#CCCCCC',
    secondary: '#CCCCCC',
    'secondary-darken-1': '#AAAAAA',
    error: '#CF6679',
    info: '#BBBBBB',
    success: '#CCCCCC',
    warning: '#AAAAAA',
    'on-background': '#FFFFFF',
    'on-surface': '#FFFFFF',
    'on-primary': '#000000',
    'on-secondary': '#000000',
    'on-error': '#000000',
    'on-info': '#000000',
    'on-success': '#000000',
    'on-warning': '#FFFFFF',
  },
  variables: {
    // Dark theme shadow variables - brighter shadows
    'shadow-key-umbra-opacity': '0.25',
    'shadow-key-penumbra-opacity': '0.20',
    'shadow-key-ambient-opacity': '0.16',
    'shadow-color': '255, 255, 255',
    'shadow-opacity': '0.25',
  },
}

// Export configuration for use in plugins
export const vuetifyConfig = {
  theme: {
    defaultTheme: 'wireframe',
    themes: {
      wireframe: wireframeTheme,
      wireframeDark: wireframeDarkTheme,
    },
  },
  icons: {
    defaultSet: 'fa',
  },
  defaults: {
    VCard: {
      rounded: false,
      elevation: 0,
      border: true,
      // Card styling from SCSS
      style: `
        box-shadow: none !important;
        border-radius: 0 !important;
        background-color: rgb(var(--v-theme-surface)) !important;
      `,
    },
    // Add special elevated card styling
    VCardElevated: {
      // This won't directly work, but we'll address via custom CSS
      style: {
        boxShadow:
          '0 3px 8px rgba(var(--v-shadow-color), var(--v-shadow-opacity)) !important',
        border: '1px solid rgba(var(--v-theme-primary), 0.4) !important',
      },
    },
    VBtn: {
      color: 'primary',
      variant: 'outlined',
      rounded: false,
      elevation: 0,
      // Button styling from SCSS
      style: `
        font-family: 'Courier New', monospace !important;
        text-transform: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        letter-spacing: 0.05em !important;
      `,
    },
    VBtnElevated: {
      // Custom styling for elevated buttons
      style: {
        boxShadow:
          '0 2px 4px rgba(var(--v-shadow-color), var(--v-shadow-opacity)) !important',
      },
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      style: `
        font-family: 'Courier New', monospace !important;
        border-radius: 0 !important;
      `,
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable',
      style: `
        font-family: 'Courier New', monospace !important;
        border-radius: 0 !important;
        margin-top: 1em;
      `,
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      style: `
        font-family: 'Courier New', monospace !important;
        border-radius: 0 !important;
      `,
    },
    VAlert: {
      variant: 'outlined',
      border: true,
      rounded: false,
      style: `
        border-radius: 0 !important;
        background-color: transparent !important;
        box-shadow: none !important;
      `,
    },
    VMenu: {
      style: `
        .v-overlay__content {
          border-radius: 0 !important;
          box-shadow: 0 4px 12px rgba(var(--v-shadow-color), var(--v-shadow-opacity)) !important;
          border: 0px solid rgb(var(--v-theme-primary)) !important;
          background-color: transparent !important;
        }
      `,
    },
    VDialog: {
      fullscreen: false, // Make sure dialogs aren't fullscreen by default
      style: `
        .v-overlay__scrim {
          opacity: 0.27 !important;
          position: fixed !important;
          background-color: rgba(0, 0, 0, 0.27) !important;
        }
        .v-dialog {
          position: fixed !important;
          z-index: 999 !important;
          background-color: transparent !important;
        }
        .v-overlay__content {
          border-radius: 0 !important;
          box-shadow: 0 4px 12px rgba(var(--v-shadow-color), var(--v-shadow-opacity)) !important;
          background-color: transparent !important;
        }
      `,
    },
    VSnackbar: {
      style: `
        .v-snackbar__wrapper {
          border-radius: 0 !important;
          box-shadow: 0 4px 12px rgba(var(--v-shadow-color), var(--v-shadow-opacity)) !important;
          border: 1px solid rgb(var(--v-theme-primary)) !important;
          background-color: rgb(var(--v-theme-surface)) !important;
          color: rgb(var(--v-theme-on-surface)) !important;
        }
      `,
    },
  },
}

// Export global CSS string with additional styles that can't be handled by component defaults
export const additionalCss = `
/* Global styles for wireframe look */
body {
  font-family: 'Courier New', monospace !important;
  letter-spacing: 0.02em;
  color: rgb(var(--v-theme-on-background));
  line-height: 1.5;
  background-color: rgb(var(--v-theme-background)) !important;
  transition: color 0.3s ease, background-color 0.3s ease;
}

/* Explicit background colors for light and dark themes to ensure they're applied */
html.light-theme body {
  background-color: #FFFFFF !important;
}

html.dark-theme body {
  background-color: #121212 !important;
}

/* Shadow variables for light and dark themes */
:root, .v-theme--wireframe {
  --shadow-color: 0, 0, 0;
  --shadow-opacity: 0.2;
  --shadow-key-umbra-opacity: 0.2;
  --shadow-key-penumbra-opacity: 0.14;
  --shadow-key-ambient-opacity: 0.12;
}

.v-theme--wireframeDark {
  --shadow-color: 255, 255, 255;
  --shadow-opacity: 0.25;
  --shadow-key-umbra-opacity: 0.25;
  --shadow-key-penumbra-opacity: 0.2;
  --shadow-key-ambient-opacity: 0.16;
}

/* Card styling - add specific styles for elevated cards */
.v-card.v-card--elevated {
  box-shadow: 0 3px 8px rgba(var(--shadow-color), var(--shadow-opacity)) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.4) !important;
}

.v-theme--wireframeDark .v-card.v-card--elevated {
  box-shadow: 0 3px 8px rgba(var(--shadow-color), var(--shadow-opacity)) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.5) !important;
}

/* Button styling - add specific styles for elevated buttons */
.v-btn.v-btn--elevated {
  box-shadow: 0 2px 4px rgba(var(--shadow-color), var(--shadow-opacity)) !important;
}

.v-theme--wireframeDark .v-btn.v-btn--elevated {
  box-shadow: 0 2px 4px rgba(var(--shadow-color), var(--shadow-opacity)) !important;
}

.v-btn.v-btn--elevated:hover,
.v-btn.v-btn--elevated:active,
.v-btn.v-btn--elevated:focus {
  box-shadow: 0 4px 8px rgba(var(--shadow-color), calc(var(--shadow-opacity) + 0.15)) !important;
}

/* Apply white shadows to all elevation classes in dark theme */
.v-theme--wireframeDark .elevation-1,
.v-theme--wireframeDark .elevation-2,
.v-theme--wireframeDark .elevation-3,
.v-theme--wireframeDark .elevation-4,
.v-theme--wireframeDark .elevation-6,
.v-theme--wireframeDark .elevation-8,
.v-theme--wireframeDark .elevation-12,
.v-theme--wireframeDark .elevation-16,
.v-theme--wireframeDark .elevation-24 {
  box-shadow: 0 3px 8px rgba(255, 255, 255, 0.25) !important;
}

/* Fix for menu and dialogs in dark theme to use white shadows */
.v-theme--wireframeDark .v-overlay__content {
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.25) !important;
  border: 1px solid rgba(255, 255, 255, 0.7) !important;
}

/* CRITICAL OVERLAY FIXES - These selectors must appear early and have !important flags */
/* Force all dialog overlays to use semi-transparent background */
.v-overlay {
  position: fixed !important;
  display: block !important;
}

/* Force overlay scrim to be semi-transparent */
.v-overlay__scrim {
  opacity: 0.2 !important;
  background-color: rgba(0, 0, 0, 0.2) !important;
  position: fixed !important;
  inset: 0 !important;
  pointer-events: auto !important;
  transition: opacity 0.25s ease !important;
}

/* Dark theme variation */
.v-theme--wireframeDark .v-overlay__scrim {
  opacity: 0.27 !important;
  background-color: rgba(0, 0, 0, 0.27) !important;
}

/* Force dialog content to have proper styles without hiding content beneath */
.v-dialog {
  box-shadow: 0 4px 12px rgba(var(--v-shadow-color), var(--v-shadow-opacity)) !important;
  border-radius: 0 !important;
  background-color: rgb(var(--v-theme-surface)) !important;
}

.v-overlay__content {
  border-radius: 0 !important;
  position: relative !important;
  margin: 24px !important;
  max-height: calc(100% - 48px) !important;
}

/* Menu-specific overlay styling that doesn't affect dialogs */
.v-menu .v-overlay__content {
  background-color: rgb(var(--v-theme-surface)) !important;
  box-shadow: 0 4px 12px rgba(var(--v-shadow-color), var(--v-shadow-opacity)) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.5) !important;
}

/* Select dropdown specific styling */
.v-select__content .v-overlay__scrim {
  opacity: 0 !important; /* No scrim for select dropdowns */
  background-color: transparent !important;
  display: none !important; /* Completely hide the scrim */
}

/* Fix select dropdown styling */
.v-select__content {
  border-radius: 0 !important;
  box-shadow: 0 2px 4px rgba(var(--v-shadow-color), var(--v-shadow-opacity)) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.4) !important;
  background-color: rgb(var(--v-theme-surface)) !important;
  position: absolute !important;
  z-index: 1000 !important;
  margin-top: 4px !important;
}

/* Remove unwanted permanent outline/shadow on selects */
.v-field.v-field--focused {
  box-shadow: none !important;
}

.v-field--variant-outlined.v-field--focused .v-field__outline {
  opacity: 1 !important;
  color: rgb(var(--v-theme-primary)) !important;
}

/* Card title styling */
.v-card-title {
  font-family: 'Courier New', monospace !important;
  font-weight: bold !important;
  letter-spacing: 0.05em;
  border-bottom: 1px dashed rgb(var(--v-theme-primary));
  padding-bottom: 12px !important;
  color: rgb(var(--v-theme-primary));
}

/* Dark mode text field label styling for all input types */
.v-theme--wireframeDark .v-field-label--floating {
  background-color: #121212 !important;
  padding: 0 4px !important;
  border-radius: 2px !important;
  color: rgba(255, 255, 255, 0.7) !important; /* Ensure visibility against dark outlines */
}

/* Light mode text field label styling for all input types */
.v-theme--wireframe .v-field-label--floating {
  background-color: #FFFFFF !important;
  padding: 0 4px !important;
  border-radius: 2px !important;
  color: rgba(0, 0, 0, 0.7) !important; /* Ensure visibility against light outlines */
}

/* Fix for active/focused field labels to use theme primary color */
.v-field--focused .v-field-label--floating {
  color: rgb(var(--v-theme-primary)) !important;
  font-weight: 500 !important;
}

/* Fix for text field outline colors to match theme */
.v-field.v-field--focused .v-field__outline__start,
.v-field.v-field--focused .v-field__outline__notch,
.v-field.v-field--focused .v-field__outline__end {
  border-color: rgb(var(--v-theme-primary)) !important;
  opacity: 1 !important;
}

/* Global text color classes that respond to theme changes */
.text-primary {
  color: rgb(var(--v-theme-primary)) !important;
}
.text-secondary {
  color: rgb(var(--v-theme-secondary)) !important;
}
.text-default {
  color: rgb(var(--v-theme-on-background)) !important;
}
`
