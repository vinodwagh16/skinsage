import { config } from "../config";

interface NearbyParams {
  lat?: number;
  lng?: number;
  city?: string;
  apiKey?: string;
}

export function buildDoctorSearchUrl(params: NearbyParams): string {
  const key = params.apiKey ?? config.GOOGLE_PLACES_API_KEY;
  if (params.lat !== undefined && params.lng !== undefined) {
    const loc = encodeURIComponent(`${params.lat},${params.lng}`);
    return `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${loc}&radius=5000&keyword=dermatologist&key=${key}`;
  }
  const query = encodeURIComponent(`dermatologist near ${params.city}`);
  return `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${key}`;
}

export interface DoctorResult {
  placeId: string;
  name: string;
  rating: number;
  address: string;
  phone?: string;
  openNow?: boolean;
}

export async function searchNearbyDoctors(params: NearbyParams): Promise<DoctorResult[]> {
  const url = buildDoctorSearchUrl(params);
  const res = await fetch(url);
  const data = await res.json() as { status: string; results?: any[] };

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places error: ${data.status}`);
  }

  return (data.results ?? []).slice(0, 10).map((p: any) => ({
    placeId: p.place_id,
    name: p.name,
    rating: p.rating ?? 0,
    address: p.vicinity ?? p.formatted_address ?? "",
    openNow: p.opening_hours?.open_now,
  }));
}
