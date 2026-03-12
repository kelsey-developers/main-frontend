'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api/client';

/**
 * Fetches product names for the given product IDs using the products list endpoint
 * first (more reliable), then individual fetches for any remaining. Used across
 * PO details, create PO, and goods receipt to display human-readable names instead
 * of "Product #<id>".
 */
export function useProductNames(productIds: string[]): Record<string, string> {
  const [fetchedNames, setFetchedNames] = useState<Record<string, string>>({});
  const requestedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const uniqueIds = [...new Set(productIds)].filter(Boolean);
    const idsToFetch = uniqueIds.filter((id) => !requestedRef.current.has(id));
    if (idsToFetch.length === 0) return;

    idsToFetch.forEach((id) => requestedRef.current.add(id));

    void (async () => {
      const names: Record<string, string> = {};

      // Try products list first (returns { products: [{ id, name, ... }] }) - more reliable.
      try {
        const listRes = await apiClient.get<{
          products?: Array<{ id: string; name?: string }>;
          data?: Array<{ id: string; name?: string }>;
        }>('/api/products?limit=500');
        const products = listRes?.products ?? listRes?.data ?? [];
        for (const p of products) {
          if (p?.id && idsToFetch.includes(p.id) && p.name) names[p.id] = p.name;
        }
      } catch {
        // fall through to individual fetches
      }

      // Fetch any remaining IDs individually (handles various response formats).
      const remaining = idsToFetch.filter((id) => !names[id]);
      await Promise.all(
        remaining.map(async (productId) => {
          try {
            const res = await apiClient.get<Record<string, unknown>>(`/api/products/${productId}`);
            const obj = (res?.product ?? res?.data ?? res) as { name?: string };
            const name = (res?.name as string) ?? obj?.name;
            if (typeof name === 'string' && name) names[productId] = name;
          } catch {
            // ignore fetch errors
          }
        })
      );

      setFetchedNames((prev) => ({ ...prev, ...names }));
    })();
  }, [productIds.join(',')]);

  return fetchedNames;
}

export type ProductDetails = { name: string; sku?: string };

/**
 * Fetches product names and SKUs for the given product IDs. Used by create PO
 * for synthetic items (PO-line products not in replenishmentItems) to show
 * correct name and SKU in the picker.
 */
export function useProductDetails(productIds: string[]): Record<string, ProductDetails> {
  const [fetchedDetails, setFetchedDetails] = useState<Record<string, ProductDetails>>({});
  const requestedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const uniqueIds = [...new Set(productIds)].filter(Boolean);
    const idsToFetch = uniqueIds.filter((id) => !requestedRef.current.has(id));
    if (idsToFetch.length === 0) return;

    idsToFetch.forEach((id) => requestedRef.current.add(id));

    void (async () => {
      const details: Record<string, ProductDetails> = {};

      try {
        const listRes = await apiClient.get<{
          products?: Array<{ id: string; name?: string; sku?: string }>;
          data?: Array<{ id: string; name?: string; sku?: string }>;
        }>('/api/products?limit=500');
        const products = listRes?.products ?? listRes?.data ?? [];
        for (const p of products) {
          if (p?.id && idsToFetch.includes(p.id) && p.name) {
            details[p.id] = { name: p.name, sku: p.sku };
          }
        }
      } catch {
        // fall through
      }

      const remaining = idsToFetch.filter((id) => !details[id]);
      await Promise.all(
        remaining.map(async (productId) => {
          try {
            const res = await apiClient.get<Record<string, unknown>>(`/api/products/${productId}`);
            const obj = (res?.product ?? res?.data ?? res) as { name?: string; sku?: string };
            const name = (res?.name as string) ?? obj?.name;
            if (typeof name === 'string' && name) {
              details[productId] = { name, sku: obj?.sku };
            }
          } catch {
            // ignore
          }
        })
      );

      setFetchedDetails((prev) => ({ ...prev, ...details }));
    })();
  }, [productIds.join(',')]);

  return fetchedDetails;
}

export interface ProductForPicker {
  id: string;
  name: string;
  sku: string;
  unit: string;
  minStock: number;
  unitCost: number;
}

/**
 * Fetches all products from the API. Used by create PO to include products that exist
 * in the database but may not be in replenishmentItems (e.g. newly created items with
 * no stock yet, or items from cancelled POs).
 * @param refreshKey - When this changes, products are refetched (e.g. after creating a new item).
 */
export function useAllProducts(refreshKey = 0): ProductForPicker[] {
  const [products, setProducts] = useState<ProductForPicker[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiClient.get<{
          products?: Array<{ id: string; name?: string; sku?: string; unit?: string; reorderLevel?: number }>;
          data?: Array<{ id: string; name?: string; sku?: string; unit?: string; reorderLevel?: number }>;
        }>('/api/products?limit=500');
        const list = res?.products ?? res?.data ?? [];
        const mapped: ProductForPicker[] = list
          .filter((p) => p?.id && p?.name)
          .map((p) => ({
            id: p.id,
            name: p.name ?? '',
            sku: p.sku ?? p.id,
            unit: p.unit ?? 'pcs',
            minStock: typeof p.reorderLevel === 'number' ? p.reorderLevel : 0,
            unitCost: 0,
          }));
        setProducts(mapped);
      } catch {
        // ignore
      }
    })();
  }, [refreshKey]);

  return products;
}
