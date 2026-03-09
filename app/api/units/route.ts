import { NextRequest, NextResponse } from 'next/server';
import { mockListings } from '@/lib/mockData';

const API_URL = process.env.API_URL;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured');
    const city = searchParams.get('city');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // If no API_URL is configured, use mock data
    if (!API_URL) {
      let filteredData = [...mockListings];
      
      if (featured === 'true') {
        filteredData = filteredData.filter(u => u.is_featured);
      }
      if (city) {
        filteredData = filteredData.filter(u => u.city === city);
      }
      
      const offsetNum = offset ? parseInt(offset) : 0;
      const limitNum = limit ? parseInt(limit) : filteredData.length;
      
      const result = filteredData.slice(offsetNum, offsetNum + limitNum);
      return NextResponse.json(result);
    }

    const params = new URLSearchParams();
    if (featured) params.set('featured', featured);
    if (city) params.set('city', city);
    if (limit) params.set('limit', limit);
    if (offset) params.set('offset', offset);

    // Local fallback for environments without a configured backend API.
    if (!API_URL) {
      let data = [...mockListings];

      if (featured === 'true') {
        data = data.filter((listing) => listing.is_featured);
      }

      if (city) {
        const normalizedCity = city.trim().toLowerCase();
        data = data.filter(
          (listing) => (listing.city ?? '').trim().toLowerCase() === normalizedCity
        );
      }

      const parsedOffset = Number.parseInt(offset ?? '0', 10);
      const safeOffset = Number.isFinite(parsedOffset)
        ? Math.max(0, parsedOffset)
        : 0;

      const parsedLimit = Number.parseInt(limit ?? '', 10);
      const hasValidLimit = Number.isFinite(parsedLimit) && parsedLimit > 0;

      data = hasValidLimit
        ? data.slice(safeOffset, safeOffset + parsedLimit)
        : data.slice(safeOffset);

      return NextResponse.json(data);
    }

    const qs = params.toString();
    const res = await fetch(`${API_URL}/api/units${qs ? `?${qs}` : ''}`);

    if (!res.ok) {
      // Fall back to mock data on error
      console.warn('Backend API failed, using mock data');
      let filteredData = [...mockListings];
      
      if (featured === 'true') {
        filteredData = filteredData.filter(u => u.is_featured);
      }
      if (city) {
        filteredData = filteredData.filter(u => u.city === city);
      }
      
      const offsetNum = offset ? parseInt(offset) : 0;
      const limitNum = limit ? parseInt(limit) : filteredData.length;
      
      const result = filteredData.slice(offsetNum, offsetNum + limitNum);
      return NextResponse.json(result);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Units API proxy error, using mock data:', error);
    // Fall back to mock data
    let filteredData = [...mockListings];
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured');
    const city = searchParams.get('city');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    
    if (featured === 'true') {
      filteredData = filteredData.filter(u => u.is_featured);
    }
    if (city) {
      filteredData = filteredData.filter(u => u.city === city);
    }
    
    const offsetNum = offset ? parseInt(offset) : 0;
    const limitNum = limit ? parseInt(limit) : filteredData.length;
    
    const result = filteredData.slice(offsetNum, offsetNum + limitNum);
    return NextResponse.json(result);
  }
}
