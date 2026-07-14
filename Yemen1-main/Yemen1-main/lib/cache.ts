import { supabase } from '@/lib/supabase';
import type { ServiceProvider, Governorate, FuelStation } from '@/types/database';

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const memoryCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttl = CACHE_TTL): void {
  memoryCache.set(key, { data, timestamp: Date.now(), ttl });
}

export function clearCache(key?: string): void {
  if (key) {
    memoryCache.delete(key);
  } else {
    memoryCache.clear();
  }
}

export async function fetchProvidersWithCache(): Promise<ServiceProvider[]> {
  const cacheKey = 'service_providers_active';
  const cached = getCached<ServiceProvider[]>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('service_providers')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (!error && data) {
    setCached(cacheKey, data as ServiceProvider[]);
    return data as ServiceProvider[];
  }
  return [];
}

export async function fetchGovernoratesWithCache(): Promise<Governorate[]> {
  const cacheKey = 'governorates_active';
  const cached = getCached<Governorate[]>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('governorates')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (!error && data) {
    setCached(cacheKey, data as Governorate[]);
    return data as Governorate[];
  }
  return [];
}

export async function fetchFuelStationsWithCache(): Promise<FuelStation[]> {
  const cacheKey = 'fuel_stations_active';
  const cached = getCached<FuelStation[]>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('fuel_stations')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (!error && data) {
    setCached(cacheKey, data as FuelStation[]);
    return data as FuelStation[];
  }
  return [];
}

export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return fetchWithRetry(fn, retries - 1, delayMs * 2);
  }
}

export async function callEdgeFunctionWithRetry(
  payload: Record<string, unknown>,
  retries = 2
): Promise<{ success: boolean; receiptNumber?: string; message?: string; error?: string; balance?: number; lastUpdate?: string; hasLoan?: boolean; loanAmount?: number; [key: string]: unknown }> {
  const functionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/process-payment`;
  const fn = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      return response.json();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  };
  return fetchWithRetry(fn, retries);
}
