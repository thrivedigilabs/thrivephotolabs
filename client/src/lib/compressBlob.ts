/**
 * Check WebP support once
 */
const supportsWebP = (): boolean => {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
};

export const WEBP_SUPPORTED = supportsWebP();

/**
 * Compresses an image to WebP format with quality preservation as the priority.
 * 
 * Philosophy:
 * - We WANT files between 300KB–500KB for best quality/size balance
 * - We do NOT aggressively compress — quality is the priority
 * - Only reduce quality if file exceeds 500KB (512000 bytes)
 * - Start at quality 0.92 (very high quality)
 * - Reduce by 0.03 per step (very gentle reduction)
 * - Stop at 0.60 minimum — never go lower (visible degradation below this)
 * - If at 0.60 the file is still >500KB, KEEP IT as-is (quality wins over size)
 * - If file is already <500KB at 0.92, return immediately (no reduction needed)
 */

export async function compressBlob(
    file: File,
    targetWidth = 1000,
    targetHeight = 1000,
    bgColor = '#FFFFFF'
): Promise<{ blob: Blob; finalWidth: number; finalHeight: number }> {

    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = async () => {
            URL.revokeObjectURL(objectUrl);

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d')!;

            // Fill background
            if (bgColor === 'transparent') {
                ctx.clearRect(0, 0, targetWidth, targetHeight);
            } else {
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, targetWidth, targetHeight);
            }

            // Calculate 'contain' fit — preserve aspect ratio, center image
            const imgAspect = img.naturalWidth / img.naturalHeight;
            const canvasAspect = targetWidth / targetHeight;

            let drawWidth: number;
            let drawHeight: number;

            if (imgAspect > canvasAspect) {
                // Image is wider — fit by width
                drawWidth = targetWidth;
                drawHeight = targetWidth / imgAspect;
            } else {
                // Image is taller — fit by height
                drawHeight = targetHeight;
                drawWidth = targetHeight * imgAspect;
            }

            const offsetX = (targetWidth - drawWidth) / 2;
            const offsetY = (targetHeight - drawHeight) / 2;

            // Draw with high quality settings
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

            // Start compression loop
            const MAX_SIZE = 512000; // 500KB in bytes
            const MIN_QUALITY = 0.60;
            let quality = 0.92;

            const tryCompress = (q: number): Promise<Blob> => {
                return new Promise((res, rej) => {
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                // Verify MIME type
                                if (blob.type !== 'image/webp') {
                                    console.warn('Browser returned', blob.type, 'instead of image/webp');
                                }
                                res(blob);
                            }
                            else rej(new Error('Canvas toBlob failed'));
                        },
                        'image/webp',
                        q
                    );
                });
            };

            try {
                let blob = await tryCompress(quality);

                // If already under 500KB at high quality — perfect, return immediately
                if (blob.size <= MAX_SIZE) {
                    resolve({ blob, finalWidth: targetWidth, finalHeight: targetHeight });
                    return;
                }

                // File is too large — gently reduce quality
                while (blob.size > MAX_SIZE && quality > MIN_QUALITY) {
                    quality = Math.round((quality - 0.03) * 100) / 100;

                    // Don't go below minimum
                    if (quality < MIN_QUALITY) {
                        quality = MIN_QUALITY;
                        blob = await tryCompress(quality);
                        break; // Stop here regardless of size — quality floor reached
                    }

                    blob = await tryCompress(quality);
                }

                // Return whatever we have — quality is preserved at floor
                resolve({ blob, finalWidth: targetWidth, finalHeight: targetHeight });

            } catch (err) {
                reject(err);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Failed to load image: ${file.name}`));
        };

        img.src = objectUrl;
    });
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
