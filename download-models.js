// This script downloads the face-api.js models to the public/models directory
import { promises as fs } from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelsDir = path.join(__dirname, 'public', 'models');

// Models to download from the CDN - using SSDMobileNetV1 like the working example
const models = [
    'ssd_mobilenetv1_model-weights_manifest.json',
    'ssd_mobilenetv1_model-shard1',
    'ssd_mobilenetv1_model-shard2',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2'
];

// Create models directory if it doesn't exist
async function ensureDirectoryExists() {
    try {
        await fs.mkdir(modelsDir, { recursive: true });
        console.log(`Created directory: ${modelsDir}`);
    } catch (err) {
        if (err.code !== 'EEXIST') {
            console.error(`Error creating directory: ${err.message}`);
            throw err;
        }
    }
}

// Download a file from the URL to the destination
function downloadFile(url, destination) {
    return new Promise((resolve, reject) => {
        console.log(`Downloading ${url} to ${destination}...`);

        const file = fs.createWriteStream(destination);

        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}, status code: ${response.statusCode}`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log(`Downloaded ${url}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(destination).catch(() => { });
            reject(err);
        });

        file.on('error', (err) => {
            fs.unlink(destination).catch(() => { });
            reject(err);
        });
    });
}

// Main function
async function downloadModels() {
    try {
        await ensureDirectoryExists();

        const baseUrl = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';

        for (const model of models) {
            const destination = path.join(modelsDir, model);

            try {
                // Check if file already exists
                await fs.access(destination);
                console.log(`File already exists: ${destination}`);
            } catch (err) {
                // File doesn't exist, download it
                const url = `${baseUrl}/${model}`;
                await downloadFile(url, destination);
            }
        }

        console.log('All models downloaded successfully!');
    } catch (err) {
        console.error('Error downloading models:', err);
        process.exit(1);
    }
}

downloadModels();