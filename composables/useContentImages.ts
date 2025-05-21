import { onMounted } from 'vue'

/**
 * Composable to transform content images to use absolute paths
 * and fix path issues when deployed
 */
export const useContentImages = () => {
  // Function to fix content images after the DOM is loaded
  const fixContentImages = () => {
    // Only run in client-side
    if (import.meta.client) {
      // Find all images in content
      const contentImages = document.querySelectorAll(
        '.nuxt-content-container img, .prose img'
      )

      contentImages.forEach((img) => {
        const imgElement = img as HTMLImageElement

        // Handle different path formats
        if (imgElement.src) {
          // Fix relative paths with ./ prefix
          if (imgElement.src.includes('./images/')) {
            imgElement.src = imgElement.src.replace('./images/', '/images/')
          }

          // Critical fix: Remove /public/ prefix which is causing the issue
          if (imgElement.src.includes('/public/')) {
            console.log(
              `Fixing image path: ${imgElement.src} → ${imgElement.src.replace(
                '/public/',
                '/'
              )}`
            )
            imgElement.src = imgElement.src.replace('/public/', '/')
          }

          // Fix paths without leading slash
          if (imgElement.src.match(/^(https?:\/\/[^/]+\/)?images\//)) {
            const urlParts = new URL(imgElement.src)
            const pathname = urlParts.pathname

            // Only fix if it's a local path without a leading slash
            if (pathname.startsWith('images/')) {
              imgElement.src = imgElement.src.replace('images/', '/images/')
            }
          }

          // Always convert IPX paths to standard paths for simplicity
          if (imgElement.src.includes('/_ipx/_/images/')) {
            imgElement.src = imgElement.src.replace(
              '/_ipx/_/images/',
              '/images/'
            )
          }
        }

        // Add styling classes if needed
        imgElement.classList.add('content-image')

        // Add loading="lazy" for better performance
        imgElement.loading = 'lazy'
      })
    }
  }

  // Run after the component is mounted
  onMounted(() => {
    // Wait a small amount of time to ensure content is rendered
    setTimeout(fixContentImages, 100)

    // Run again after a longer time to catch any dynamically loaded images
    setTimeout(fixContentImages, 500)

    // Add a mutation observer to handle dynamically loaded content
    const contentContainer = document.querySelector('.nuxt-content-container')
    if (contentContainer) {
      const observer = new MutationObserver(() => {
        fixContentImages()
      })

      observer.observe(contentContainer, {
        childList: true,
        subtree: true,
      })
    }
  })

  // Return any functions or variables that might be useful
  return {
    fixContentImages,
  }
}
