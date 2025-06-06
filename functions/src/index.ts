/**
 * Import function triggers from their respective submodules.
 * This file uses Node 22 features and the latest Firebase Functions SDK.
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Import required modules
import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { MemoryOption } from 'firebase-functions/v2/options' // Import MemoryOption

// Define runtime options to take advantage of Node 22
const runtimeOptions = {
  timeoutSeconds: parseInt(process.env.FIREBASE_FUNCTION_TIMEOUT || '60', 10),
  minInstances: parseInt(
    process.env.FIREBASE_FUNCTION_MIN_INSTANCES || '0',
    10
  ),
  maxInstances: parseInt(
    process.env.FIREBASE_FUNCTION_MAX_INSTANCES || '10',
    10
  ),
  concurrency: parseInt(process.env.FIREBASE_FUNCTION_CONCURRENCY || '80', 10),
}

// Determine memory option based on env var (e.g. '512MiB' or '1GiB')
const memoryOption = process.env.FIREBASE_FUNCTION_MEMORY || '512MiB'

// Example HTTP function with Node 22 features
export const helloWorld = onRequest(
  {
    region: process.env.FIREBASE_REGION || 'us-central1',
    timeoutSeconds: runtimeOptions.timeoutSeconds,
    minInstances: runtimeOptions.minInstances,
    maxInstances: runtimeOptions.maxInstances,
    concurrency: runtimeOptions.concurrency,
    memory: memoryOption as '512MiB' | '1GiB' | '2GiB',
  },
  async (request, response) => {
    // Use structured logging
    logger.info('Hello logs!', {
      structuredData: true,
      requestPath: request.path,
      timestamp: new Date().toISOString(),
    })

    // Create a modified array without using .with() method (for TypeScript compatibility)
    const demoArray = [...[1, 2, 3, 4]]
    demoArray[2] = 10

    response.send({
      message: 'Hello from Firebase Functions with Node 22!',
      nodeVersion: process.version,
      demoArray,
    })
  }
)

// Healthcheck endpoint to verify Node 22 runtime
export const healthcheck = onRequest(
  {
    memory: '128MiB' as '128MiB',
    timeoutSeconds: 10,
    minInstances: 0,
    region: process.env.FIREBASE_REGION || 'us-central1',
  },
  async (request, response) => {
    // Return runtime information
    response.send({
      status: 'healthy',
      nodeVersion: process.version,
      nodeMajorVersion: process.versions.node.split('.')[0],
      v8Version: process.versions.v8,
      platform: process.platform,
      arch: process.arch,
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'unknown',
      region: process.env.FIREBASE_REGION || 'us-central1',
    })
  }
)
