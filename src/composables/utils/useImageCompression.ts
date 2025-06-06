import { ref } from 'vue'

interface CompressionOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  quality?: number
  useWebWorker?: boolean
}

/**
 * Composable for image compression functionality
 * Uses browser Canvas API for compression
 */
export function useImageCompression() {
  const isCompressing = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Compress an image file
   * @param file The image file to compress
   * @param options Compression options
   * @returns A promise that resolves to the compressed image file
   */
  const compressImage = async (
    file: File,
    options: CompressionOptions = {}
  ): Promise<File> => {
    const {
      maxSizeMB = 1,
      maxWidthOrHeight = 1920,
      quality = 0.8,
      useWebWorker = false,
    } = options

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      throw new Error('File is not an image')
    }

    isCompressing.value = true
    error.value = null

    try {
      // Create an image element
      const img = document.createElement('img')
      const imgDataUrl = await readFileAsDataURL(file)

      // Create a promise to handle image loading
      const imageLoaded = new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = imgDataUrl
      })

      // Wait for image to load
      const loadedImg = await imageLoaded

      // Calculate dimensions while maintaining aspect ratio
      const { width, height } = calculateDimensions(
        loadedImg.width,
        loadedImg.height,
        maxWidthOrHeight
      )

      // Create canvas and context
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Could not get canvas context')
      }

      // Draw image on canvas with new dimensions
      ctx.drawImage(loadedImg, 0, 0, width, height)

      // Get compressed image data as blob
      let blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) resolve(result)
            else reject(new Error('Canvas to Blob conversion failed'))
          },
          file.type,
          quality
        )
      })

      // Check if file size is still larger than maxSizeMB
      if (blob.size > maxSizeMB * 1024 * 1024) {
        // Try with lower quality
        const newQuality = quality * 0.8
        blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (result) => {
              if (result) resolve(result)
              else reject(new Error('Canvas to Blob conversion failed'))
            },
            file.type,
            newQuality
          )
        })

        // If still too large, try with even lower quality
        if (blob.size > maxSizeMB * 1024 * 1024) {
          blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (result) => {
                if (result) resolve(result)
                else reject(new Error('Canvas to Blob conversion failed'))
              },
              file.type,
              0.6
            )
          })
        }
      }

      // Convert blob to file with same name
      const compressedFile = new File([blob], file.name, {
        type: file.type,
        lastModified: Date.now(),
      })

      return compressedFile
    } catch (err: any) {
      error.value = err
      throw err
    } finally {
      isCompressing.value = false
    }
  }

  /**
   * Read a file as a data URL
   */
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  /**
   * Calculate new dimensions while maintaining aspect ratio
   */
  const calculateDimensions = (
    width: number,
    height: number,
    maxSize: number
  ): { width: number; height: number } => {
    if (width <= maxSize && height <= maxSize) {
      return { width, height }
    }

    if (width > height) {
      return {
        width: maxSize,
        height: Math.round((height * maxSize) / width),
      }
    } else {
      return {
        width: Math.round((width * maxSize) / height),
        height: maxSize,
      }
    }
  }

  return {
    compressImage,
    isCompressing,
    error,
  }
}
