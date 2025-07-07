export type UnitSystem = 'metric' | 'imperial';

// --- Geocoding Types ---
export interface GeocodingResult {
  lat: string;
  lon: string;
  display_name: string;
  type: string;
}

export interface GeocodingResponse extends Array<GeocodingResult> {}

// --- APRS Types ---
export interface APRSResponse {
  result: string;
  description?: string;
  found: number;
  entries?: APRSPosition[];
}

export interface CalculatorParams {
  payloadWeight: number; // g
  balloonWeight: number; // g
  parachuteWeight: number; // g
  neckLift: number; // g
  gas: 'Helium' | 'Hydrogen';
}

export interface LaunchParams {
  lat: number;
  lon: number;
  launchTime: string; // ISO format string
  launchAltitude: number; // meters
  ascentRate: number; // m/s
  burstAltitude: number; // meters
  descentRate: number; // m/s
}

export interface FlightPoint {
  time: number; // seconds from launch
  lat: number;
  lon: number;
  altitude: number; // meters
}

export interface PredictionResult {
  path: FlightPoint[];
  launchPoint: FlightPoint;
  burstPoint: FlightPoint;
  landingPoint: FlightPoint;
  totalTime: number; // seconds
  maxAltitude?: number;
  distance?: number;
  flightDuration?: number;
}

export interface WeatherData {
  hourly: {
    time: string[];
    temperature_2m?: (number | null)[];
    relativehumidity_2m?: (number | null)[];
    dewpoint_2m?: (number | null)[];
    apparent_temperature?: (number | null)[];
    precipitation?: (number | null)[];
    rain?: (number | null)[];
    snowfall?: (number | null)[];
    cloudcover?: (number | null)[];
    cloudcover_low?: (number | null)[];
    cloudcover_mid?: (number | null)[];
    cloudcover_high?: (number | null)[];
    visibility?: (number | null)[];
    windspeed_10m?: (number | null)[];
    winddirection_10m?: (number | null)[];
    windgusts_10m?: (number | null)[];
    pressure_msl?: (number | null)[];
    surface_pressure?: (number | null)[];
    cape?: (number | null)[];
    cin?: (number | null)[];
    [key: string]: (number | null)[] | string[] | undefined;
  };
  latitude: number;
  longitude: number;
  elevation: number;
}

export interface WeatherPoint {
  speed: number;
  direction: number;
}

export interface LaunchWeather {
  ground?: WeatherPoint;
  mid?: WeatherPoint;
  jet?: WeatherPoint;
}

export interface WeatherForecast {
  temperature: number | null;
  humidity: number | null;
  dewpoint: number | null;
  apparentTemperature: number | null;
  precipitation: number | null;
  rain: number | null;
  snowfall: number | null;
  cloudcover: number | null;
  cloudcoverLow: number | null;
  cloudcoverMid: number | null;
  cloudcoverHigh: number | null;
  visibility: number | null;
  windSpeed10m: number | null;
  windDirection10m: number | null;
  windGusts10m: number | null;
  pressure: number | null;
  surfacePressure: number | null;
  cape: number | null;
  cin: number | null;
  description: string;
}

export interface ComprehensiveWeather {
  ground?: WeatherPoint;
  mid?: WeatherPoint;
  jet?: WeatherPoint;
  forecast?: WeatherForecast;
}

// --- New Types for Advanced Features ---

export interface AppConfig {
    launchParams: LaunchParams;
    calculatorParams: CalculatorParams;
    unitSystem: UnitSystem;
    aprsApiKey?: string;
    aprsCallsign?: string;
}

export interface CalculationStep {
    name: string;
    formula: string;
    calculation: string;
    result: string;
    unit: string;
}

export interface CalculationBreakdown {
    steps: CalculationStep[];
    ascentRate: number;
    burstAltitude: number;
}

export interface GoalCalculationOption {
    payloadWeight: number; // grams
    neckLift: number; // grams  
    totalSystemWeight: number; // grams
    ascentRate: number; // m/s
    burstAltitude: number; // meters (should match target)
    description: string;
    feasibility: 'excellent' | 'good' | 'marginal' | 'poor';
    notes?: string;
}

export interface GoalCalculationResult {
    targetBurstAltitude: number;
    options: GoalCalculationOption[];
    warnings: string[];
}

// --- Live APRS Prediction Types ---

export interface APRSPosition {
    time: number; // Unix timestamp
    lat: number;
    lng: number;
    altitude?: number; // meters
    speed?: number; // m/s
    course?: number; // degrees
    comment?: string;
}

export interface FlightPhase {
    phase: 'ascent' | 'burst' | 'descent' | 'landed' | 'unknown';
    confidence: number; // 0-1
    detectedAt: number; // Unix timestamp
}

export interface ActualFlightMetrics {
    currentPosition: APRSPosition;
    flightPhase: FlightPhase;
    actualAscentRate?: number; // m/s
    actualDescentRate?: number; // m/s
    actualBurstAltitude?: number; // meters
    timeToLanding?: number; // seconds
    deviationFromPredicted: {
        distance: number; // meters
        bearing: number; // degrees
        altitudeDifference: number; // meters
    };
}

export interface LivePredictionComparison {
    originalPrediction: PredictionResult;
    updatedPrediction?: PredictionResult;
    actualMetrics: ActualFlightMetrics;
    accuracy: {
        trajectoryAccuracy: number; // 0-1
        altitudeAccuracy: number; // 0-1
        timingAccuracy: number; // 0-1
        overallAccuracy: number; // 0-1
    };
    recommendations: string[];
}

export interface LiveWeatherEstimate {
    estimatedWindSpeed: number; // m/s
    estimatedWindDirection: number; // degrees
    confidence: number; // 0-1
    altitude: number; // meters
    derivedFrom: 'trajectory_analysis' | 'weather_model' | 'hybrid';
}

export interface DummyFlightConfig {
    enabled: boolean;
    scenario: 'standard' | 'early_burst' | 'wind_shear' | 'slow_ascent' | 'fast_descent';
    beaconInterval: number; // seconds
    startTime: number; // Unix timestamp
    currentTime: number; // Unix timestamp
    noiseLevel: number; // 0-1, amount of random variation
    lastBeaconTime?: number; // Unix timestamp of last beacon
    assumedLanded?: boolean; // When beacon is lost at low altitude
    assumedLandingLocation?: { lat: number; lng: number; time: number }; // Predicted landing location
}
