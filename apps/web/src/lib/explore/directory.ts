'use client';
import { useEffect, useState } from 'react';
import type { RuntimeSchema } from '@unihood/contracts';
type Page<T> = {items: T[]; page: {page: number; pageSize: number; hasNextPage: boolean}};
// Read every page so restoring a deep link never treats a later-page entry as missing.
// A finite ceiling fails visibly rather than silently truncating a directory.
export async function readDirectory<T>(url: string, schema: RuntimeSchema<Page<T>>, signal: AbortSignal): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= 100; page++) {
    const target = new URL(url, 'http://local.invalid');
    target.searchParams.set('page', String(page)); target.searchParams.set('pageSize', '100');
    const response = await fetch(`${target.pathname}${target.search}`, {signal, cache: 'no-store', credentials: 'omit'});
    if (!response.ok) throw new Error('Directory unavailable');
    const data = schema.parse(await response.json());
    if (data.page.page !== page || data.page.pageSize !== 100) throw new Error('Directory unavailable');
    items.push(...data.items);
    if (!data.page.hasNextPage) return items;
  }
  throw new Error('Directory unavailable');
}
export function useDirectory<T>(url: string | null, schema: RuntimeSchema<Page<T>>) {
  const [attempt, setAttempt] = useState(0);
  const key = `${url}:${attempt}`;
  const [result, setResult] = useState<{key: string; items?: T[]; failed?: boolean}>({key: ''});
  useEffect(() => {
    if (!url) return;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    readDirectory(url, schema, controller.signal).then((items) => {if (active) setResult({key, items});})
      .catch(() => {if (active) setResult({key, failed: true});}).finally(() => clearTimeout(timer));
    return () => {active = false; clearTimeout(timer); controller.abort();};
  }, [url, key, schema]);
  return {items: result.key === key ? result.items : undefined, failed: result.key === key && result.failed,
    loading: Boolean(url) && (result.key !== key || (!result.items && !result.failed)), retry: () => setAttempt((value) => value + 1)};
}
