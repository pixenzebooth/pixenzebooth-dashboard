const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GITHUB_OWNER = import.meta.env.VITE_GITHUB_OWNER;
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO;
const GITHUB_BRANCH = import.meta.env.VITE_GITHUB_BRANCH || 'main';

// Helper untuk mengubah File/Blob menjadi Base64 (Syarat wajib GitHub API)
const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        let encoded = reader.result.toString().replace(/^data:(.*,)?/, '');
        if ((encoded.length % 4) > 0) {
            encoded += '='.repeat(4 - (encoded.length % 4));
        }
        resolve(encoded);
    };
    reader.onerror = error => reject(error);
});

/**
 * Mengunggah file langsung ke GitHub Repository dan mengembalikan link jsDelivr CDN
 */
export const uploadToGitHub = async (file, folder = 'uploads') => {
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
        throw new Error("Kredensial GitHub (Token/Owner/Repo) belum diatur di .env");
    }

    // Bersihkan nama file agar aman untuk URL
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    const path = `${folder}/${fileName}`;
    const base64Content = await toBase64(file);

    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: `Auto-upload: ${fileName} via Admin Panel`,
            content: base64Content,
            branch: GITHUB_BRANCH
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Gagal Upload ke GitHub: ${err.message}`);
    }

    // Kembalikan URL jsDelivr CDN yang super ngebut & gratis
    return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${path}`;
};
