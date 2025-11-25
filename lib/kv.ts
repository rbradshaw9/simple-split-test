import type { Test } from '@/types/Test';
import { env } from './env'; // Only used as fallback during initialization

/**
 * Cloudflare KV helper functions
 * 
 * This module provides an abstraction over Cloudflare KV storage.
 * In development (when Cloudflare credentials are not configured), it uses an in-memory mock store.
 * In production (with CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and CLOUDFLARE_KV_NAMESPACE_ID set),
 * it uses the Cloudflare KV REST API.
 */

export interface KVStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<{ keys: Array<{ name: string }> }>;
}

// Mock KV implementation for development
// In production, this would interface with Cloudflare KV REST API
class MockKVStore implements KVStore {
  private store: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(prefix?: string): Promise<{ keys: Array<{ name: string }> }> {
    const keys = Array.from(this.store.keys())
      .filter(key => !prefix || key.startsWith(prefix))
      .map(name => ({ name }));
    return { keys };
  }
}

/**
 * Production KV implementation using Cloudflare REST API
 */
class CloudflareKVStore implements KVStore {
  private accountId: string;
  private namespaceId: string;
  private apiToken: string;
  private baseUrl: string;

  constructor(accountId: string, namespaceId: string, apiToken: string) {
    this.accountId = accountId;
    this.namespaceId = namespaceId;
    this.apiToken = apiToken;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  async get(key: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/values/${encodeURIComponent(key)}`, {
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`KV GET failed: ${response.status} ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error(`Error getting KV key ${key}:`, error);
      return null;
    }
  }

  async put(key: string, value: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/values/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: value,
      });

      if (!response.ok) {
        throw new Error(`KV PUT failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error putting KV key ${key}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/values/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`KV DELETE failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error deleting KV key ${key}:`, error);
      throw error;
    }
  }

  async list(prefix?: string): Promise<{ keys: Array<{ name: string }> }> {
    try {
      const url = new URL(`${this.baseUrl}/keys`);
      if (prefix) {
        url.searchParams.set('prefix', prefix);
      }

      const response = await fetch(url.toString(), {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`KV LIST failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return { keys: data.result || [] };
    } catch (error) {
      console.error('Error listing KV keys:', error);
      return { keys: [] };
    }
  }
}

// Singleton instance
let kvInstance: KVStore | null = null;

/**
 * Gets the KV store instance
 * Uses Cloudflare KV REST API if credentials are configured, otherwise uses mock store for development
 */
export function getKVStore(): KVStore {
  if (!kvInstance) {
    const { cfAccountId, cfNamespaceId, cfApiToken } = env;
    
    if (cfAccountId && cfNamespaceId && cfApiToken) {
      // Production: Use Cloudflare KV REST API
      console.log('✅ Using Cloudflare KV REST API');
      kvInstance = new CloudflareKVStore(cfAccountId, cfNamespaceId, cfApiToken);
    } else {
      // Development: Use mock in-memory store
      console.warn('⚠️  Using mock KV store (in-memory). Configure Cloudflare credentials for production.');
      kvInstance = new MockKVStore();
    }
  }
  return kvInstance;
}

export async function saveTest(test: Test): Promise<void> {
  const kv = getKVStore();
  const key = `test:${test.id}`;
  await kv.put(key, JSON.stringify(test));
  
  // Update tests index
  await updateTestsIndex(test);
}

export async function getTest(testId: string): Promise<Test | null> {
  const kv = getKVStore();
  const key = `test:${testId}`;
  const data = await kv.get(key);
  
  if (!data) return null;
  
  try {
    return JSON.parse(data) as Test;
  } catch {
    return null;
  }
}

export async function getAllTests(): Promise<Test[]> {
  const kv = getKVStore();
  const { keys } = await kv.list('test:');
  
  const tests: Test[] = [];
  
  for (const { name } of keys) {
    const data = await kv.get(name);
    if (data) {
      try {
        tests.push(JSON.parse(data) as Test);
      } catch {
        // Skip invalid entries
      }
    }
  }
  
  return tests.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteTest(testId: string): Promise<void> {
  const kv = getKVStore();
  const key = `test:${testId}`;
  await kv.delete(key);
  
  // Remove from index
  await removeFromTestsIndex(testId);
}

async function updateTestsIndex(test: Test): Promise<void> {
  const kv = getKVStore();
  const indexKey = 'tests_index';
  
  let index: Record<string, { id: string; entryPath: string }> = {};
  
  const indexData = await kv.get(indexKey);
  if (indexData) {
    try {
      index = JSON.parse(indexData);
    } catch {
      // Start fresh if corrupted
    }
  }
  
  index[test.entryPath] = {
    id: test.id,
    entryPath: test.entryPath,
  };
  
  await kv.put(indexKey, JSON.stringify(index));
}

async function removeFromTestsIndex(testId: string): Promise<void> {
  const kv = getKVStore();
  const indexKey = 'tests_index';
  
  const indexData = await kv.get(indexKey);
  if (!indexData) return;
  
  try {
    const index = JSON.parse(indexData);
    const entryPath = Object.keys(index).find(path => index[path].id === testId);
    
    if (entryPath) {
      delete index[entryPath];
      await kv.put(indexKey, JSON.stringify(index));
    }
  } catch {
    // Skip if corrupted
  }
}

export async function saveTestStats(testId: string, stats: any): Promise<void> {
  const kv = getKVStore();
  const key = `stats:${testId}`;
  await kv.put(key, JSON.stringify(stats));
}

export async function getTestStats(testId: string): Promise<any | null> {
  const kv = getKVStore();
  const key = `stats:${testId}`;
  const data = await kv.get(key);
  
  if (!data) return null;
  
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
