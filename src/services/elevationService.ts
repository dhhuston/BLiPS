/**
 * Elevation Service
 * Fetches ground altitude for given coordinates with caching
 */

interface ElevationResponse {
  results: Array<{
    latitude: number;
    longitude: number;
    elevation: number;
  }>;
}

interface CachedElevation {
  elevation: number;
  timestamp: number;
  lat: number;
  lon: number;
}

interface CachedElevationGrid {
  grid: number[][];
  timestamp: number;
  centerLat: number;
  centerLon: number;
  radius: number;
  gridSize: number;
}

// Cache configuration
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_KEY_PREFIX = 'blips_elevation_';
const GRID_CACHE_KEY_PREFIX = 'blips_elevation_grid_';
const COORDINATE_PRECISION = 4; // Decimal places for coordinate matching

/**
 * Get cache key for a single coordinate pair
 */
function getCacheKey(lat: number, lon: number): string {
  const roundedLat = Math.round(lat * Math.pow(10, COORDINATE_PRECISION)) / Math.pow(10, COORDINATE_PRECISION);
  const roundedLon = Math.round(lon * Math.pow(10, COORDINATE_PRECISION)) / Math.pow(10, COORDINATE_PRECISION);
  return `${CACHE_KEY_PREFIX}${roundedLat}_${roundedLon}`;
}

/**
 * Get cache key for elevation grid
 */
function getGridCacheKey(lat: number, lon: number, radius: number, gridSize: number): string {
  const roundedLat = Math.round(lat * Math.pow(10, COORDINATE_PRECISION)) / Math.pow(10, COORDINATE_PRECISION);
  const roundedLon = Math.round(lon * Math.pow(10, COORDINATE_PRECISION)) / Math.pow(10, COORDINATE_PRECISION);
  return `${GRID_CACHE_KEY_PREFIX}${roundedLat}_${roundedLon}_${radius}_${gridSize}`;
}

/**
 * Get cached elevation data
 */
function getCachedElevation(lat: number, lon: number): number | null {
  try {
    const cacheKey = getCacheKey(lat, lon);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const data: CachedElevation = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - data.timestamp > CACHE_DURATION_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return data.elevation;
  } catch (error) {
    console.warn('Failed to read elevation cache:', error);
    return null;
  }
}

/**
 * Cache elevation data
 */
function cacheElevation(lat: number, lon: number, elevation: number): void {
  try {
    const cacheKey = getCacheKey(lat, lon);
    const data: CachedElevation = {
      elevation,
      timestamp: Date.now(),
      lat,
      lon
    };
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to cache elevation data:', error);
  }
}

/**
 * Get cached elevation grid data
 */
function getCachedElevationGrid(lat: number, lon: number, radius: number, gridSize: number): number[][] | null {
  try {
    const cacheKey = getGridCacheKey(lat, lon, radius, gridSize);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const data: CachedElevationGrid = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - data.timestamp > CACHE_DURATION_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return data.grid;
  } catch (error) {
    console.warn('Failed to read elevation grid cache:', error);
    return null;
  }
}

/**
 * Cache elevation grid data
 */
function cacheElevationGrid(lat: number, lon: number, radius: number, gridSize: number, grid: number[][]): void {
  try {
    const cacheKey = getGridCacheKey(lat, lon, radius, gridSize);
    const data: CachedElevationGrid = {
      grid,
      timestamp: Date.now(),
      centerLat: lat,
      centerLon: lon,
      radius,
      gridSize
    };
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to cache elevation grid data:', error);
  }
}

/**
 * Clear old cache entries
 */
function cleanupCache(): void {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    let cleanedCount = 0;

    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX) || key.startsWith(GRID_CACHE_KEY_PREFIX)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (now - data.timestamp > CACHE_DURATION_MS) {
            localStorage.removeItem(key);
            cleanedCount++;
          }
        } catch (error) {
          // Remove invalid cache entries
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
    });

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired elevation cache entries`);
    }
  } catch (error) {
    console.warn('Failed to cleanup elevation cache:', error);
  }
}

/**
 * Get ground elevation for given coordinates with caching
 * Uses Open Elevation API as it's free and doesn't require API keys
 */
export async function getGroundElevation(lat: number, lon: number): Promise<number> {
  // Check cache first
  const cached = getCachedElevation(lat, lon);
  if (cached !== null) {
    return cached;
  }

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
      const finalElevation = Math.max(elevation + 10, 50); // Minimum 50m above sea level
      
      // Cache the result
      cacheElevation(lat, lon, finalElevation);
      
      return finalElevation;
    }
    
    return 100; // Default fallback
  } catch (error) {
    console.warn('Failed to fetch elevation data:', error);
    return 100; // Default fallback
  }
}

/**
 * Fetch a grid of elevations around a center point with caching
 * @param lat Center latitude
 * @param lon Center longitude
 * @param radiusMeters Radius in meters from center to edge of grid
 * @param gridSize Number of points per side (NxN grid)
 * @returns 2D array of elevations (meters)
 */
export async function getElevationGrid(
  lat: number,
  lon: number,
  radiusMeters: number = 500,
  gridSize: number = 5
): Promise<number[][]> {
  // Check cache first
  const cached = getCachedElevationGrid(lat, lon, radiusMeters, gridSize);
  if (cached !== null) {
    return cached;
  }

  // Calculate grid points
  const points: { lat: number; lon: number }[] = [];
  const earthRadius = 6371000; // meters
  const dLat = (radiusMeters / earthRadius) * (180 / Math.PI);
  const dLon = dLat / Math.cos(lat * Math.PI / 180);
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const fracLat = i / (gridSize - 1);
      const fracLon = j / (gridSize - 1);
      const gridLat = lat - dLat + 2 * dLat * fracLat;
      const gridLon = lon - dLon + 2 * dLon * fracLon;
      points.push({ lat: gridLat, lon: gridLon });
    }
  }
  
  // Batch request (Open Elevation allows up to 100 locations per request)
  const locations = points.map(p => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join("|");
  const url = `https://api.open-elevation.com/api/v1/lookup?locations=${locations}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) throw new Error('Elevation API error');
    const data: ElevationResponse = await response.json();
    if (!data.results || data.results.length !== points.length) throw new Error('Incomplete elevation data');
    
    // Reshape to 2D grid
    const grid: number[][] = [];
    for (let i = 0; i < gridSize; i++) {
      const row: number[] = [];
      for (let j = 0; j < gridSize; j++) {
        const idx = i * gridSize + j;
        row.push(data.results[idx].elevation);
      }
      grid.push(row);
    }
    
    // Cache the result
    cacheElevationGrid(lat, lon, radiusMeters, gridSize, grid);
    
    return grid;
  } catch (error) {
    console.warn('Failed to fetch elevation grid:', error);
    // Fallback: flat grid at 100m
    const fallbackGrid = Array.from({ length: gridSize }, () => Array(gridSize).fill(100));
    cacheElevationGrid(lat, lon, radiusMeters, gridSize, fallbackGrid);
    return fallbackGrid;
  }
}

/**
 * Analyze a 2D elevation grid for terrain type and risk.
 * Returns summary, risk, and details (slope, roughness, min/max elevation).
 */
export function analyzeTerrainGrid(grid: number[][]): {
  summary: string;
  risk: 'low' | 'moderate' | 'high';
  details: {
    min: number;
    max: number;
    mean: number;
    stddev: number;
    maxSlope: number;
    meanSlope: number;
    roughness: number;
  }
} {
  const flat = grid.flat();
  const min = Math.min(...flat);
  const max = Math.max(...flat);
  const mean = flat.reduce((a, b) => a + b, 0) / flat.length;
  const stddev = Math.sqrt(flat.reduce((a, b) => a + (b - mean) ** 2, 0) / flat.length);
  // Slope: max difference between adjacent cells (meters per cell)
  let maxSlope = 0;
  let slopeSum = 0;
  let slopeCount = 0;
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      const here = grid[i][j];
      for (const [di, dj] of [[0,1],[1,0],[1,1],[1,-1]]) {
        const ni = i + di, nj = j + dj;
        if (ni < grid.length && nj >= 0 && nj < grid[i].length) {
          const neighbor = grid[ni][nj];
          const slope = Math.abs(here - neighbor);
          maxSlope = Math.max(maxSlope, slope);
          slopeSum += slope;
          slopeCount++;
        }
      }
    }
  }
  const meanSlope = slopeCount ? slopeSum / slopeCount : 0;
  // Roughness: stddev / mean
  const roughness = mean ? stddev / mean : 0;
  // Classify
  let summary = 'Flat terrain';
  let risk: 'low' | 'moderate' | 'high' = 'low';
  if (maxSlope > 50 || roughness > 0.05) {
    summary = 'Mountainous or steep terrain';
    risk = 'high';
  } else if (maxSlope > 15 || roughness > 0.02) {
    summary = 'Hilly or uneven terrain';
    risk = 'moderate';
  } else if (max < 10) {
    summary = 'Possible water or very low-lying area';
    risk = 'moderate';
  }
  return {
    summary,
    risk,
    details: { min, max, mean, stddev, maxSlope, meanSlope, roughness }
  };
}

/**
 * Find the nearest road point to given coordinates using OpenStreetMap Nominatim API
 * @param lat Latitude
 * @param lon Longitude
 * @returns Promise with road coordinates and distance, or null if not found
 */
export async function findNearestRoad(lat: number, lon: number): Promise<{
  roadLat: number;
  roadLon: number;
  distance: number;
  roadName?: string;
} | null> {
  try {
    // Use Nominatim API to find nearest road
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&extratags=1&namedetails=1&zoom=16&layer=transportation`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BLiPS-Balloon-Prediction/1.0'
        },
      }
    );

    if (!response.ok) {
      console.warn('Road finding API unavailable');
      return null;
    }

    const data = await response.json();
    
    if (data.error) {
      console.warn('No road found near coordinates:', data.error);
      return null;
    }

    // Extract road information
    const roadLat = parseFloat(data.lat);
    const roadLon = parseFloat(data.lon);
    const roadName = data.address?.road || data.address?.highway || 'Unknown Road';
    
    // Calculate distance to the road point
    const distance = haversine(lat, lon, roadLat, roadLon);
    
    return {
      roadLat,
      roadLon,
      distance,
      roadName
    };
  } catch (error) {
    console.warn('Failed to find nearest road:', error);
    return null;
  }
}

/**
 * Calculate distance between two points using Haversine formula
 */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
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

/**
 * Initialize cache cleanup on app startup
 */
export function initializeElevationCache(): void {
  // Clean up old cache entries on startup
  cleanupCache();
  
  // Set up periodic cleanup (every hour)
  setInterval(cleanupCache, 60 * 60 * 1000);
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): { singlePoints: number; grids: number; totalSize: number } {
  try {
    const keys = Object.keys(localStorage);
    let singlePoints = 0;
    let grids = 0;
    let totalSize = 0;

    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        singlePoints++;
        totalSize += localStorage.getItem(key)?.length || 0;
      } else if (key.startsWith(GRID_CACHE_KEY_PREFIX)) {
        grids++;
        totalSize += localStorage.getItem(key)?.length || 0;
      }
    });

    return { singlePoints, grids, totalSize };
  } catch (error) {
    console.warn('Failed to get cache stats:', error);
    return { singlePoints: 0, grids: 0, totalSize: 0 };
  }
} 