import { GeocodingResponse } from '../types';

export class GeocodingService {
  private baseUrl = 'https://nominatim.openstreetmap.org';

  /**
   * Search for a location by query string
   * @param query - The search query (address, city, etc.)
   * @param limit - Maximum number of results (default: 1)
   * @returns Promise<GeocodingResponse>
   */
  async searchLocation(query: string, limit: number = 1): Promise<GeocodingResponse> {
    if (!query.trim()) {
      throw new Error('Search query cannot be empty');
    }

    const url = `${this.baseUrl}/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Geocoding API error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  }

  /**
   * Get coordinates for a location by query
   * @param query - The search query
   * @returns Promise<{lat: number, lon: number} | null>
   */
  async getCoordinates(query: string): Promise<{lat: number, lon: number} | null> {
    try {
      const results = await this.searchLocation(query, 1);
      
      if (results.length > 0) {
        const { lat, lon } = results[0];
        return {
          lat: parseFloat(lat),
          lon: parseFloat(lon)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Create geocoding service instance
   * @returns GeocodingService instance
   */
  static create(): GeocodingService {
    return new GeocodingService();
  }
}

export default GeocodingService; 