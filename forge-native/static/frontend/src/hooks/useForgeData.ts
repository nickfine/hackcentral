import { invoke } from '../utils/forgeBridge';
import type { Defs } from '../types';

/**
 * Typed wrapper around @forge/bridge invoke for resolver calls.
 * Use this from any component that needs to call Forge resolvers.
 */
export async function invokeTyped<K extends keyof Defs>(
  name: K,
  payload?: Parameters<Defs[K]>[0]
): Promise<ReturnType<Defs[K]>> {
  return invoke(name as string, payload) as Promise<ReturnType<Defs[K]>>;
}
