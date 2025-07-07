/**
 * Elevation Service
 * Fetches ground altitude for given coordinates
 */

interface ElevationResponse {
  results: Array<{
    latitude: number;
    longitude: number;
    elevation: number;
  }>;
}

/**
 * Get ground elevation for given coordinates
 * Uses Open Elevation API as it's free and doesn't require API keys
 */
export async function getGroundElevation(lat: number, lon: number): Promise<number> {
  try {
    // Round coordinates to avoid excessive API calls for tiny movements
    const roundedLat = Math.round(lat * 10000) / 10000; // 4 decimal places
    const roundedLon = Math.round(lon * 10000) / 10000;
    
    const response = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${roundedLat},${roundedLon}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn('Elevation API unavailable, using default altitude');
      return 100; // Default 100m if API fails
    }

    const data: ElevationResponse = await response.json();
    
    if (data.results && data.results.length > 0) {
      const elevation = data.results[0].elevation;
      // Add small buffer above ground level for balloon launch
      return Math.max(elevation + 10, 50); // Minimum 50m above sea level
    }
    
    return 100; // Default fallback
  } catch (error) {
    console.warn('Failed to fetch elevation data:', error);
    return 100; // Default fallback
  }
}

/**
 * Format elevation with appropriate units
 */
export function formatElevation(meters: number, isImperial: boolean): string {
  if (isImperial) {
    const feet = meters * 3.28084;
    return `${Math.round(feet)}ft MSL`;
  }
  return `${Math.round(meters)}m MSL`;
} 