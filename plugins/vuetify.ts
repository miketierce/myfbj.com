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

// Import cookie parsing for SSR theme consistency
import { useCookie } from '#app'

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
  expanded: 'fas fa-chevron-up',
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
  // Get theme preference from cookie for SSR consistency
  let defaultTheme = 'wireframe'
  const preferredThemeCookie = useCookie('preferredTheme')
  if (preferredThemeCookie.value === 'wireframeDark') {
    defaultTheme = 'wireframeDark'
  }

  const vuetify = createVuetify({
    // Use the theme configuration with SSR-consistent default theme
    theme: {
      defaultTheme,
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
  nuxtApp.provide('updateThemeClasses', (themeName: string) => {
    if (import.meta.client) {
      if (themeName === 'wireframeDark') {
        document.documentElement.classList.add('dark-theme')
        document.documentElement.classList.add('v-theme--wireframeDark')
        document.documentElement.classList.remove('light-theme')
        document.documentElement.classList.remove('v-theme--wireframe')
        document.body.style.backgroundColor = '#121212'
      } else {
        document.documentElement.classList.add('light-theme')
        document.documentElement.classList.add('v-theme--wireframe')
        document.documentElement.classList.remove('dark-theme')
        document.documentElement.classList.remove('v-theme--wireframeDark')
        document.body.style.backgroundColor = '#FFFFFF'
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

      // Ensure theme classes are applied after app is mounted
      nuxtApp.$updateThemeClasses(
        vuetify.theme?.global?.name?.value || defaultTheme
      )
    })

    // Additional hook to ensure theme consistency during page transitions
    nuxtApp.hook('page:finish', () => {
      nuxtApp.$updateThemeClasses(
        vuetify.theme?.global?.name?.value || defaultTheme
      )
    })
  }

  console.log(
    `Vuetify plugin initialized with theme: ${defaultTheme} (from cookie: ${
      preferredThemeCookie.value || 'none'
    })`
  )
  nuxtApp.vueApp.use(vuetify)
})
