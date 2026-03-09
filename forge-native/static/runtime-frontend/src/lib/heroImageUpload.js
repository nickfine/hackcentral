export const HERO_IMAGE_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const HERO_IMAGE_MAX_FILE_SIZE_BYTES = 2_000_000;
export const HERO_BANNER_MAX_WIDTH = 1200;
export const HERO_BANNER_REQUIRED_HEIGHT = 400;
export const HERO_ICON_REQUIRED_SIZE = 400;

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

  const baseScale = HERO_BANNER_REQUIRED_HEIGHT / Math.max(1, image.naturalHeight);
  const scaledWidthAtRequiredHeight = Math.max(1, Math.round(image.naturalWidth * baseScale));
  const targetWidthBase = Math.min(HERO_BANNER_MAX_WIDTH, scaledWidthAtRequiredHeight);
  const targetHeightBase = HERO_BANNER_REQUIRED_HEIGHT;

  const cropSourceForMaxWidth = scaledWidthAtRequiredHeight > HERO_BANNER_MAX_WIDTH;
  const targetAspectRatio = targetWidthBase / targetHeightBase;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  if (cropSourceForMaxWidth) {
    const targetSourceWidth = Math.max(1, Math.round(image.naturalHeight * targetAspectRatio));
    sourceWidth = Math.min(image.naturalWidth, targetSourceWidth);
    sourceX = Math.max(0, Math.round((image.naturalWidth - sourceWidth) / 2));
  }

  for (const profile of COMPRESSION_PROFILES) {
    const widthScale = cropSourceForMaxWidth ? 1 : profile.scale;
    const targetWidth = Math.max(1, Math.round(targetWidthBase * widthScale));
    const targetHeight = targetHeightBase;
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Browser does not support canvas image processing.');
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );

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

async function normalizeHeroIcon(file) {
  assertFileTypeAndSize(file);
  const image = await loadImageFromFile(file);
  const targetSize = HERO_ICON_REQUIRED_SIZE;
  const scale = Math.min(targetSize / Math.max(1, image.naturalWidth), targetSize / Math.max(1, image.naturalHeight));
  const drawWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const drawHeight = Math.max(1, Math.round(image.naturalHeight * scale));
  const offsetX = Math.max(0, Math.round((targetSize - drawWidth) / 2));
  const offsetY = Math.max(0, Math.round((targetSize - drawHeight) / 2));

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Browser does not support canvas image processing.');
  context.clearRect(0, 0, targetSize, targetSize);
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const webpBlob = await canvasToBlob(canvas, 'image/webp', 0.9);
  if (webpBlob && webpBlob.size <= HERO_IMAGE_MAX_FILE_SIZE_BYTES) {
    return { blob: webpBlob, contentType: 'image/webp', width: targetSize, height: targetSize };
  }

  const pngBlob = await canvasToBlob(canvas, 'image/png');
  if (pngBlob && pngBlob.size <= HERO_IMAGE_MAX_FILE_SIZE_BYTES) {
    return { blob: pngBlob, contentType: 'image/png', width: targetSize, height: targetSize };
  }

  const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', 0.88);
  if (jpegBlob && jpegBlob.size <= HERO_IMAGE_MAX_FILE_SIZE_BYTES) {
    return { blob: jpegBlob, contentType: 'image/jpeg', width: targetSize, height: targetSize };
  }

  throw new Error('Icon image is too large after compression. Try a simpler image.');
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

export async function uploadHeroImageInline({ file, invokeResolver, assetKind = 'banner' }) {
  if (typeof invokeResolver !== 'function') {
    throw new Error('Upload resolver is unavailable.');
  }

  if (!['banner', 'icon'].includes(assetKind)) {
    throw new Error('assetKind must be banner or icon.');
  }

  const normalized = assetKind === 'icon'
    ? await normalizeHeroIcon(file)
    : await normalizeHeroImage(file);

  const uploadTarget = await invokeResolver('createEventBrandingImageUploadUrl', {
    assetKind,
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
