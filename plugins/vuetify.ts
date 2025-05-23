// Import styles
import '@mdi/font/css/materialdesignicons.css'
// Import Font Awesome CSS
import '@fortawesome/fontawesome-free/css/all.css'
import 'vuetify/styles'

// Import Vuetify and Vue
import { createVuetify } from 'vuetify'
import { defineNuxtPlugin } from '#app'
import { h } from 'vue'
import type { IconSet } from 'vuetify'

// Import theme configuration
import {
  vuetifyConfig,
  wireframeTheme,
  wireframeDarkTheme,
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

// Custom icon resolver for Font Awesome
const fa = {
  component: (props: any) => {
    // Cast the icon to string since we're using class strings for FA
    const icon = props.icon as string
    return h('i', { class: icon })
  },
} as IconSet

export default defineNuxtPlugin((nuxtApp: any) => {
  // Get theme from SSR context (set by the theme-detection middleware)
  // This ensures we're using the theme from auth claim when available
  let defaultTheme = 'wireframe'

  if (process.server) {
    // Get theme from server context if available (auth claim)
    if (nuxtApp.ssrContext?.event?.context?.theme) {
      defaultTheme = nuxtApp.ssrContext.event.context.theme
    }
  } else if (import.meta.client) {
    // On client-side, check local storage first for saved preference
    const savedTheme = localStorage.getItem('preferredTheme')
    if (savedTheme === 'wireframe' || savedTheme === 'wireframeDark') {
      defaultTheme = savedTheme
    }
  }

  const vuetify = createVuetify({
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

  // Provide direct access to Vuetify's theme system
  nuxtApp.provide('vuetifyTheme', vuetify.theme)

  // Simpler theme toggler
  nuxtApp.provide('toggleTheme', () => {
    const currentTheme = vuetify.theme.global.current.value.name
    const newTheme =
      currentTheme === 'wireframeDark' ? 'wireframe' : 'wireframeDark'
    vuetify.theme.global.name.value = newTheme

    // Save preference
    if (import.meta.client) {
      localStorage.setItem('preferredTheme', newTheme)
      document.documentElement.setAttribute('data-theme', newTheme)
    }
  })

  // Direct theme setter
  nuxtApp.provide('setTheme', (themeName: string) => {
    if (themeName === 'wireframe' || themeName === 'wireframeDark') {
      vuetify.theme.global.name.value = themeName

      // Save preference
      if (import.meta.client) {
        localStorage.setItem('preferredTheme', themeName)
        document.documentElement.setAttribute('data-theme', themeName)
      }
    }
  })

  // Apply initial theme attribute to document for CSS targeting
  if (import.meta.client) {
    document.documentElement.setAttribute('data-theme', defaultTheme)

    // Apply the theme once DOM is ready
    nuxtApp.hook('app:mounted', () => {
      document.documentElement.setAttribute(
        'data-theme',
        vuetify.theme.global.name.value
      )
    })
  }

  nuxtApp.vueApp.use(vuetify)
})
