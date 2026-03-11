'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';

type GoodsReceipt = {
  id: string;
  receiptNo: string;
  evidenceImages?: string[];
};

function resolveImageUrl(path: string, receiptId: string): string {
  if (!path || typeof path !== 'string') return '';
  const trimmed = path.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  return `/api/goods-receipts/${receiptId}/attachments/${trimmed}`;
}

export default function GoodsReceiptEvidenceImages({
  gr,
  onPreview,
}: {
  gr: GoodsReceipt;
  onPreview: (path: string, label: string) => void;
}) {
  const [fetchedUrls, setFetchedUrls] = useState<string[] | null>(null);

  useEffect(() => {
    if (gr.evidenceImages && gr.evidenceImages.length > 0) return;

    let cancelled = false;
    const fetchAttachments = async () => {
      try {
        const res = await apiClient.get<{ urls?: string[]; attachments?: { url: string }[]; files?: string[] }>(
          `/api/goods-receipts/${gr.id}/attachments`
        );
        if (cancelled) return;
        const urls: string[] =
          Array.isArray(res?.urls) ? res.urls :
          Array.isArray(res?.attachments) ? res.attachments.map((a) => a.url).filter(Boolean) :
          Array.isArray(res?.files) ? res.files : [];
        if (urls.length > 0) setFetchedUrls(urls);
        else setFetchedUrls([]);
      } catch {
        if (cancelled) return;
        setFetchedUrls([]);
      }
    };

    void fetchAttachments();
    return () => { cancelled = true; };
  }, [gr.id, gr.evidenceImages?.length]);

  const images = gr.evidenceImages && gr.evidenceImages.length > 0
    ? gr.evidenceImages
    : fetchedUrls;

  const resolved: string[] = images && images.length > 0
    ? images.map((p, i) => {
        const url = resolveImageUrl(p, gr.id);
        return url || (fetchedUrls ? p : `/api/goods-receipts/${gr.id}/attachments/${i}`);
      }).filter(Boolean)
    : [];

  if (resolved.length === 0) {
    if (fetchedUrls !== null) return null;
    const fallbackUrls = [0, 1, 2, 3, 4].map((i) => `/api/goods-receipts/${gr.id}/attachments/${i}`);
    return (
      <div className="px-5 py-3.5 border-t border-[#e5e7eb] bg-white">
        <div className="text-[10px] font-bold tracking-wider uppercase text-[#9ca3af] mb-2.5">Receipt Evidence</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" id={`gr-evidence-${gr.id}`}>
          {fallbackUrls.map((imagePath, imageIndex) => (
            <button
              type="button"
              key={`${gr.id}-evidence-${imageIndex}`}
              onClick={() => onPreview(imagePath, `${gr.receiptNo} evidence ${imageIndex + 1}`)}
              className="group block rounded-lg overflow-hidden border border-[#e5e7eb] bg-[#f9fafb] gr-evidence-slot"
            >
              <img
                src={imagePath}
                alt={`${gr.receiptNo} evidence ${imageIndex + 1}`}
                className="w-full h-28 object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.closest('.gr-evidence-slot')?.classList.add('hidden');
                }}
              />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-3.5 border-t border-[#e5e7eb] bg-white">
      <div className="text-[10px] font-bold tracking-wider uppercase text-[#9ca3af] mb-2.5">Receipt Evidence</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {resolved.map((imagePath, imageIndex) => (
          <button
            type="button"
            key={`${gr.id}-evidence-${imageIndex}`}
            onClick={() => onPreview(imagePath, `${gr.receiptNo} evidence ${imageIndex + 1}`)}
            className="group block rounded-lg overflow-hidden border border-[#e5e7eb] bg-[#f9fafb]"
          >
            <img
              src={imagePath}
              alt={`${gr.receiptNo} evidence ${imageIndex + 1}`}
              className="w-full h-28 object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
