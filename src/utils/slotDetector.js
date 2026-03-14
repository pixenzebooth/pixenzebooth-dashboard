/**
 * AI Auto-Detect Photo Slots
 * Scans a PNG frame image for transparent regions and returns bounding boxes as photo slots.
 * Uses connected-component labeling (BFS flood-fill) on the alpha channel.
 */

const SAMPLE_SIZE = 300;
const ALPHA_THRESHOLD = 30;
const MIN_REGION_PERCENT = 1.5;

/**
 * Load an image (URL or data URL) into an HTMLImageElement
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * Detect transparent regions in a frame image and return photo slot coordinates (in %).
 * @param {string} imageSrc - URL or data URL of the frame image
 * @returns {Promise<Array<{id: number, x: number, y: number, width: number, height: number}>>}
 */
export async function detectSlots(imageSrc) {
    const img = await loadImage(imageSrc);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Downscale for performance while keeping aspect ratio
    const scale = Math.min(SAMPLE_SIZE / img.width, SAMPLE_SIZE / img.height, 1);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const pixels = imageData.data;

    // Build binary grid: true = transparent
    const grid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
        const alpha = pixels[i * 4 + 3];
        grid[i] = alpha < ALPHA_THRESHOLD ? 1 : 0;
    }

    // Connected-component labeling via BFS
    const visited = new Uint8Array(w * h);
    const regions = [];

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (grid[idx] === 1 && !visited[idx]) {
                // BFS flood fill
                const queue = [idx];
                visited[idx] = 1;
                let minX = x, maxX = x, minY = y, maxY = y;
                let pixelCount = 0;

                while (queue.length > 0) {
                    const current = queue.shift();
                    const cx = current % w;
                    const cy = Math.floor(current / w);
                    pixelCount++;

                    minX = Math.min(minX, cx);
                    maxX = Math.max(maxX, cx);
                    minY = Math.min(minY, cy);
                    maxY = Math.max(maxY, cy);

                    // 4-directional neighbors
                    const neighbors = [
                        cy > 0 ? current - w : -1,
                        cy < h - 1 ? current + w : -1,
                        cx > 0 ? current - 1 : -1,
                        cx < w - 1 ? current + 1 : -1,
                    ];

                    for (const n of neighbors) {
                        if (n >= 0 && !visited[n] && grid[n] === 1) {
                            visited[n] = 1;
                            queue.push(n);
                        }
                    }
                }

                regions.push({ minX, maxX, minY, maxY, pixelCount });
            }
        }
    }

    // Convert to percentage coordinates and filter out tiny noise regions
    const totalArea = w * h;
    const slots = regions
        .filter(r => {
            const areaPct = (r.pixelCount / totalArea) * 100;
            return areaPct >= MIN_REGION_PERCENT;
        })
        .map((r, idx) => ({
            id: Date.now() + idx,
            x: Math.round((r.minX / w) * 100),
            y: Math.round((r.minY / h) * 100),
            width: Math.round(((r.maxX - r.minX + 1) / w) * 100),
            height: Math.round(((r.maxY - r.minY + 1) / h) * 100),
        }))
        .sort((a, b) => {
            // Sort: top-to-bottom, then left-to-right
            if (Math.abs(a.y - b.y) < 5) return a.x - b.x;
            return a.y - b.y;
        });

    return slots;
}
