<template>
  <div>
    <div v-if="successMessage" class="mb-4">
      <v-alert
        type="success"
        variant="tonal"
        closable
        @click:close="successMessage = ''"
      >
        {{ successMessage }}
      </v-alert>
    </div>

    <div v-if="error" class="mb-4">
      <v-alert
        type="error"
        variant="tonal"
        closable
        @click:close="error = ''"
      >
        {{ error }}
      </v-alert>
    </div>

    <div class="d-flex align-center justify-space-between mb-4">
      <h3 class="text-h6">{{ title || "Photo Gallery" }}</h3>
      <div v-if="isSaving" class="d-flex align-center">
        <v-progress-circular
          indeterminate
          color="primary"
          size="20"
          width="2"
          class="me-2"
        />
        <span class="text-body-2">Saving changes...</span>
      </div>
    </div>

    <ImageGalleryUpload
      v-model="localGalleryData"
      :max-images="maxImages"
      :max-size-m-b="maxSizeMB"
      :storage-folder="storageFolder"
      @upload-complete="handleGalleryChange"
      @delete-image="handleGalleryChange"
      @update:model-value="handleGalleryChange"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useAuth } from '~/composables/useAuth';
import ImageGalleryUpload from './ImageGalleryUpload.vue';

// Simple debounce function implementation
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Get auth state directly
const { user, isLoading: authLoading } = useAuth();

// Props for configuration
const props = defineProps({
  title: {
    type: String,
    default: 'Photo Gallery'
  },
  maxImages: {
    type: Number,
    default: 4
  },
  maxSizeMB: {
    type: Number,
    default: 5
  },
  storageFolder: {
    type: String,
    default: 'profile-images'
  },
  // Add auto-save debounce time (in milliseconds)
  autoSaveDelay: {
    type: Number,
    default: 1500
  }
});

// Local state
const store = useStore();
const successMessage = ref('');
const error = ref('');
const isSaving = ref(false);
const isDirty = ref(false);
const waitingForAuth = ref(false);

// Get data from Vuex store
const userProfile = computed(() => store.getters['user/userProfile']);
const storePublicImages = computed(() => store.getters['user/publicGalleryImages'] || []);
const storeMainImageId = computed(() => store.getters['user/mainGalleryImageId']);
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);

// Local gallery data that we'll sync with the store
const localGalleryData = ref({
  images: [],
  mainImageId: null
});

// Initialize from Vuex store on mounted
onMounted(() => {
  // If no public images in store, initialize with empty array
  if (!storePublicImages.value || storePublicImages.value.length === 0) {
    localGalleryData.value = {
      images: [],
      mainImageId: null
    };
  } else {
    // Load images from Vuex store
    localGalleryData.value = {
      images: [...storePublicImages.value],
      mainImageId: storeMainImageId.value
    };
  }

  // Mark as clean since we just loaded data
  isDirty.value = false;
});

// Watch for changes in Vuex store and update local data if not dirty or saving
watch([storePublicImages, storeMainImageId], ([newImages, newMainId]) => {
  // Only update local data if we're not in the middle of editing or saving
  if (!isDirty.value && !isSaving.value) {
    localGalleryData.value = {
      images: [...newImages],
      mainImageId: newMainId
    };
  }
}, { deep: true });

// Create a debounced save function using our custom debounce implementation
const debouncedSave = debounce(async () => {
  if (!isDirty.value) return;

  await saveGallery();
}, props.autoSaveDelay);

// Handle changes in gallery data with auto-save
const handleGalleryChange = () => {
  isDirty.value = true;
  // Trigger debounced save
  debouncedSave();
};

// Watch for changes in local gallery data and auto-save when appropriate
watch(() => localGalleryData.value, () => {
  if (isDirty.value) {
    debouncedSave();
  }
}, { deep: true });

// Wait for auth to complete if needed
watch(user, (newUser) => {
  // If we were waiting for auth and now have a user, try saving again
  if (waitingForAuth.value && newUser) {
    waitingForAuth.value = false;
    saveGallery();
  }
});

// Save gallery changes to Firestore via Vuex
const saveGallery = async () => {
  // Don't save if already saving
  if (isSaving.value) return;

  // Check auth state directly from useAuth()
  if (!user.value || authLoading.value) {
    waitingForAuth.value = true;
    return;
  }

  isSaving.value = true;
  error.value = '';

  try {
    // Verify that store has authenticated user
    if (!isAuthenticated.value || !user.value?.uid) {
      // Try updating the auth state in Vuex first
      await store.dispatch('user/onAuthStateChanged', user.value);
    }

    // Filter for public images only
    const publicImages = localGalleryData.value.images.filter(img => img.isPublic);

    // Update profile via Vuex action
    const result = await store.dispatch('user/savePublicGalleryImages', {
      mainImageId: localGalleryData.value.mainImageId,
      publicImages
    });

    if (result.success) {
      successMessage.value = 'Gallery updated';
      isDirty.value = false;

      // Clear success message after 2 seconds
      setTimeout(() => {
        if (successMessage.value === 'Gallery updated') {
          successMessage.value = '';
        }
      }, 2000);
    } else {
      error.value = result.message || 'Failed to save gallery changes';
    }
  } catch (err) {
    console.error('Error saving gallery:', err);
    error.value = err.message || 'An error occurred while saving gallery';
  } finally {
    isSaving.value = false;
  }
};
</script>