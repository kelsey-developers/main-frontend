import { NextRequest } from 'next/server';
import { proxyPayrollApi } from '@/app/api/_proxy/payroll';

/**
 * Proxies requests to PAYROLL_API_URL (payroll-backend).
 * Adds Bearer token from accessToken cookie for authenticated endpoints.
 * Path e.g. ["api", "employees"] -> upstream /api/employees
 */
async function proxy(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = `/${path.join('/')}`.replace(/\/+$/, '') || '/';
  return proxyPayrollApi(request, upstreamPath);
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx);
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx);
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx);
}
