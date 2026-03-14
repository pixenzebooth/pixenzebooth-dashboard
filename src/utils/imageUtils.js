export const captureVideoFrame = (videoElement, filter = 'none') => {
    if (!videoElement) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');

    // Apply filter
    if (filter !== 'none') {
        ctx.filter = getFilterCss(filter);
    }

    // Flip horizontally if video is mirrored
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(videoElement, 0, 0);
    return canvas.toDataURL('image/png');
};

const getFilterCss = (filterName) => {
    switch (filterName) {
        case 'bright': return 'brightness(1.2) contrast(1.1)';
        case 'vintage': return 'sepia(0.4) contrast(1.2)';
        case 'bw': return 'grayscale(1)';
        case 'soft': return 'contrast(0.9) brightness(1.1) blur(0.5px)';
        default: return 'none';
    }
};


export const createStrip = async (photos, configOrTheme = 'pink') => {
    // Determine if we got a simple theme string or a full config object
    const theme = typeof configOrTheme === 'object' ? (configOrTheme.theme || 'pink') : configOrTheme;
    const frameImage = typeof configOrTheme === 'object' ? configOrTheme.frameImage : null;

    // Load Frame Overlay FIRST if it exists to set canvas dimensions
    let overlay = null;
    let canvasWidth = 400;
    let canvasHeight = 0; // Will be calculated

    if (frameImage) {
        overlay = new Image();
        overlay.crossOrigin = "Anonymous";
        overlay.src = frameImage;
        await new Promise(resolve => overlay.onload = resolve);

        canvasWidth = overlay.width;
        canvasHeight = overlay.height;
    } else {
        // Standard Dimensions for default themes
        const photoHeight = 300;
        const padding = 20;
        const headerHeight = 80;
        const footerHeight = 60;
        canvasHeight = headerHeight + (photos.length * photoHeight) + ((photos.length - 1) * padding) + footerHeight + (padding * 2);
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // Background Colors
    const colors = {
        pink: '#FF99C8',
        blue: '#A9DEF9',
        yellow: '#FCF6BD',
        purple: '#E4C1F9',
        mario: '#6BB5FF',
        red: '#E52521',
        green: '#43B047',
        custom: '#ffffff'
    };
    ctx.fillStyle = colors[theme] || colors['pink'];
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // If using default theme, draw branding
    if (!overlay) {
        ctx.fillStyle = '#333';
        ctx.font = 'bold 32px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PixenzeBooth', canvasWidth / 2, 55);
    }

    // Draw Photos
    // Logic: If overlay exists, try to distribute photos evenly in the center
    // If default, stack with standard padding

    // --- Specific Layout Configurations for Official Frames ---
    const frameLayouts = {
        'perunggu': {
            topMargin: 0.100,   // Adjusted: starts slightly lower
            bottomLimit: 0.71,   // Adjusted: ends higher to avoid band photo
            sideMargin: 0.0,    // Adjusted: narrower photos
            gapRatio: 0.015,     // Tighter vertical gap
        },
        'the1975': {
            topMargin: 0.15,
            bottomLimit: 0.85,
            sideMargin: 0.15,
            gapRatio: 0.04,
        }
        // Add more official frame configs here
    };

    let layout = null;
    if (frameImage) {
        if (frameImage.toLowerCase().includes('perunggu')) layout = frameLayouts['perunggu'];
        else if (frameImage.toLowerCase().includes('the1975')) layout = frameLayouts['the1975'];
    }

    // Default standard metrics
    let photoW = canvasWidth - 40; // 20px padding each side
    let photoH = 300;
    let startY = 80 + 20; // Header + padding
    let gap = 20;

    if (overlay) {
        // "Smart" Layout 

        // 1. Determine safe area for photos
        let topM, bottomL, sideM, layoutGap;

        if (layout) {
            // Use specific tuned values (legacy hardcoded)
            topM = canvasHeight * layout.topMargin;
            bottomL = canvasHeight * layout.bottomLimit;
            sideM = canvasWidth * layout.sideMargin;
            layoutGap = layout.gapRatio;
        } else if (configOrTheme.layout_config && configOrTheme.layout_config.length > 0) {
            // NEW: Dynamic Layout Config from Supabase
            // This logic needs to override the loop below completely if we want per-slot customization.
            // But for now, let's map it to the "smart layout" variables if it's a simple calculated layout, OR return early with a custom loop.

            // Actually, if we have explicit slots, we should just iterate through slots and ignore the standard loop.
            // Let's split logic here.
            return createCustomLayoutStrip(ctx, photos, configOrTheme.layout_config, canvasWidth, canvasHeight, overlay);
        } else {
            // Generic Fallback for user uploads
            topM = canvasHeight * 0.15;
            bottomL = canvasHeight * 0.85;
            sideM = canvasWidth * 0.05;
            layoutGap = 0.04;
        }

        const availableHeight = bottomL - topM;
        const availableWidth = canvasWidth - (sideM * 2);

        // 2. Calculate measurements
        const photoCount = photos.length;
        // Make sure we don't divide by zero if 0 photos (unlikely)
        const ONE_PHOTO_H = availableHeight / (photoCount + (photoCount > 1 ? (photoCount - 1) * layoutGap : 0));

        // Width is determined by the available width
        // BUT we should respect aspect ratio if possible, or crop center.
        // For strips, usually we fix width and height to fill the slot.
        photoW = availableWidth;
        photoH = ONE_PHOTO_H;

        gap = photoH * layoutGap;
        startY = topM;

    } else {
        // ... (Standard default logic remains same as initialized variables)
    }

    for (let i = 0; i < photos.length; i++) {
        const img = new Image();
        img.src = photos[i];
        await new Promise(resolve => img.onload = resolve);

        const x = (canvasWidth - photoW) / 2;
        const y = startY + i * (photoH + gap);

        // --- Aspect Ratio Crop (Object-Fit: Cover) ---
        const imgRatio = img.width / img.height;
        const targetRatio = photoW / photoH;
        let sx, sy, sw, sh;

        if (imgRatio > targetRatio) {
            sh = img.height;
            sw = sh * targetRatio;
            sx = (img.width - sw) / 2;
            sy = 0;
        } else {
            sw = img.width;
            sh = sw / targetRatio;
            sx = 0;
            sy = (img.height - sh) / 2;
        }

        // DRAW WITH BLEED: Draw slightly larger than calculated to ensure no white gaps
        if (overlay) {
            ctx.drawImage(img, sx, sy, sw, sh, x - 2, y - 2, photoW + 4, photoH + 4);
        } else {
            // White border for default theme
            ctx.fillStyle = 'white';
            ctx.fillRect(x - 5, y - 5, photoW + 10, photoH + 10);
            ctx.drawImage(img, sx, sy, sw, sh, x, y, photoW, photoH);
        }
    }

    // Draw Overlay Frame (Top Layer)
    if (overlay) {
        ctx.drawImage(overlay, 0, 0, canvasWidth, canvasHeight);
    } else {
        // Footer Date for default only
        ctx.font = '16px "Outfit", sans-serif';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.fillText(new Date().toLocaleDateString(), canvasWidth / 2, canvasHeight - 25);
    }

    return canvas.toDataURL('image/png');
};

// Helper for drawing custom slots defined by admin editor
const createCustomLayoutStrip = async (ctx, photos, slots, canvasWidth, canvasHeight, overlay) => {
    for (let i = 0; i < Math.min(photos.length, slots.length); i++) {
        const slot = slots[i];
        const img = new Image();
        img.src = photos[i];
        await new Promise(resolve => img.onload = resolve);

        const x = (slot.x / 100) * canvasWidth;
        const y = (slot.y / 100) * canvasHeight;
        const w = (slot.width / 100) * canvasWidth;
        const h = (slot.height / 100) * canvasHeight;

        const imgRatio = img.width / img.height;
        const targetRatio = w / h;
        let sx, sy, sw, sh;

        if (imgRatio > targetRatio) {
            sh = img.height;
            sw = sh * targetRatio;
            sx = (img.width - sw) / 2;
            sy = 0;
        } else {
            sw = img.width;
            sh = sw / targetRatio;
            sx = 0;
            sy = (img.height - sh) / 2;
        }

        ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    }

    if (overlay) {
        ctx.drawImage(overlay, 0, 0, canvasWidth, canvasHeight);
    }

    return ctx.canvas.toDataURL('image/png');
};
