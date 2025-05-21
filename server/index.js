/**
 * Fallback server for Cloud Run deployments
 *
 * This server activates when the Nuxt build output (.output directory) is missing.
 * It provides a minimal HTTP server that responds to health checks and basic routes.
 * Modified to work with ES modules.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get __dirname equivalent in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const DEPLOY_ENV = process.env.DEPLOY_ENV || 'prod';

console.log('🚨 FALLBACK SERVER STARTING');
console.log(`Environment: NODE_ENV=${process.env.NODE_ENV}, DEPLOY_ENV=${DEPLOY_ENV}`);

// Create a basic HTML response
const createHtmlResponse = (title, message, details) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
    h1 { color: #333; }
    .message { background: #f8f9fa; padding: 1rem; border-radius: 4px; border-left: 4px solid #007bff; }
    .details { background: #f1f1f1; padding: 1rem; border-radius: 4px; margin-top: 1rem; white-space: pre-wrap; font-family: monospace; }
    .footer { margin-top: 2rem; font-size: 0.8rem; color: #6c757d; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="message">${message}</div>
  ${details ? `<div class="details">${details}</div>` : ''}
  <div class="footer">Fallback Server • Environment: ${DEPLOY_ENV}</div>
</body>
</html>`;
};

// Check if we have a public directory with static files
const publicDir = path.join(__dirname, '../public');
const hasPublicDir = fs.existsSync(publicDir);

// Create server
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Always respond to health checks
  if (req.url === '/health' || req.url === '/_ah/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  // Try to serve static files from public directory
  if (hasPublicDir && req.url !== '/') {
    const filePath = path.join(publicDir, req.url);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      let contentType = 'text/plain';

      if (filePath.endsWith('.html')) contentType = 'text/html';
      else if (filePath.endsWith('.css')) contentType = 'text/css';
      else if (filePath.endsWith('.js')) contentType = 'application/javascript';
      else if (filePath.endsWith('.json')) contentType = 'application/json';
      else if (filePath.endsWith('.png')) contentType = 'image/png';
      else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';

      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  // Show maintenance page for all other routes
  const title = 'Site Under Maintenance';
  const message = 'The application is currently undergoing maintenance. Please check back shortly.';

  // Add some debug information when not in production
  let details = '';
  if (DEPLOY_ENV !== 'prod') {
    details = `Request: ${req.method} ${req.url}\n`;
    details += `Server Time: ${new Date().toISOString()}\n`;
    details += `Environment: ${DEPLOY_ENV}\n`;
    details += `Node Version: ${process.version}\n`;

    // Check for .output directory
    const outputDir = path.join(__dirname, '../.output');
    details += `\n.output directory exists: ${fs.existsSync(outputDir)}`;

    // Check for entry points
    const entryPoints = [
      '.output/server/index.mjs',
      '.output/server/server.mjs',
    ];

    details += '\n\nEntry point status:';
    entryPoints.forEach(entryPoint => {
      const fullPath = path.join(__dirname, '..', entryPoint);
      details += `\n- ${entryPoint}: ${fs.existsSync(fullPath) ? 'exists' : 'missing'}`;
    });
  }

  res.writeHead(503, { 'Content-Type': 'text/html' });
  res.end(createHtmlResponse(title, message, details));
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🚀 Fallback server listening on http://${HOST}:${PORT}`);
  console.log('This is a temporary maintenance server until the application is fully deployed');
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Fallback server shutting down');
  server.close(() => {
    console.log('Fallback server closed');
    process.exit(0);
  });
});

// Export the server for ES module imports
export default server;