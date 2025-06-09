/**
 * This utility helps diagnose PWA installation issues
 * It can be imported and run in the browser console
 */

export function checkPWAStatus() {
    console.group('PWA Installation Status Check');

    // Check if running in a PWA context
    const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');

    console.log('Running as installed PWA:', isStandalone);

    // Check service worker registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            console.log('Service Worker Registrations:', registrations.length);
            registrations.forEach(reg => {
                console.log('- SW Scope:', reg.scope);
                console.log('- SW State:', reg.active?.state);
                console.log('- SW Mode:', process.env.NODE_ENV);
            });
        });
    } else {
        console.error('Service Workers not supported in this browser');
    }

    // Check for manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    console.log('Manifest found:', !!manifestLink);
    if (manifestLink) {
        console.log('Manifest href:', manifestLink.getAttribute('href'));
        fetch(manifestLink.getAttribute('href') || '')
            .then(response => response.json())
            .then(data => console.log('Manifest content:', data))
            .catch(err => console.error('Error fetching manifest:', err));
    }

    // Check for IndexedDB
    console.log('IndexedDB available:', !!window.indexedDB);

    // Check navigator online status
    console.log('Online status:', navigator.onLine);

    console.groupEnd();
}

// Automatically run the check
if (process.env.NODE_ENV !== 'production') {
    setTimeout(() => {
        checkPWAStatus();
    }, 2000);
}
