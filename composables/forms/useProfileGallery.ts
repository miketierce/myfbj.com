import { ref, computed, watch } from 'vue'
import { getStorage, ref as storageRef } from 'firebase/storage'
import { useAuth } from '../useAuth'

export interface GalleryImage {
  id: string
  url: string
  name: string
  size: number
  isPublic?: boolean
  uploaderUid?: string
}

export interface ProfileGallery {
  images: GalleryImage[]
  mainImageId: string | null
}

/**
 * Composable for managing a user's profile image gallery
 */
export function useProfileGallery(options: { initialValue?: ProfileGallery }) {
  const { user } = useAuth()

  // State
  const galleryData = ref<ProfileGallery>(
    options.initialValue || { images: [], mainImageId: null }
  )
  const isDirty = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)
  const lastSaveTime = ref<number | null>(null)

  // Computed
  const mainImage = computed(() => {
    if (!galleryData.value.mainImageId) return null
    return (
      galleryData.value.images.find(
        (img) => img.id === galleryData.value.mainImageId
      ) || null
    )
  })

  const profileImageUrl = computed(() => mainImage.value?.url || null)

  // Get public images that should be shared in the profile
  const publicImages = computed(() => {
    return galleryData.value.images.filter((img) => img.isPublic)
  })

  // Track changes to mark as dirty
  watch(
    () => galleryData.value,
    () => {
      isDirty.value = true
    },
    { deep: true }
  )

  // Methods
  function updateGallery(newGallery: ProfileGallery) {
    galleryData.value = {
      images: [...newGallery.images],
      mainImageId: newGallery.mainImageId,
    }
    isDirty.value = true
  }

  function resetGallery(defaultValue?: ProfileGallery) {
    galleryData.value = defaultValue || { images: [], mainImageId: null }
    isDirty.value = false
  }

  async function saveGalleryToProfile(
    saveCallback: (data: {
      profileImageUrl: string | null
      publicGalleryImages: GalleryImage[]
    }) => Promise<boolean>
  ) {
    if (!user.value) {
      error.value = 'User not authenticated'
      return false
    }

    isSaving.value = true
    error.value = null

    try {
      // Prepare public images for Firestore by creating a simplified version
      // that only includes necessary fields (avoid storing unnecessary data)
      const publicGalleryImages = publicImages.value.map((img) => ({
        id: img.id,
        url: img.url,
        name: img.name,
        size: img.size,
      }))

      const result = await saveCallback({
        profileImageUrl: profileImageUrl.value,
        publicGalleryImages,
      })

      if (result) {
        isDirty.value = false
        lastSaveTime.value = Date.now()
      }

      return result
    } catch (err: any) {
      error.value = `Failed to save gallery: ${err.message}`
      return false
    } finally {
      isSaving.value = false
    }
  }

  return {
    galleryData,
    isDirty,
    isSaving,
    error,
    lastSaveTime,
    mainImage,
    profileImageUrl,
    publicImages,
    updateGallery,
    resetGallery,
    saveGalleryToProfile,
  }
}

export interface ProfileImageUploadOptions {
  maxImages?: number
  maxSizeMB?: number
  storageFolder?: string
}

/**
 * Helper to get storage path for profile images
 */
export function getProfileImageStoragePath(
  userId: string,
  options: ProfileImageUploadOptions = {}
) {
  const folder = options.storageFolder || 'profile-images'
  return `${folder}/${userId}`
}
