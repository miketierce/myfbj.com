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
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { useAuth } from '~/composables/useAuth';
import { useAppTheme } from '~/composables/useTheme';
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
// Get theme utilities
const { preserveState, getPreservedState, clearPreservedState, themeChangeCount } = useAppTheme();

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

// Define a unique key for this component's state in the preservation cache
const STATE_CACHE_KEY = 'vuex-image-gallery';

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

// Initialize gallery data - try loading from preserved state first, then Vuex store
const initializeGalleryData = () => {
  // First check if we have preserved state from a theme change
  const preservedData = getPreservedState(STATE_CACHE_KEY);

  if (preservedData) {
    console.log('Restoring gallery from preserved state:', preservedData);
    localGalleryData.value = preservedData;
    // Clear the preserved state after using it
    clearPreservedState(STATE_CACHE_KEY);
  } else if (storePublicImages.value && storePublicImages.value.length > 0) {
    // If no preserved state, load from Vuex store
    console.log('Loading gallery from Vuex store:', storePublicImages.value.length, 'images');
    localGalleryData.value = {
      images: [...storePublicImages.value],
      mainImageId: storeMainImageId.value
    };
  } else {
    // If no images in Vuex store, initialize with empty array
    console.log('Initializing empty gallery');
    localGalleryData.value = {
      images: [],
      mainImageId: null
    };
  }

  // Mark as clean since we just loaded data
  isDirty.value = false;
};

// Initialize on component mount
onMounted(() => {
  initializeGalleryData();
});

// Preserve state before unmounting
onBeforeUnmount(() => {
  // Only preserve state if we have images to preserve
  if (localGalleryData.value.images.length > 0) {
    console.log('Preserving gallery state before unmount:', localGalleryData.value.images.length, 'images');
    preserveState(STATE_CACHE_KEY, localGalleryData.value);
  }
});

// Watch for theme changes and preserve state when they occur
watch(themeChangeCount, (newCount, oldCount) => {
  if (newCount !== oldCount && localGalleryData.value.images.length > 0) {
    console.log('Theme changing - preserving gallery state:', localGalleryData.value.images.length, 'images');
    preserveState(STATE_CACHE_KEY, localGalleryData.value);

    // Force restoration of gallery data after theme change
    // (using a short timeout to allow for component re-render)
    setTimeout(() => {
      initializeGalleryData();
    }, 100);
  }
});

// Watch for changes in Vuex store and update local data if not dirty or saving
watch([storePublicImages, storeMainImageId], ([newImages, newMainId]) => {
  // Only update local data if we're not in the middle of editing or saving
  // and if we actually have images from the store
  if (!isDirty.value && !isSaving.value && newImages && newImages.length > 0) {
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
  // Preserve the current state in case of a theme change
  preserveState(STATE_CACHE_KEY, localGalleryData.value);
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