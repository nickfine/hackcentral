interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
  schema: string;
}

interface SupabaseErrorPayload {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message?: string;
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface QueryFilter {
  field: string;
  op: 'eq' | 'neq' | 'ilike' | 'is';
  value: string | number | boolean | null;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required Forge variable: ${name}`);
  }
  return value;
}

export function getSupabaseConfig(): SupabaseConfig {
  return {
    url: getRequiredEnv('SUPABASE_URL').replace(/\/$/, ''),
    serviceRoleKey: getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    schema: process.env.SUPABASE_SCHEMA || 'public',
  };
}

function encodeFilterValue(value: QueryFilter['value']): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function buildSearchParams(select: string, filters: QueryFilter[]): URLSearchParams {
  const params = new URLSearchParams();
  params.set('select', select);
  for (const filter of filters) {
    params.set(filter.field, `${filter.op}.${encodeFilterValue(filter.value)}`);
  }
  return params;
}

export class SupabaseRestClient {
  private readonly config: SupabaseConfig;

  constructor(config = getSupabaseConfig()) {
    this.config = config;
  }

  get deploymentUrl(): string {
    return this.config.url;
  }

  get schema(): string {
    return this.config.schema;
  }

  private headers(method: HttpMethod, prefer?: string): Record<string, string> {
    const headers: Record<string, string> = {
      apikey: this.config.serviceRoleKey,
      Authorization: `Bearer ${this.config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Content-Profile': this.config.schema,
      'Accept-Profile': this.config.schema,
    };

    if (prefer && method !== 'GET') {
      headers.Prefer = prefer;
    }

    return headers;
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    options?: {
      body?: unknown;
      searchParams?: URLSearchParams;
      prefer?: string;
    }
  ): Promise<T> {
    const query = options?.searchParams ? `?${options.searchParams.toString()}` : '';
    const response = await fetch(`${this.config.url}/rest/v1/${path}${query}`, {
      method,
      headers: this.headers(method, options?.prefer),
      body: options?.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const raw = await response.text();
    let parsed: unknown = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        parsed = null;
      }
    }

    if (!response.ok) {
      const supabaseError =
        parsed && typeof parsed === 'object' ? (parsed as SupabaseErrorPayload) : null;
      if (
        response.status === 403 &&
        supabaseError?.code === '42501' &&
        (supabaseError.message || '').toLowerCase().includes('permission denied for schema public')
      ) {
        throw new Error(
          `Supabase permission error for schema "${this.config.schema}". Check SUPABASE_SERVICE_ROLE_KEY and schema grants for service_role.`
        );
      }
      const reason = parsed && typeof parsed === 'object' ? JSON.stringify(parsed) : raw;
      throw new Error(`Supabase ${method} ${path} failed (${response.status}): ${reason}`);
    }

    return parsed as T;
  }

  async selectMany<T>(table: string, select: string, filters: QueryFilter[] = []): Promise<T[]> {
    return this.request<T[]>('GET', table, {
      searchParams: buildSearchParams(select, filters),
    });
  }

  async selectOne<T>(table: string, select: string, filters: QueryFilter[] = []): Promise<T | null> {
    const rows = await this.selectMany<T>(table, select, filters);
    if (rows.length === 0) return null;
    return rows[0];
  }

  async insert<T>(table: string, payload: Record<string, unknown>): Promise<T> {
    const rows = await this.request<T[]>('POST', table, {
      body: payload,
      prefer: 'return=representation',
    });
    if (rows.length === 0) {
      throw new Error(`Supabase insert returned no rows for table ${table}.`);
    }
    return rows[0];
  }

  async insertMany<T>(table: string, payload: Record<string, unknown>[]): Promise<T[]> {
    if (!Array.isArray(payload) || payload.length === 0) return [];
    return this.request<T[]>('POST', table, {
      body: payload,
      prefer: 'return=representation',
    });
  }

  async upsert<T>(table: string, payload: Record<string, unknown>, onConflict: string): Promise<T> {
    const params = new URLSearchParams();
    params.set('on_conflict', onConflict);

    const rows = await this.request<T[]>('POST', table, {
      body: payload,
      prefer: 'resolution=merge-duplicates,return=representation',
      searchParams: params,
    });
    if (rows.length === 0) {
      throw new Error(`Supabase upsert returned no rows for table ${table}.`);
    }
    return rows[0];
  }

  async patchMany<T>(
    table: string,
    payload: Record<string, unknown>,
    filters: QueryFilter[]
  ): Promise<T[]> {
    const params = buildSearchParams('*', filters);
    return this.request<T[]>('PATCH', table, {
      body: payload,
      searchParams: params,
      prefer: 'return=representation',
    });
  }

  async deleteMany<T>(table: string, filters: QueryFilter[]): Promise<T[]> {
    const params = buildSearchParams('*', filters);
    return this.request<T[]>('DELETE', table, {
      searchParams: params,
      prefer: 'return=representation',
    });
  }
}
