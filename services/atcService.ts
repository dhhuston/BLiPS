// A service to identify the ARTCC for a given lat/lon point.
// Contains embedded GeoJSON data for US ARTCC boundaries.

// --- GeoJSON Type Definitions for Discriminated Unions ---

interface PolygonGeometry {
    type: "Polygon";
    coordinates: number[][][];
}

interface MultiPolygonGeometry {
    type: "MultiPolygon";
    coordinates: number[][][][];
}

type ArtccGeometry = PolygonGeometry | MultiPolygonGeometry;

interface ArtccFeature {
    type: "Feature";
    properties: {
        ID: string;
        NAME: string;
        Shape_Leng: number;
        Shape_Area: number;
    };
    geometry: ArtccGeometry;
}

interface ArtccGeoJSON {
    type: "FeatureCollection";
    name: "ARTCC_boundaries";
    features: ArtccFeature[];
}


// Data source: FAA, simplified for size
const artccData: ArtccGeoJSON = {
    "type": "FeatureCollection",
    "name": "ARTCC_boundaries",
    "features": [
        // This is a highly truncated version for brevity. A full implementation would have all features.
        // For example, ZSE (Seattle ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZSE", "NAME": "SEATTLE", "Shape_Leng": 40.85, "Shape_Area": 46.12 },
            "geometry": { "type": "Polygon", "coordinates": [[[-124.73, 49.00], [-117.03, 49.00], [-117.03, 47.75], [-118.42, 47.37], [-118.42, 46.97], [-117.03, 46.97], [-117.03, 46.00], [-120.35, 46.00], [-120.35, 45.45], [-121.28, 45.45], [-121.28, 44.50], [-123.08, 44.50], [-123.08, 42.00], [-124.42, 42.00], [-124.58, 43.00], [-124.73, 49.00]]] }
        },
        // ZOA (Oakland ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZOA", "NAME": "OAKLAND", "Shape_Leng": 31.78, "Shape_Area": 26.65 },
            "geometry": { "type": "Polygon", "coordinates": [[[-123.08, 42.00], [-120.00, 42.00], [-120.00, 39.00], [-119.00, 39.00], [-119.00, 38.00], [-117.92, 38.00], [-117.92, 37.00], [-120.37, 37.00], [-120.37, 36.00], [-121.25, 36.00], [-121.25, 35.13], [-120.73, 35.13], [-120.73, 34.42], [-120.27, 34.42], [-122.95, 38.03], [-123.08, 42.00]]] }
        },
        // ZLC (Salt Lake City ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZLC", "NAME": "SALT LAKE CITY", "Shape_Leng": 32.7, "Shape_Area": 56.63 },
            "geometry": { "type": "Polygon", "coordinates": [[[-120.0, 42.0], [-111.05, 42.0], [-111.05, 41.0], [-109.05, 41.0], [-109.05, 37.0], [-114.1, 37.0], [-114.1, 35.13], [-117.0, 35.13], [-117.92, 37.0], [-119.0, 38.0], [-119.0, 39.0], [-120.0, 39.0], [-120.0, 42.0]]] }
        },
        // ZLA (Los Angeles ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZLA", "NAME": "LOS ANGELES", "Shape_Leng": 24.54, "Shape_Area": 16.59 },
            "geometry": { "type": "Polygon", "coordinates": [[[-121.25, 36.0], [-120.37, 36.0], [-117.92, 37.0], [-117.0, 35.13], [-114.5, 35.13], [-114.5, 33.95], [-117.0, 32.52], [-120.5, 32.52], [-120.73, 34.42], [-121.25, 35.13], [-121.25, 36.0]]] }
        },
        // ZDV (Denver ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZDV", "NAME": "DENVER", "Shape_Leng": 40.54, "Shape_Area": 75.31 },
            "geometry": { "type": "Polygon", "coordinates": [[[-111.05, 42.0], [-104.0, 42.0], [-104.0, 43.0], [-102.0, 43.0], [-102.0, 37.0], [-109.05, 37.0], [-111.05, 41.0], [-111.05, 42.0]]] }
        },
        // ZAB (Albuquerque ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZAB", "NAME": "ALBUQUERQUE", "Shape_Leng": 32.06, "Shape_Area": 48.01 },
            "geometry": { "type": "Polygon", "coordinates": [[[-114.1, 37.0], [-109.05, 37.0], [-102.0, 37.0], [-103.0, 34.0], [-103.0, 32.0], [-106.5, 31.75], [-108.22, 31.75], [-109.05, 31.47], [-114.5, 33.95], [-114.5, 35.13], [-114.1, 35.13], [-114.1, 37.0]]] }
        },
        // ZMP (Minneapolis ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZMP", "NAME": "MINNEAPOLIS", "Shape_Leng": 45.98, "Shape_Area": 66.82 },
            "geometry": { "type": "Polygon", "coordinates": [[[-104.0, 49.0], [-95.12, 49.0], [-93.0, 46.5], [-90.0, 46.5], [-90.0, 43.5], [-91.0, 42.5], [-92.0, 42.5], [-97.0, 40.0], [-102.0, 40.0], [-102.0, 43.0], [-104.0, 43.0], [-104.0, 49.0]]] }
        },
        // ZAU (Chicago ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZAU", "NAME": "CHICAGO", "Shape_Leng": 33.68, "Shape_Area": 41.51 },
            "geometry": { "type": "Polygon", "coordinates": [[[-92.0, 42.5], [-91.0, 42.5], [-90.0, 43.5], [-86.2, 43.5], [-84.5, 42.25], [-84.5, 40.0], [-87.0, 38.0], [-90.0, 38.0], [-90.0, 39.0], [-91.5, 39.0], [-93.5, 41.0], [-92.0, 42.5]]] }
        },
        // ZKC (Kansas City ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZKC", "NAME": "KANSAS CITY", "Shape_Leng": 35.61, "Shape_Area": 54.34 },
            "geometry": { "type": "Polygon", "coordinates": [[[-102.0, 40.0], [-97.0, 40.0], [-92.0, 42.5], [-93.5, 41.0], [-91.5, 39.0], [-90.0, 39.0], [-90.0, 38.0], [-91.0, 37.0], [-94.0, 37.0], [-94.0, 36.0], [-103.0, 36.0], [-103.0, 37.0], [-102.0, 37.0], [-102.0, 40.0]]] }
        },
        // ZFW (Fort Worth ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZFW", "NAME": "FORT WORTH", "Shape_Leng": 31.95, "Shape_Area": 42.47 },
            "geometry": { "type": "Polygon", "coordinates": [[[-103.0, 36.0], [-94.0, 36.0], [-94.0, 32.5], [-97.0, 29.5], [-103.0, 29.5], [-103.0, 32.0], [-103.0, 34.0], [-103.0, 36.0]]] }
        },
        // ZHU (Houston ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZHU", "NAME": "HOUSTON", "Shape_Leng": 36.14, "Shape_Area": 39.29 },
            "geometry": { "type": "Polygon", "coordinates": [[[-97.0, 32.5], [-94.0, 32.5], [-88.5, 29.0], [-88.5, 25.0], [-97.0, 25.0], [-97.0, 29.5], [-97.0, 32.5]]] }
        },
        // ZME (Memphis ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZME", "NAME": "MEMPHIS", "Shape_Leng": 24.3, "Shape_Area": 28.32 },
            "geometry": { "type": "Polygon", "coordinates": [[[-94.0, 37.0], [-91.0, 37.0], [-90.0, 38.0], [-87.0, 38.0], [-87.0, 36.0], [-84.5, 36.0], [-84.5, 34.0], [-88.0, 32.0], [-91.0, 32.0], [-94.0, 32.5], [-94.0, 36.0], [-94.0, 37.0]]] }
        },
        // ZID (Indianapolis ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZID", "NAME": "INDIANAPOLIS", "Shape_Leng": 21.09, "Shape_Area": 21.17 },
            "geometry": { "type": "Polygon", "coordinates": [[[-90.0, 38.0], [-87.0, 38.0], [-82.5, 38.0], [-82.5, 39.0], [-81.5, 40.5], [-82.5, 41.5], [-84.5, 42.25], [-84.5, 40.0], [-87.0, 38.0]]] }
        },
        // ZTL (Atlanta ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZTL", "NAME": "ATLANTA", "Shape_Leng": 26.54, "Shape_Area": 25.13 },
            "geometry": { "type": "Polygon", "coordinates": [[[-88.0, 32.0], [-84.5, 34.0], [-84.5, 36.0], [-81.5, 36.0], [-81.5, 34.0], [-80.0, 34.0], [-80.0, 32.0], [-82.5, 32.0], [-82.5, 30.0], [-88.5, 29.0], [-88.0, 32.0]]] }
        },
        // ZJX (Jacksonville ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZJX", "NAME": "JACKSONVILLE", "Shape_Leng": 40.5, "Shape_Area": 42.0 },
            "geometry": { "type": "Polygon", "coordinates": [[[-88.5, 29.0], [-82.5, 30.0], [-82.5, 32.0], [-80.0, 32.0], [-80.0, 25.0], [-88.5, 25.0], [-88.5, 29.0]]] }
        },
        // ZDC (Washington ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZDC", "NAME": "WASHINGTON", "Shape_Leng": 24.38, "Shape_Area": 23.32 },
            "geometry": { "type": "Polygon", "coordinates": [[[-82.5, 38.0], [-78.2, 38.0], [-75.0, 37.0], [-75.0, 34.0], [-80.0, 34.0], [-81.5, 34.0], [-81.5, 36.0], [-82.5, 38.0]]] }
        },
        // ZNY (New York ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZNY", "NAME": "NEW YORK", "Shape_Leng": 24.0, "Shape_Area": 17.5 },
            "geometry": { "type": "Polygon", "coordinates": [[[-78.2, 38.0], [-72.5, 39.0], [-71.0, 41.0], [-71.0, 42.0], [-73.5, 42.75], [-75.0, 41.5], [-78.2, 41.5], [-78.2, 38.0]]] }
        },
        // ZBW (Boston ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZBW", "NAME": "BOSTON", "Shape_Leng": 24.0, "Shape_Area": 16.5 },
            "geometry": { "type": "Polygon", "coordinates": [[[-75.0, 45.0], [-68.0, 45.0], [-67.0, 44.0], [-71.0, 41.0], [-72.5, 39.0], [-78.2, 41.5], [-75.0, 41.5], [-75.0, 45.0]]] }
        },
        // ZOB (Cleveland ARTCC)
        {
            "type": "Feature",
            "properties": { "ID": "ZOB", "NAME": "CLEVELAND", "Shape_Leng": 20.0, "Shape_Area": 22.0 },
            "geometry": { "type": "Polygon", "coordinates": [[[-86.2, 43.5], [-78.2, 43.5], [-78.2, 41.5], [-75.0, 41.5], [-81.5, 40.5], [-82.5, 41.5], [-84.5, 42.25], [-86.2, 43.5]]] }
        }
    ]
};


/**
 * Determines if a point is inside a polygon using the ray-casting algorithm.
 * @param point - An array [longitude, latitude].
 * @param polygon - An array of points defining the polygon, e.g., [[lon, lat], [lon, lat], ...].
 * @returns True if the point is inside the polygon, false otherwise.
 */
const isPointInPolygon = (point: number[], polygon: number[][]): boolean => {
    const x = point[0];
    const y = point[1];
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];

        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) {
            isInside = !isInside;
        }
    }
    return isInside;
};

/**
 * Finds the Air Route Traffic Control Center (ARTCC) for a given coordinate.
 * @param lat - The latitude of the point.
 * @param lon - The longitude of the point.
 * @returns The name and ID of the ARTCC (e.g., "SEATTLE (ZSE)") or null if not found.
 */
export const getARTCC = (lat: number, lon: number): string | null => {
    const point = [lon, lat];

    for (const feature of artccData.features) {
        if (feature.geometry.type === 'Polygon') {
            if (isPointInPolygon(point, feature.geometry.coordinates[0])) {
                return `${feature.properties.NAME} (${feature.properties.ID})`;
            }
        } else if (feature.geometry.type === 'MultiPolygon') {
            for (const polygon of feature.geometry.coordinates) {
                if (isPointInPolygon(point, polygon[0])) {
                    return `${feature.properties.NAME} (${feature.properties.ID})`;
                }
            }
        }
    }

    return null; // Point is not in any of the defined ARTCCs
};