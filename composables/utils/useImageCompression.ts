import { ref } from 'vue'
import ImageCompressor from 'js-image-compressor'

export interface ImageCompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  mimeType?: string
}

/**
 * Composable for image compression with js-image-compressor
 */
export function useImageCompression() {
  const isCompressing = ref(false)
  const error = ref<string | null>(null)

  /**
   * Compresses an image file with configurable options
   */
  const compressImage = async (
    file: File,
    options: ImageCompressionOptions = {}
  ): Promise<File | null> => {
    if (!file) return null

    const defaultOptions = {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.8,
      mimeType: file.type,
    }

    const compressorOptions = {
      ...defaultOptions,
      ...options,
    }

    isCompressing.value = true
    error.value = null

    try {
      return await new Promise((resolve, reject) => {
        // Create a safe instance of ImageCompressor that works with SSR
        if (typeof window === 'undefined') {
          reject(new Error('Image compression can only be used in browser'))
          return
        }

        // Only run in browser
        // Create a new compressor each time to avoid memory leaks
        const compressor = new ImageCompressor({
          quality: compressorOptions.quality,
          mimeType: compressorOptions.mimeType,
          success(result) {
            // Convert compressed blob back to File object
            const compressedFile = new File([result], file.name, {
              type: compressorOptions.mimeType,
            })
            resolve(compressedFile)
          },
          error(err) {
            reject(err)
          },
        })

        // Start compression
        compressor.compress(file, {
          maxWidth: compressorOptions.maxWidth,
          maxHeight: compressorOptions.maxHeight,
        })
      })
    } catch (err: any) {
      error.value = err?.message || 'Error compressing image'
      console.error('Image compression error:', err)
      return null
    } finally {
      isCompressing.value = false
    }
  }

  /**
   * Helper function for profile images with standard sizing
   */
  const processProfileImage = async (file: File): Promise<File | null> => {
    return await compressImage(file, {
      maxWidth: 500,
      maxHeight: 500,
      quality: 0.85,
      mimeType: 'image/jpeg',
    })
  }

  return {
    compressImage,
    processProfileImage,
    isCompressing,
    error,
  }
}
