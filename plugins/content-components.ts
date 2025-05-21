import { defineNuxtPlugin } from '#app'
import ProseImg from '~/components/prose/ProseImg.vue'

export default defineNuxtPlugin((nuxtApp) => {
  // @ts-expect-error: MDC component type mismatch
  nuxtApp.vueApp.component('ProseImg', ProseImg)
})
