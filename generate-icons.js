// Simple icon generator for PWA
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a very simple SVG - white square with blue "T" shape
const createSVGIcon = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="white"/>
  <rect x="${size * 0.05}" y="${size * 0.05}" width="${size * 0.9}" height="${size * 0.9}" fill="white" stroke="#eeeeee" stroke-width="${size * 0.02}"/>
  <rect x="${size * 0.3}" y="${size * 0.3}" width="${size * 0.4}" height="${size * 0.1}" fill="#0066cc"/>
  <rect x="${size * 0.45}" y="${size * 0.3}" width="${size * 0.1}" height="${size * 0.4}" fill="#0066cc"/>
</svg>`;

// Generate SVGs
const svg192 = createSVGIcon(192);
const svg512 = createSVGIcon(512);

// Save SVG files
fs.writeFileSync(path.join(__dirname, 'public', 'pwa-192x192.svg'), svg192);
fs.writeFileSync(path.join(__dirname, 'public', 'pwa-512x512.svg'), svg512);
fs.writeFileSync(path.join(__dirname, 'public', 'mask-icon.svg'), svg512);

// Create direct PNG icons (simpler approach)
const createPNG = (size) => {
    const canvas = sharp({
        create: {
            width: size,
            height: size,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
    });

    // Draw a blue T shape on white background
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="white"/>
    <rect x="${size * 0.05}" y="${size * 0.05}" width="${size * 0.9}" height="${size * 0.9}" fill="white" stroke="#eeeeee" stroke-width="${size * 0.02}"/>
    <rect x="${size * 0.3}" y="${size * 0.3}" width="${size * 0.4}" height="${size * 0.1}" fill="#0066cc"/>
    <rect x="${size * 0.45}" y="${size * 0.3}" width="${size * 0.1}" height="${size * 0.4}" fill="#0066cc"/>
  </svg>`;

    return canvas.composite([{
        input: Buffer.from(svg),
        top: 0,
        left: 0
    }]).png();
};

// Generate PNGs
async function generatePNGs() {
    try {
        // Generate 192x192 PNG
        await createPNG(192)
            .toFile(path.join(__dirname, 'public', 'pwa-192x192.png'));

        // Also save as apple-touch-icon.png
        await createPNG(192)
            .toFile(path.join(__dirname, 'public', 'apple-touch-icon.png'));

        // Generate 512x512 PNG
        await createPNG(512)
            .toFile(path.join(__dirname, 'public', 'pwa-512x512.png'));

        console.log('PWA icons created successfully!');
    } catch (error) {
        console.error('Error generating PNG icons:', error);
    }
}

generatePNGs();

generatePNGs();
