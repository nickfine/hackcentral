export const HERO_IMAGE_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const HERO_IMAGE_MAX_FILE_SIZE_BYTES = 2_000_000;
export const HERO_IMAGE_MIN_WIDTH = 1200;
export const HERO_IMAGE_MIN_HEIGHT = 400;
export const HERO_IMAGE_MAX_WIDTH = 1600;

const COMPRESSION_PROFILES = [
  { scale: 1, webpQuality: 0.82, jpegQuality: 0.85 },
  { scale: 0.92, webpQuality: 0.74, jpegQuality: 0.78 },
  { scale: 0.84, webpQuality: 0.66, jpegQuality: 0.7 },
];

function assertFileTypeAndSize(file) {
  if (!file) throw new Error('No file selected.');
  if (!HERO_IMAGE_ALLOWED_TYPES.has(file.type)) {
    throw new Error('Unsupported file type. Use JPG, PNG, or WebP.');
  }
  if (file.size > HERO_IMAGE_MAX_FILE_SIZE_BYTES) {
    throw new Error('File too large. Max size is 2 MB.');
  }
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image file.'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

async function normalizeHeroImage(file) {
  assertFileTypeAndSize(file);
  const image = await loadImageFromFile(file);

  if (image.naturalWidth < HERO_IMAGE_MIN_WIDTH || image.naturalHeight < HERO_IMAGE_MIN_HEIGHT) {
    throw new Error(`Image resolution too small. Minimum is ${HERO_IMAGE_MIN_WIDTH}x${HERO_IMAGE_MIN_HEIGHT}.`);
  }

  const baseScale = Math.min(1, HERO_IMAGE_MAX_WIDTH / image.naturalWidth);

  for (const profile of COMPRESSION_PROFILES) {
    const targetWidth = Math.max(1, Math.round(image.naturalWidth * baseScale * profile.scale));
    const targetHeight = Math.max(1, Math.round(image.naturalHeight * (targetWidth / image.naturalWidth)));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Browser does not support canvas image processing.');
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const webpBlob = await canvasToBlob(canvas, 'image/webp', profile.webpQuality);
    if (webpBlob && webpBlob.size <= HERO_IMAGE_MAX_FILE_SIZE_BYTES) {
      return { blob: webpBlob, contentType: 'image/webp', width: targetWidth, height: targetHeight };
    }

    const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', profile.jpegQuality);
    if (jpegBlob && jpegBlob.size <= HERO_IMAGE_MAX_FILE_SIZE_BYTES) {
      return { blob: jpegBlob, contentType: 'image/jpeg', width: targetWidth, height: targetHeight };
    }
  }

  throw new Error('Image is too large after compression. Try a smaller image.');
}

async function uploadToSignedUrl(signedUploadUrl, blob, contentType) {
  const response = await fetch(signedUploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: blob,
  });

  if (!response.ok) {
    throw new Error(`Image upload failed (${response.status}).`);
  }
}

export async function uploadHeroImageInline({ file, invokeResolver }) {
  if (typeof invokeResolver !== 'function') {
    throw new Error('Upload resolver is unavailable.');
  }

  const normalized = await normalizeHeroImage(file);

  const uploadTarget = await invokeResolver('createEventBrandingImageUploadUrl', {
    fileName: file?.name || 'hero-image',
    contentType: normalized.contentType,
    fileSizeBytes: normalized.blob.size,
    imageWidth: normalized.width,
    imageHeight: normalized.height,
  });

  const signedUploadUrl = uploadTarget?.signedUploadUrl;
  const publicUrl = uploadTarget?.publicUrl;

  if (!signedUploadUrl || !publicUrl) {
    throw new Error('Upload URL generation failed.');
  }

  await uploadToSignedUrl(signedUploadUrl, normalized.blob, normalized.contentType);

  return {
    publicUrl,
    contentType: normalized.contentType,
    fileSizeBytes: normalized.blob.size,
    width: normalized.width,
    height: normalized.height,
  };
}
