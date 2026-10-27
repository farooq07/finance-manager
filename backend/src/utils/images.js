// Images arrive inside JSON as data URIs (gold photos, feedback screenshots).
// Only small PNG / JPEG / WebP images, or an https link, are accepted.

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const DATA_URI = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/;

/** Problem with an image field, or null when it is acceptable (empty is fine). */
export function imageProblem(value, { maxBytes = MAX_IMAGE_BYTES } = {}) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string') return 'Image must be a PNG, JPEG or WebP picture';
    if (/^https:\/\/\S+$/i.test(value)) return null;
    const m = DATA_URI.exec(value);
    if (!m) return 'Image must be a PNG, JPEG or WebP picture';
    const base64 = m[2].replace(/\s/g, '');
    const bytes = Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
    if (bytes > maxBytes) return `Image is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB)`;
    return null;
}
