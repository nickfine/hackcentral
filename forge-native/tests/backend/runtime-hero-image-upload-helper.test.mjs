import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const helperModulePath = path.resolve(__dirname, '../../static/runtime-frontend/src/lib/heroImageUpload.js');
const adminPanelPath = path.resolve(__dirname, '../../static/runtime-frontend/src/components/AdminPanel.jsx');

const { uploadHeroImageInline, HERO_IMAGE_MAX_FILE_SIZE_BYTES } = await import(pathToFileURL(helperModulePath).href);

function makeBlob(size, type) {
  return new Blob([Buffer.alloc(Math.max(0, size))], { type });
}

async function withMockedBrowserEnv(
  {
    width = 1600,
    height = 900,
    webpBlobSize = 512_000,
    jpegBlobSize = 700_000,
    fetchOk = true,
    fetchStatus = 200,
  },
  run
) {
  const originalUrl = globalThis.URL;
  const originalImage = globalThis.Image;
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;

  const fetchCalls = [];
  const createdCanvasSizes = [];

  try {
    globalThis.URL = {
      createObjectURL() {
        return 'blob:mock-hero-image';
      },
      revokeObjectURL() {},
    };

    globalThis.Image = class MockImage {
      constructor() {
        this.naturalWidth = width;
        this.naturalHeight = height;
      }

      set src(_value) {
        queueMicrotask(() => {
          if (typeof this.onload === 'function') this.onload();
        });
      }
    };

    globalThis.document = {
      createElement(tagName) {
        if (tagName !== 'canvas') {
          throw new Error(`Unexpected element requested: ${tagName}`);
        }

        let canvasWidth = 0;
        let canvasHeight = 0;
        const canvas = {
          get width() {
            return canvasWidth;
          },
          set width(value) {
            canvasWidth = value;
          },
          get height() {
            return canvasHeight;
          },
          set height(value) {
            canvasHeight = value;
          },
          getContext() {
            return {
              drawImage() {},
            };
          },
          toBlob(callback, mimeType) {
            const blobSize = mimeType === 'image/webp' ? webpBlobSize : jpegBlobSize;
            const blob = blobSize == null ? null : makeBlob(blobSize, mimeType);
            createdCanvasSizes.push({ width: canvasWidth, height: canvasHeight, mimeType });
            queueMicrotask(() => callback(blob));
          },
        };
        return canvas;
      },
    };

    globalThis.fetch = async (url, init) => {
      fetchCalls.push({ url, init });
      return {
        ok: fetchOk,
        status: fetchStatus,
      };
    };

    await run({ fetchCalls, createdCanvasSizes });
  } finally {
    globalThis.URL = originalUrl;
    globalThis.Image = originalImage;
    globalThis.document = originalDocument;
    globalThis.fetch = originalFetch;
  }
}

test('runtime hero helper rejects unsupported file type and oversized files', async () => {
  await assert.rejects(
    uploadHeroImageInline({
      file: { name: 'hero.gif', type: 'image/gif', size: 150_000 },
      invokeResolver: async () => ({}),
    }),
    /Unsupported file type/
  );

  await assert.rejects(
    uploadHeroImageInline({
      file: { name: 'hero.png', type: 'image/png', size: HERO_IMAGE_MAX_FILE_SIZE_BYTES + 1 },
      invokeResolver: async () => ({}),
    }),
    /File too large/
  );
});

test('runtime hero helper accepts smaller source images and normalizes height to 400px', async () => {
  const resolverCalls = [];

  await withMockedBrowserEnv(
    {
      width: 300,
      height: 300,
      webpBlobSize: 150_000,
      jpegBlobSize: 200_000,
    },
    async ({ createdCanvasSizes }) => {
      const result = await uploadHeroImageInline({
        file: { name: 'small.png', type: 'image/png', size: 180_000 },
        invokeResolver: async (name, payload) => {
          resolverCalls.push({ name, payload });
          return {
            signedUploadUrl: 'https://signed-upload.example.com/upload',
            publicUrl: 'https://public.example.com/events/123/hero-small.webp',
          };
        },
      });

      assert.equal(result.width, 400);
      assert.equal(result.height, 400);
      assert.equal(resolverCalls.length, 1);
      assert.equal(resolverCalls[0].payload.imageWidth, 400);
      assert.equal(resolverCalls[0].payload.imageHeight, 400);
      assert.equal(createdCanvasSizes[0].width, 400);
      assert.equal(createdCanvasSizes[0].height, 400);
    }
  );
});

test('runtime hero helper normalizes dimensions, uploads via signed URL, and returns public URL', async () => {
  const resolverCalls = [];

  await withMockedBrowserEnv(
    {
      width: 3200,
      height: 1600,
      webpBlobSize: 1_050_000,
      jpegBlobSize: 1_400_000,
    },
    async ({ fetchCalls, createdCanvasSizes }) => {
      const result = await uploadHeroImageInline({
        file: { name: 'hero-source.png', type: 'image/png', size: 1_500_000 },
        invokeResolver: async (name, payload) => {
          resolverCalls.push({ name, payload });
          return {
            signedUploadUrl: 'https://signed-upload.example.com/upload',
            publicUrl: 'https://public.example.com/events/123/hero.webp',
          };
        },
      });

      assert.equal(result.publicUrl, 'https://public.example.com/events/123/hero.webp');
      assert.equal(result.contentType, 'image/webp');
      assert.equal(result.width, 800);
      assert.equal(result.height, 400);
      assert.equal(resolverCalls.length, 1);
      assert.equal(resolverCalls[0].name, 'createEventBrandingImageUploadUrl');
      assert.equal(resolverCalls[0].payload.contentType, 'image/webp');
      assert.equal(resolverCalls[0].payload.imageWidth, 800);
      assert.equal(resolverCalls[0].payload.imageHeight, 400);
      assert.equal(resolverCalls[0].payload.fileName, 'hero-source.png');
      assert.ok(resolverCalls[0].payload.fileSizeBytes <= HERO_IMAGE_MAX_FILE_SIZE_BYTES);

      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://signed-upload.example.com/upload');
      assert.equal(fetchCalls[0].init.method, 'PUT');
      assert.equal(fetchCalls[0].init.headers['Content-Type'], 'image/webp');
      assert.equal(fetchCalls[0].init.body.type, 'image/webp');
      assert.equal(fetchCalls[0].init.body.size, 1_050_000);

      assert.ok(createdCanvasSizes.length >= 1);
      assert.equal(createdCanvasSizes[0].width, 800);
      assert.equal(createdCanvasSizes[0].height, 400);
    }
  );
});

test('runtime hero helper crops very wide images to max 1200x400', async () => {
  const resolverCalls = [];

  await withMockedBrowserEnv(
    {
      width: 5000,
      height: 1000,
      webpBlobSize: 900_000,
      jpegBlobSize: 1_000_000,
    },
    async ({ createdCanvasSizes }) => {
      const result = await uploadHeroImageInline({
        file: { name: 'wide.png', type: 'image/png', size: 1_200_000 },
        invokeResolver: async (name, payload) => {
          resolverCalls.push({ name, payload });
          return {
            signedUploadUrl: 'https://signed-upload.example.com/upload',
            publicUrl: 'https://public.example.com/events/123/hero-wide.webp',
          };
        },
      });

      assert.equal(result.width, 1200);
      assert.equal(result.height, 400);
      assert.equal(resolverCalls[0].payload.imageWidth, 1200);
      assert.equal(resolverCalls[0].payload.imageHeight, 400);
      assert.equal(createdCanvasSizes[0].width, 1200);
      assert.equal(createdCanvasSizes[0].height, 400);
    }
  );
});

test('runtime admin branding save persists uploaded hero asset URLs into config-mode draft fields', async () => {
  const source = await fs.readFile(adminPanelPath, 'utf8');
  assert.match(source, /configMode\.setFieldValue\('branding\.bannerImageUrl',\s*bannerImageUrl\)/);
  assert.match(source, /configMode\.setFieldValue\('branding\.heroIconImageUrl',\s*heroIconImageUrl\)/);
});
