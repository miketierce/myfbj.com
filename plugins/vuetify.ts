// Import styles
import '@mdi/font/css/materialdesignicons.css'
// Import Font Awesome CSS
import '@fortawesome/fontawesome-free/css/all.css'
import 'vuetify/styles'

// Import Vuetify and Vue
import { createVuetify } from 'vuetify'
import { fa as vuetifyFa } from 'vuetify/iconsets/fa'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
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
const fontAwesomeAliases = {
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

// Define an SSR theme key for passing from server to client
const SSR_THEME_KEY = '__VUETIFY_THEME__'

export default defineNuxtPlugin((nuxtApp: any) => {
  // First determine the initial theme to use
  let defaultTheme = 'wireframe' // Start with light theme

  // On the server side, check for theme in the event context (set by middleware)
  if (import.meta.server && nuxtApp.ssrContext) {
    const eventTheme = nuxtApp.ssrContext.event.context.theme
    if (eventTheme === 'wireframeDark' || eventTheme === 'wireframe') {
      defaultTheme = eventTheme
    }

    // Pass the theme to the client via payload
    nuxtApp.payload[SSR_THEME_KEY] = defaultTheme
  } else if (import.meta.client) {
    // On client side, first priority is the SSR payload for proper hydration
    if (nuxtApp.payload && nuxtApp.payload[SSR_THEME_KEY]) {
      defaultTheme = nuxtApp.payload[SSR_THEME_KEY]
      console.log('Using theme from SSR payload:', defaultTheme)
    }
    // Do NOT load from localStorage during initial hydration to avoid mismatches
  }

  // Create Vuetify instance with the determined theme
  const vuetify = createVuetify({
    ssr: true, // Enable SSR
    theme: {
      defaultTheme,
      themes: {
        wireframe: wireframeTheme,
        wireframeDark: wireframeDarkTheme,
      },
    },
    icons: {
      defaultSet: 'fa',
      aliases: fontAwesomeAliases,
      sets: { fa },
    },
    defaults: vuetifyConfig.defaults,
  })

  // Provide access to Vuetify's theme system
  nuxtApp.provide('vuetifyTheme', vuetify.theme)

  // Theme toggler
  nuxtApp.provide('toggleTheme', () => {
    const currentTheme = vuetify.theme.global.current.value.name
    const newTheme =
      currentTheme === 'wireframeDark' ? 'wireframe' : 'wireframeDark'
    vuetify.theme.global.name.value = newTheme

    // Save preference - only after hydration is complete
    if (import.meta.client) {
      localStorage.setItem('preferredTheme', newTheme)

      // Also set cookie for SSR consistency
      document.cookie = `preferredTheme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`
    }
  })

  // Theme setter
  nuxtApp.provide('setTheme', (themeName: string) => {
    if (themeName === 'wireframe' || themeName === 'wireframeDark') {
      vuetify.theme.global.name.value = themeName

      // Save preference - only after hydration is complete
      if (import.meta.client) {
        localStorage.setItem('preferredTheme', themeName)

        // Also set cookie for SSR consistency
        document.cookie = `preferredTheme=${themeName}; path=/; max-age=31536000; SameSite=Lax`
      }
    }
  })

  // Only apply client-side specific theme handling after hydration is complete
  if (import.meta.client) {
    nuxtApp.hook('app:mounted', () => {
      // Wait for hydration to complete before checking body background
      setTimeout(() => {
        // Just to be safe, validate that body background matches theme
        const isCurrentlyDark = vuetify.theme.global.current.value.dark
        const bodyBgColor = isCurrentlyDark ? '#121212' : '#FFFFFF'

        // Only set if needed to avoid unnecessary style mutations
        if (
          window.getComputedStyle(document.body).backgroundColor !== bodyBgColor
        ) {
          document.body.style.backgroundColor = bodyBgColor
        }

        // After hydration is complete, it's safe to restore user preferences
        const storedTheme = localStorage.getItem('preferredTheme')
        if (
          storedTheme &&
          (storedTheme === 'wireframe' || storedTheme === 'wireframeDark') &&
          storedTheme !== vuetify.theme.global.name.value
        ) {
          console.log(`Applying saved theme after hydration: ${storedTheme}`)
          vuetify.theme.global.name.value = storedTheme
        }
      }, 100)
    })
  }

  nuxtApp.vueApp.use(vuetify)
})
