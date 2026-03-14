/**
 * Detects the type of music link and returns an embeddable URL.
 * Supports: YouTube, Spotify
 * 
 * @param {string} url - The raw URL input
 * @returns {object|null} - { type: 'youtube'|'spotify', src: string } or null
 */
export const getEmbedData = (url) => {
    if (!url) return null;

    // YOUTUBE
    // Regex for: youtube.com/watch?v=ID, youtube.com/embed/ID, youtu.be/ID
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = url.match(ytRegex);

    // Extract timestamp (t=1m30s or t=90)
    const timeRegex = /[?&](?:t|start)=(\d+(?:m\d+s)?|\d+)/i;
    const timeMatch = url.match(timeRegex);
    let startParam = '';

    if (timeMatch && timeMatch[1]) {
        let time = timeMatch[1];
        // Convert 1m30s format to seconds
        if (time.includes('m')) {
            const parts = time.match(/(\d+)m(\d+)s/);
            if (parts) {
                time = parseInt(parts[1]) * 60 + parseInt(parts[2]);
            }
        }
        startParam = `&start=${time}`;
    }

    if (ytMatch && ytMatch[1]) {
        return {
            type: 'youtube',
            // autoplay=1 (muted usually needed for chrome), controls=0 (minimal), loop=1
            src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&controls=1&loop=1&playlist=${ytMatch[1]}${startParam}`
        };
    }

    // SPOTIFY
    // Regex for: open.spotify.com/track/ID, open.spotify.com/playlist/ID
    const spRegex = /open\.spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/i;
    const spMatch = url.match(spRegex);
    if (spMatch && spMatch[2]) {
        return {
            type: 'spotify',
            // Spotify embed URL
            src: `https://open.spotify.com/embed/${spMatch[1]}/${spMatch[2]}?utm_source=generator`
        };
    }

    return null; // Not supported or invalid
};

/**
 * Compresses an image file and converts it to WebP format.
 * 
 * @param {File} file - The original image file
 * @param {number} maxWidth - Maximum width (maintains aspect ratio)
 * @param {number} quality - WebP quality (0 to 1)
 * @returns {Promise<File>} - Resolves with the new WebP File
 */
export const compressImageToWebP = (file, maxWidth = 1080, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error("No file provided"));

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFilename = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                        const newFile = new File([blob], newFilename, {
                            type: 'image/webp',
                            lastModified: Date.now()
                        });
                        resolve(newFile);
                    } else {
                        reject(new Error("Failed to create WebP blob"));
                    }
                }, 'image/webp', quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
