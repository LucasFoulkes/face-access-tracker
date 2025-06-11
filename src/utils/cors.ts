// This is a simple middleware for adding CORS headers to the responses
// to allow your app to be served from different hosts/origins

export function setupCorsHeaders(req, res, next) {
    // Allow requests from any origin
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Allow specific headers
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );

    // Allow specific methods
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
    );

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    next();
}

// Function to check if an URL is allowed based on our vite.config.ts allowedHosts
export function isHostAllowed(url) {
    if (!url) return false;

    try {
        const hostname = new URL(url).hostname;
        const allowedHosts = [
            'localhost',
            '127.0.0.1',
            '.ngrok-free.app', // Any ngrok subdomain
        ];

        return allowedHosts.some(host => {
            if (host.startsWith('.')) {
                // For wildcard domains that start with a dot
                return hostname.endsWith(host.substring(1));
            }
            return hostname === host;
        });
    } catch (error) {
        console.error('Error checking host:', error);
        return false;
    }
}
