import { createClient } from '@supabase/supabase-js';
import api from '@forge/api';

/**
 * Get Supabase client for Forge backend
 * 
 * Environment Variables (set via `forge variables set`):
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service-role key (set with --encrypt)
 * - DEBUG_SUPABASE: Set to 'true' to enable verbose logging
 * 
 * For local development with `forge tunnel`:
 * - Export vars with FORGE_USER_VAR_ prefix:
 *   export FORGE_USER_VAR_SUPABASE_URL=https://xxx.supabase.co
 *   export FORGE_USER_VAR_SUPABASE_SERVICE_ROLE_KEY=your-key
 */

// Singleton instance to prevent creating new clients on every resolver call
let supabaseInstance = null;

function normalizeHeaders(headersInit) {
  if (!headersInit) return {};
  if (typeof headersInit.forEach === 'function') {
    const next = {};
    headersInit.forEach((value, key) => {
      next[key] = value;
    });
    return next;
  }
  if (Array.isArray(headersInit)) {
    return Object.fromEntries(headersInit);
  }
  return { ...headersInit };
}

function hasHeader(headers, name) {
  const target = String(name || '').toLowerCase();
  return Object.keys(headers || {}).some((key) => key.toLowerCase() === target);
}

function getHeader(headers, name) {
  const target = String(name || '').toLowerCase();
  const entry = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === target);
  return entry ? entry[1] : undefined;
}

function isBinaryLikeBody(body) {
  if (!body) return false;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(body)) return true;
  if (body instanceof ArrayBuffer) return true;
  if (ArrayBuffer.isView(body)) return true;
  if (typeof Blob !== 'undefined' && body instanceof Blob) return true;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return true;
  return false;
}

export function getSupabaseClient() {
  // Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseKey = supabaseServiceRoleKey;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Supabase credentials not configured. ' +
      'Run: forge variables set SUPABASE_URL <url> && ' +
      'forge variables set --encrypt SUPABASE_SERVICE_ROLE_KEY <key>'
    );
  }

  // Create Supabase client with custom fetch using Forge's api.fetch
  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    global: {
      fetch: async (url, options = {}) => {
        try {
          // Prepare headers - Supabase requires both apikey and Authorization headers
          const headers = normalizeHeaders(options.headers);
          
          // Ensure both headers are present for Supabase REST API
          if (!hasHeader(headers, 'apikey')) {
            headers['apikey'] = supabaseKey;
          }
          if (!hasHeader(headers, 'Authorization')) {
            headers['Authorization'] = `Bearer ${supabaseKey}`;
          }
          
          // Prepare body - handle both string and object
          let body = options.body;
          if (body) {
            const isBinaryBody = isBinaryLikeBody(body);
            if (!hasHeader(headers, 'Content-Type') && !isBinaryBody && typeof body !== 'string') {
              headers['Content-Type'] = 'application/json';
            }
            if (!isBinaryBody && body != null && typeof body === 'object') {
              body = JSON.stringify(body);
            }
          }
          
          // Debug logging (set DEBUG_SUPABASE=true to enable)
          const debug = process.env.DEBUG_SUPABASE === 'true';
          if (debug) {
            console.log(`[Supabase] ${options.method || 'GET'} ${url}`);
          }
          
          // Use Forge's api.fetch for external requests
          const response = await api.fetch(url, {
            method: options.method || 'GET',
            headers,
            body,
          });

          if (debug) {
            console.log(`[Supabase] Response: ${response.status}`);
          }

          // Eagerly buffer the body so callers can consume it as json/text/blob/arrayBuffer.
          let bytes = Buffer.alloc(0);
          try {
            const arrayBuffer = await response.arrayBuffer();
            bytes = Buffer.from(arrayBuffer);
          } catch (e) {
            bytes = Buffer.alloc(0);
          }
          const text = bytes.toString('utf8');
          
          // Log errors
          if (!response.ok) {
            console.warn(`[Supabase] Error ${response.status}: ${text.substring(0, 200)}`);
          }

          // Parse as JSON
          let data;
          try {
            data = JSON.parse(text);
          } catch (jsonError) {
            data = { error: text, message: `Error: ${response.status} ${response.statusText || 'Error'}` };
          }
          
          const contentTypeHeader =
            response.headers?.get?.('content-type') ||
            getHeader(headers, 'Content-Type') ||
            (text.trim().startsWith('{') || text.trim().startsWith('[')
              ? 'application/json'
              : 'application/octet-stream');

          // Create Response-like object for Supabase client
          const responseHeaders = new Map();
          responseHeaders.set('content-type', contentTypeHeader);
          
          return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText || (response.ok ? 'OK' : 'Error'),
            headers: {
              get: (name) => responseHeaders.get(name.toLowerCase()),
            },
            json: async () => data,
            text: async () => text,
            arrayBuffer: async () =>
              bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
            blob: async () =>
              new Blob([bytes], {
                type: contentTypeHeader,
              }),
          };
        } catch (error) {
          console.error('[Supabase] Fetch error:', error.message);
          throw error;
        }
      },
    },
  });

  return supabaseInstance;
}
