<template>
  <div>
    <v-container>
      <h1 class="text-h4 mb-6">Vuex Form Integration Demo</h1>

      <v-row>
        <v-col cols="12">
          <v-card class="mb-6">
            <v-card-title class="bg-primary-lighten-2">
              Understanding the Integration
            </v-card-title>
            <v-card-text class="mt-4">
              <p>This page demonstrates how we've integrated Vuex, VuexFire, VueFire, and vee-validate
              with your existing form system. Both forms below are functionally identical but use
              different state management approaches:</p>

              <ul class="mt-3 mb-5">
                <li class="mb-2">
                  <strong>Original Form:</strong> Uses your custom form composables directly
                </li>
                <li class="mb-2">
                  <strong>Vuex Form:</strong> Uses Vuex for state management while maintaining the same API
                </li>
              </ul>

              <p>
                With this approach, you can continue using your existing form system while
                gradually migrating to Vuex where needed for compatibility with the system you're
                migrating from.
              </p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-tabs v-model="activeTab" class="mb-6">
        <v-tab value="original">Original Form</v-tab>
        <v-tab value="vuex">Vuex Form</v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <v-window-item value="original">
          <v-card>
            <v-card-title>Original Form Implementation</v-card-title>
            <v-card-text>
              <ProfileForm />
            </v-card-text>
          </v-card>
        </v-window-item>

        <v-window-item value="vuex">
          <v-card>
            <v-card-title>Vuex-based Form Implementation</v-card-title>
            <v-card-text>
              <VuexProfileForm />
            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>

      <v-card class="mt-8">
        <v-card-title>Current Vuex Store State</v-card-title>
        <v-card-text>
          <pre class="code-block">{{ JSON.stringify(storeState, null, 2) }}</pre>
        </v-card-text>
      </v-card>
    </v-container>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from '~/store'
import ProfileForm from '~/components/forms/ProfileForm.vue'
import VuexProfileForm from '~/components/forms/VuexProfileForm.vue'

const store = useStore()
const activeTab = ref('original')

// Expose store state for demonstration
const storeState = computed(() => ({
  forms: store.state.forms,
  user: store.state.user
}))
</script>

<style scoped>
.code-block {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow: auto;
  max-height: 300px;
  font-family: monospace;
}
</style>