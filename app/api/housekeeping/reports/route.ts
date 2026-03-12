import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (
  process.env.MARKET_API_URL ||
  process.env.NEXT_PUBLIC_MARKET_API_URL ||
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ''
).replace(/\/+$/, '');

/** Payload from housekeeping report form */
export type HousekeepingReportPayload = {
  unitId: string;
  unit: string;
  bookingId?: string;
  location?: string;
  reportedAt: string;
  description?: string;
  reasonOfDamage?: string;
  reportedBy?: string;
  items: Array<{ item: string; type: 'loss' | 'broken' }>;
};

/** POST: submit a damage/loss report. Proxies to backend when configured. */
export async function POST(request: NextRequest) {
  const headers = { 'Content-Type': 'application/json' };

  let body: HousekeepingReportPayload;
  try {
    body = (await request.json()) as HousekeepingReportPayload;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers }
    );
  }

  if (!body.unitId || !body.unit || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: 'unitId, unit, and at least one item are required' },
      { status: 400, headers }
    );
  }

  const validItems = body.items.filter(
    (i) => typeof i.item === 'string' && (i.type === 'loss' || i.type === 'broken')
  );
  if (validItems.length === 0) {
    return NextResponse.json(
      { error: 'At least one item must have type loss or broken' },
      { status: 400, headers }
    );
  }

  const payload = {
    unitId: body.unitId,
    unit: body.unit,
    bookingId: body.bookingId ?? null,
    location: body.location ?? null,
    reportedAt: body.reportedAt,
    description: body.description ?? '',
    reasonOfDamage: body.reasonOfDamage ?? '',
    reportedBy: body.reportedBy ?? null,
    items: validItems,
  };

  if (BACKEND_URL) {
    try {
      const upstreamUrl = `${BACKEND_URL}/api/housekeeping/reports`;
      const res = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: unknown = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      if (!res.ok) {
        return NextResponse.json(
          data ?? { error: 'Backend request failed' },
          { status: res.status, headers }
        );
      }

      return NextResponse.json(data ?? { ok: true }, { status: res.status, headers });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[housekeeping/reports] Backend request failed:', err);
      }
      return NextResponse.json(
        { error: 'Failed to submit report to backend' },
        { status: 502, headers }
      );
    }
  }

  // No backend: accept the report and return success (e.g. for development or when backend is not ready)
  return NextResponse.json(
    { ok: true, id: `report-${Date.now()}`, message: 'Report recorded' },
    { status: 201, headers }
  );
}
