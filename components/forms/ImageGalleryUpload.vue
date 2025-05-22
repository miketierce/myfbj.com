<template>
  <div class="image-gallery-upload">
    <h3 class="text-h5 mb-4">Image Gallery</h3>

    <!-- Loading state -->
    <div v-if="isLoading" class="d-flex flex-column align-center my-4">
      <v-progress-circular indeterminate color="primary" />
      <span class="mt-2">Loading images...</span>
    </div>

    <!-- Error state -->
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <!-- Image grid -->
    <div v-if="images.length > 0" class="image-grid mb-4">
      <v-card
        v-for="(image, index) in images"
        :key="image.id || index"
        variant="outlined"
        class="image-card"
      >
        <v-img
          :src="image.url"
          aspect-ratio="1"
          cover
          height="150"
          :alt="`Image ${index + 1}`"
        >
          <template #placeholder>
            <div class="d-flex align-center justify-center fill-height">
              <v-progress-circular indeterminate color="primary" />
            </div>
          </template>
        </v-img>

        <div class="image-overlay d-flex justify-space-between align-center pa-2">
          <v-chip size="small" color="primary" variant="flat">{{ formatFileSize(image.size) }}</v-chip>
          <div class="d-flex">
            <v-btn
              v-if="!isMainImage(image.id)"
              icon="fas fa-star"
              size="small"
              variant="text"
              color="warning"
              @click="setMainImage(image.id)"
              :title="'Set as main image'"
            />
            <v-btn
              icon="fas fa-trash"
              size="small"
              variant="text"
              color="error"
              @click="removeImage(image.id)"
              :title="'Remove image'"
            />
          </div>
        </div>

        <v-overlay
          v-if="isMainImage(image.id)"
          content-class="main-image-overlay"
          absolute
          :model-value="isMainImage(image.id)"
          class="justify-center align-center"
        >
          <v-chip color="warning" label size="small">
            <v-icon start size="x-small">fas fa-star</v-icon>
            Main
          </v-chip>
        </v-overlay>
      </v-card>
    </div>

    <!-- Empty state -->
    <v-card
      v-else-if="!isLoading"
      class="empty-gallery d-flex flex-column align-center justify-center pa-6 mb-4"
      variant="outlined"
      height="200"
    >
      <v-icon icon="fas fa-images" size="48" class="mb-4" color="primary" />
      <p class="text-body-1">No images uploaded yet</p>
      <p class="text-caption">Upload images to your gallery</p>
    </v-card>

    <!-- Upload controls -->
    <div class="upload-controls">
      <v-file-input
        v-model="selectedFiles"
        accept="image/*"
        label="Add images"
        prepend-icon="fas fa-camera"
        multiple
        show-size
        counter
        :loading="isUploading"
        :disabled="isUploading"
        variant="outlined"
        density="compact"
        :error-messages="uploadErrorMessage"
        @change="validateFiles"
      >
        <template #selection="{ fileNames }">
          <v-chip
            v-for="fileName in fileNames"
            :key="fileName"
            label
            size="small"
            color="primary"
            variant="flat"
            class="me-2"
          >
            {{ fileName }}
          </v-chip>
        </template>
      </v-file-input>

      <div class="d-flex align-center justify-space-between mt-4">
        <div class="text-caption">
          Max 5 images, 2MB each. Supported formats: JPG, PNG, GIF
        </div>

        <div class="d-flex">
          <v-btn
            v-if="selectedFiles.length > 0"
            variant="text"
            size="small"
            class="me-2"
            @click="clearSelection"
            :disabled="isUploading"
          >
            Clear
          </v-btn>
          <v-btn
            color="primary"
            :loading="isUploading"
            :disabled="!canUpload"
            @click="uploadImages"
          >
            Upload
            <v-icon end>fas fa-cloud-upload</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- Upload progress -->
      <v-expand-transition>
        <div v-if="isUploading">
          <v-progress-linear
            v-model="uploadProgress"
            color="primary"
            height="20"
            striped
            class="mt-4 rounded"
          >
            <template #default>
              {{ Math.ceil(uploadProgress) }}%
            </template>
          </v-progress-linear>
        </div>
      </v-expand-transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { useAuth } from '~/composables/useAuth';
import { useImageCompression } from '~/composables/utils/useImageCompression';
import { useFirebaseApp } from '~/composables/utils/useFirebaseApp';

// Define props and emits
const props = defineProps({
  userId: {
    type: String,
    default: null
  },
  maxImages: {
    type: Number,
    default: 5
  },
  maxSizeMB: {
    type: Number,
    default: 2
  },
  storageFolder: {
    type: String,
    default: 'profile-images'
  },
  modelValue: {
    type: Object,
    default: () => ({
      images: [],
      mainImageId: null
    })
  }
});

const emit = defineEmits(['update:modelValue', 'upload-complete', 'upload-error', 'delete-image']);

// State
const { user } = useAuth();
const { compressImage } = useImageCompression();
const selectedFiles = ref<File[]>([]);
const images = ref<Array<{id: string, url: string, name: string, size: number}>>([]);
const mainImageId = ref<string | null>(null);
const isLoading = ref(false);
const isUploading = ref(false);
const uploadProgress = ref(0);
const error = ref<string | null>(null);
const uploadErrorMessage = ref<string | null>(null);
const isDevelopment = ref(process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost');

// Get Firebase storage instance from your app
const { storage } = useFirebaseApp();

// Computed properties
const canUpload = computed(() => selectedFiles.value.length > 0 && !uploadErrorMessage.value && !isUploading.value);
const activeUserId = computed(() => props.userId || user.value?.uid);
const storagePath = computed(() => `${props.storageFolder}/${activeUserId.value}`);

// Initialize with model value
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    images.value = newValue.images || [];
    mainImageId.value = newValue.mainImageId || null;
  }
}, { immediate: true, deep: true });

// Watch user changes
watch(() => activeUserId.value, () => {
  if (activeUserId.value) {
    loadImages();
  }
}, { immediate: true });

// Methods
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
}

function validateFiles() {
  uploadErrorMessage.value = null;

  if (selectedFiles.value.length === 0) return;

  // Check file count
  if (images.value.length + selectedFiles.value.length > props.maxImages) {
    uploadErrorMessage.value = `Maximum ${props.maxImages} images allowed (${props.maxImages - images.value.length} more can be added)`;
    return;
  }

  // Check file types and sizes
  for (const file of selectedFiles.value) {
    if (!file.type.match(/image\/(jpeg|jpg|png|gif)/i)) {
      uploadErrorMessage.value = 'Only JPG, PNG and GIF images are allowed';
      return;
    }

    if (file.size > props.maxSizeMB * 1024 * 1024) {
      uploadErrorMessage.value = `Files must be smaller than ${props.maxSizeMB}MB`;
      return;
    }
  }
}

async function loadImages() {
  if (!activeUserId.value) return;

  isLoading.value = true;
  error.value = null;

  try {
    // Handle development environment differently to avoid CORS issues
    if (isDevelopment.value) {
      try {
        const imagesRef = storageRef(storage, storagePath.value);
        const imagesList = await listAll(imagesRef);

        const loadedImages = await Promise.all(
          imagesList.items.map(async (item) => {
            try {
              const url = await getDownloadURL(item);
              return {
                id: item.name,
                url,
                name: item.name,
                size: 0 // We can't reliably get size in development due to CORS
              };
            } catch (err) {
              console.warn('Error loading image:', err);
              return null;
            }
          })
        );

        images.value = loadedImages.filter(img => img !== null) as any[];
      } catch (corsErr) {
        console.warn('CORS error loading images from Firebase Storage:', corsErr);
        // In development, show a friendly message and don't block the UI
        error.value = 'Images can\'t be loaded in development due to CORS restrictions. This is normal and will work in production.';
      }
    } else {
      // Production code path
      const imagesRef = storageRef(storage, storagePath.value);
      const imagesList = await listAll(imagesRef);

      const loadedImages = await Promise.all(
        imagesList.items.map(async (item) => {
          try {
            const url = await getDownloadURL(item);
            const metadata = await fetch(url, { method: 'HEAD' })
              .then(response => ({
                size: parseInt(response.headers.get('Content-Length') || '0'),
                type: response.headers.get('Content-Type')
              }));

            return {
              id: item.name,
              url,
              name: item.name,
              size: metadata.size
            };
          } catch (err) {
            console.error('Error loading image metadata:', err);
            return {
              id: item.name,
              url: await getDownloadURL(item),
              name: item.name,
              size: 0
            };
          }
        })
      );

      images.value = loadedImages;
    }

    updateModelValue();
  } catch (err: any) {
    console.error('Error loading images:', err);
    error.value = `Error loading images: ${err.message}`;
  } finally {
    isLoading.value = false;
  }
}

function clearSelection() {
  selectedFiles.value = [];
  uploadErrorMessage.value = null;
}

async function uploadImages() {
  if (!activeUserId.value || selectedFiles.value.length === 0) return;

  isUploading.value = true;
  uploadProgress.value = 0;
  error.value = null;

  // If in development mode, show a friendly message
  if (isDevelopment.value) {
    try {
      // We'll still try to upload, but warn the user it might fail
      console.warn('Attempting uploads in development mode - may encounter CORS issues');
    } catch (err) {
      console.error('Development upload error:', err);
    }
  }

  const totalFiles = selectedFiles.value.length;
  let completedFiles = 0;
  let failedFiles = 0;

  for (const file of selectedFiles.value) {
    try {
      // Generate a unique file name (timestamp + original name)
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const fileRef = storageRef(storage, `${storagePath.value}/${fileName}`);

      // Compress image before uploading
      let fileToUpload = file;
      if (file.type.match(/image\/(jpeg|jpg|png)/i)) {
        try {
          fileToUpload = await compressImage(file, {
            maxSizeMB: props.maxSizeMB,
            maxWidthOrHeight: 1200
          });
        } catch (compressionErr) {
          console.warn('Image compression failed, using original file:', compressionErr);
        }
      }

      // Upload file
      const uploadTask = uploadBytesResumable(fileRef, fileToUpload);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            uploadProgress.value = ((completedFiles / totalFiles) * 100) + (fileProgress / totalFiles);
          },
          (err) => {
            failedFiles++;
            console.error('Error uploading file:', err);
            reject(err);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              images.value.push({
                id: fileName,
                url: downloadUrl,
                name: file.name,
                size: uploadTask.snapshot.totalBytes
              });

              // Set as main image if this is the first image
              if (images.value.length === 1 && !mainImageId.value) {
                mainImageId.value = fileName;
              }

              completedFiles++;
              updateModelValue();
              resolve();
            } catch (err) {
              failedFiles++;
              reject(err);
            }
          }
        );
      });
    } catch (err: any) {
      failedFiles++;

      // In development, handle CORS errors specially
      if (isDevelopment.value && err.message && (
          err.message.includes('CORS') ||
          err.message.includes('access control') ||
          err.message.includes('network error')
        )) {
        console.warn('CORS issue during upload in development:', err);
        error.value = 'Upload failed due to CORS restrictions in development. This will work in production.';
      } else {
        console.error('Error processing file:', err);
      }
    }
  }

  isUploading.value = false;
  selectedFiles.value = [];

  if (failedFiles > 0) {
    if (!error.value) { // Don't override specific CORS error
      error.value = `Failed to upload ${failedFiles} file(s)`;
    }
    emit('upload-error', error.value);
  } else {
    emit('upload-complete', images.value);
  }
}

function isMainImage(id: string): boolean {
  return mainImageId.value === id;
}

function setMainImage(id: string) {
  mainImageId.value = id;
  updateModelValue();
}

async function removeImage(id: string) {
  if (!activeUserId.value) return;

  try {
    // In development we may not be able to delete due to CORS,
    // but we'll try and still update local state
    try {
      const imageRef = storageRef(storage, `${storagePath.value}/${id}`);
      await deleteObject(imageRef);
    } catch (err) {
      if (isDevelopment.value) {
        console.warn('CORS may prevent deletion in development:', err);
      } else {
        throw err;
      }
    }

    // Remove from array
    images.value = images.value.filter(img => img.id !== id);

    // Adjust main image if necessary
    if (mainImageId.value === id) {
      mainImageId.value = images.value.length > 0 ? images.value[0].id : null;
    }

    updateModelValue();
    emit('delete-image', id);
  } catch (err: any) {
    console.error('Error removing image:', err);
    error.value = `Error removing image: ${err.message}`;
  }
}

function updateModelValue() {
  emit('update:modelValue', {
    images: images.value,
    mainImageId: mainImageId.value
  });
}
</script>

<style scoped>
.image-gallery-upload {
  width: 100%;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.image-card {
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease;
}

.image-card:hover {
  transform: translateY(-3px);
}

.image-overlay {
  background: rgba(var(--v-theme-surface-rgb), 0.7);
  backdrop-filter: blur(3px);
}

.main-image-overlay {
  background: rgba(var(--v-theme-surface-rgb), 0.3);
  backdrop-filter: blur(1px);
}

.empty-gallery {
  background: rgba(var(--v-theme-surface-rgb), 0.5);
  border: 2px dashed rgba(var(--v-theme-primary-rgb), 0.3);
  border-radius: 12px;
}
</style>