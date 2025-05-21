// Import styles
import '@mdi/font/css/materialdesignicons.css'
// Import Font Awesome CSS
import '@fortawesome/fontawesome-free/css/all.css'
import 'vuetify/styles'

// Import Vuetify and Vue
import { createVuetify } from 'vuetify'
import { defineNuxtPlugin } from '#app'
import { h } from 'vue'

// Import theme configuration
import {
  vuetifyConfig,
  wireframeTheme,
  wireframeDarkTheme,
  additionalCss,
} from '../vuetify.config'

// Define Font Awesome icons for Vuetify 3
const aliases = {
  // Default set is fa, so these are for Font Awesome
  complete: 'fas fa-check',
  cancel: 'fas fa-times',
  close: 'fas fa-times',
  delete: 'fas fa-trash-alt',
  clear: 'fas fa-times-circle',
  success: 'fas fa-check-circle',
  info: 'fas fa-info-circle',
  warning: 'fas fa-exclamation',
  error: 'fas fa-exclamation-triangle',
  prev: 'fas fa-chevron-left',
  next: 'fas fa-chevron-right',
  checkboxOn: 'fas fa-check-square',
  checkboxOff: 'far fa-square',
  checkboxIndeterminate: 'fas fa-minus-square',
  delimiter: 'fas fa-circle',
  sort: 'fas fa-sort-up',
  expand: 'fas fa-chevron-down',
  menu: 'fas fa-bars',
  subgroup: 'fas fa-caret-down',
  dropdown: 'fas fa-caret-down',
  radioOn: 'far fa-dot-circle',
  radioOff: 'far fa-circle',
  edit: 'fas fa-edit',
  ratingEmpty: 'far fa-star',
  ratingFull: 'fas fa-star',
  ratingHalf: 'fas fa-star-half',
  loading: 'fas fa-sync',
  first: 'fas fa-step-backward',
  last: 'fas fa-step-forward',
  unfold: 'fas fa-arrows-alt-v',
  file: 'fas fa-paperclip',
  plus: 'fas fa-plus',
  minus: 'fas fa-minus',
}

// Define the IconProps type
type IconProps = {
  icon: string
}

// Custom icon resolver for Font Awesome
const fa = {
  component: (props: IconProps) => {
    const icon = props.icon as string
    return h('i', { class: icon })
  },
}

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    // Use the theme configuration directly from vuetify.config.ts
    theme: {
      defaultTheme: 'wireframe',
      themes: {
        wireframe: wireframeTheme,
        wireframeDark: wireframeDarkTheme,
      },
    },
    // Configure Font Awesome icons
    icons: {
      defaultSet: 'fa',
      aliases,
      sets: { fa },
    },
    // Add default component styles
    defaults: vuetifyConfig.defaults,
  })

  // Provide a helper function to update theme class on the HTML element
  // This is simpler than before - just sets the appropriate class based on the theme name
  nuxtApp.provide('updateThemeClasses', (themeName: string) => {
    if (import.meta.client) {
      if (themeName === 'wireframeDark') {
        document.documentElement.classList.add('dark-theme')
        document.documentElement.classList.remove('light-theme')
      } else {
        document.documentElement.classList.add('light-theme')
        document.documentElement.classList.remove('dark-theme')
      }
    }
  })

  // Apply the additional CSS when on client-side
  if (import.meta.client) {
    // Create style element for the additional CSS
    const styleEl = document.createElement('style')
    styleEl.textContent = additionalCss
    styleEl.id = 'vuetify-additional-styles'

    // Wait for document to be ready before adding styles
    nuxtApp.hook('app:mounted', () => {
      document.head.appendChild(styleEl)
      console.log('Applied additional Vuetify styles from vuetify.config.ts')
    })
  }

  console.log(
    'Vuetify plugin initialized with wireframe themes from vuetify.config.ts'
  )
  nuxtApp.vueApp.use(vuetify)
})
