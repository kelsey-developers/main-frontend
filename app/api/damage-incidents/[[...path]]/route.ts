import { NextRequest, NextResponse } from 'next/server';
import { proxyMarketApi, proxyMarketApiBinary } from '@/app/api/_proxy/market';

function buildUpstreamPath(path: string[]): string {
  return `/api/damage-incidents/${path.join('/')}`.replace(/\/$/, '');
}

/**
 * Backend documents GET /api/damage-incidents/attachments/{attachmentId}/content only.
 * Requests to .../{incidentId}/attachments/{attachmentId}/content 404 upstream — redirect to canonical path.
 */
function redirectAttachmentContentToCanonical(request: NextRequest, path: string[]): NextResponse | null {
  if (path.length !== 4) return null;
  if (path[1] !== 'attachments' || path[3] !== 'content') return null;
  const attachmentId = path[2];
  if (!attachmentId) return null;
  const url = new URL(request.url);
  url.pathname = `/api/damage-incidents/attachments/${attachmentId}/content`;
  url.search = '';
  return NextResponse.redirect(url, 307);
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const redirect = redirectAttachmentContentToCanonical(request, path);
  if (redirect) return redirect;

  const upstreamPath = buildUpstreamPath(path);
  // Attachment content is binary; JSON proxy would corrupt images and wrap HTML errors as JSON (502 with JSON breaks <img src>)
  if (path.length >= 2 && path[path.length - 1] === 'content') {
    return proxyMarketApiBinary(request, upstreamPath);
  }
  return proxyMarketApi(request, upstreamPath);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  return proxyMarketApi(request, buildUpstreamPath(path));
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  return proxyMarketApi(request, buildUpstreamPath(path));
}
