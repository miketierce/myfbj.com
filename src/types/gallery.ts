/**
 * Type definitions for the gallery functionality
 */

/**
 * Interface for gallery image objects
 */
export interface GalleryImage {
  id: string
  url: string
  name: string
  size: number
  isPublic?: boolean
  uploaderUid?: string
  createdAt?: string | Date
  updatedAt?: string | Date
}

/**
 * Interface for gallery data
 */
export interface GalleryData {
  images: GalleryImage[]
  mainImageId: string | null
}

/**
 * Interface for public gallery settings
 */
export interface PublicGallerySettings {
  enabled: boolean
  maxImages: number
  allowComments: boolean
}
