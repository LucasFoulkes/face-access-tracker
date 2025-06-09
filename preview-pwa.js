// Simple script to serve the built app for PWA testing
const fs = require('fs');
const path = require('path');
const http = require('http');
const handler = require('serve-handler');

// Check if dist folder exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
    console.error('Error: dist/ folder not found. Please run "npm run build" first.');
    process.exit(1);
}

// Create server
const server = http.createServer((request, response) => {
    // Serve files from the dist directory
    return handler(request, response, {
        public: 'dist',
        rewrites: [
            { source: '/**', destination: '/index.html' }
        ]
    });
});

const PORT = 5173;
server.listen(PORT, () => {
    console.log(`✅ PWA Preview server running at http://localhost:${PORT}`);
    console.log('⚠️ Use this server to test your PWA installation instead of "npm run dev"');
});
