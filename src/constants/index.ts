export const EARTH_RADIUS_M = 6371000;
export const TIME_STEP_S = 60;

// Physics constants for calculations
export const GRAVITY_MS2 = 9.80665;
export const AIR_DENSITY_SEA_LEVEL_KGM3 = 1.225;
export const GAS_DENSITY_HELIUM_KGM3 = 0.1786;
export const GAS_DENSITY_HYDROGEN_KGM3 = 0.0899;
export const BALLOON_DRAG_COEFFICIENT = 0.3;
export const AVG_STRATOSPHERE_TEMP_K = 220; // ~ -53 C
export const SEA_LEVEL_TEMP_K = 288.15; // 15 C

// Flight simulation constants
export const GROUND_WIND_SPEED_MS = 3; // m/s ground wind
export const GROUND_WIND_DIRECTION_DEG = 180; // degrees (southward drift)
export const JET_STREAM_ALTITUDE_M = 10000; // Jet stream at ~30,000ft
export const MAX_REASONABLE_DEVIATION_M = 50000; // 50km - balloons can drift far from predictions
export const MAX_ALTITUDE_DEVIATION_M = 5000; // 5km - altitude predictions can vary significantly

// Balloon burst constants
export const BURST_RADIUS_COEFFICIENT = 0.479;
export const BURST_RADIUS_EXPONENT = 0.3115;

export const PRESSURE_LEVELS = [
  1000, 975, 950, 925, 900, 850, 800, 750, 700, 650, 600, 550, 500, 450, 400,
  350, 300, 250, 200, 150, 100, 70, 50, 30, 20, 10, 7, 5, 3, 2, 1,
];

// --- Unit Conversion Constants & Functions ---
export const M_TO_FT = 3.28084;
export const G_TO_OZ = 0.035274;

// Length
export const metersToFeet = (m: number): number => m * M_TO_FT;
export const feetToMeters = (ft: number): number => ft / M_TO_FT;

// Speed
export const msToFts = (ms: number): number => ms * M_TO_FT;
export const ftsToMs = (fts: number): number => fts / M_TO_FT;

// Weight
export const gToOz = (g: number): number => g * G_TO_OZ;
export const ozToG = (oz: number): number => oz / G_TO_OZ;