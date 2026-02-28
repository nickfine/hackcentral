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

export function getSupabaseClient() {
  // Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase credentials not configured. ' +
      'Run: forge variables set SUPABASE_URL <url> && ' +
      'forge variables set --encrypt SUPABASE_SERVICE_ROLE_KEY <key>'
    );
  }
  if (!supabaseServiceRoleKey) {
    console.warn('[Supabase] SUPABASE_SERVICE_ROLE_KEY missing; falling back to SUPABASE_ANON_KEY for compatibility.');
  }

  // Create Supabase client with custom fetch using Forge's api.fetch
  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    global: {
      fetch: async (url, options = {}) => {
        try {
          // Prepare headers - Supabase requires both apikey and Authorization headers
          const headers = { ...(options.headers || {}) };
          
          // Ensure both headers are present for Supabase REST API
          if (!headers['apikey']) {
            headers['apikey'] = supabaseKey;
          }
          if (!headers['Authorization']) {
            headers['Authorization'] = `Bearer ${supabaseKey}`;
          }
          
          // Prepare body - handle both string and object
          let body = options.body;
          if (body) {
            if (!headers['Content-Type']) {
              headers['Content-Type'] = 'application/json';
            }
            if (body != null && typeof body === 'object') {
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

          // Read response as text (consumes the body)
          let text = '';
          try {
            text = await response.text();
          } catch (e) {
            text = '';
          }
          
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
          
          // Create Response-like object for Supabase client
          const responseHeaders = new Map();
          responseHeaders.set('content-type', 'application/json');
          
          return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText || (response.ok ? 'OK' : 'Error'),
            headers: {
              get: (name) => responseHeaders.get(name.toLowerCase()),
            },
            json: async () => data,
            text: async () => text,
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
