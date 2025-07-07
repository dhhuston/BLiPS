import { 
  APRSPosition, 
  LaunchParams, 
  PredictionResult, 
  WeatherData,
  FlightPoint
} from '../types';
import { altitudeToPressure } from './predictionService';
import { 
  GROUND_WIND_SPEED_MS, 
  GROUND_WIND_DIRECTION_DEG, 
  JET_STREAM_ALTITUDE_M
} from '../constants';

export interface EnhancedSimulationConfig {
  enabled: boolean;
  scenario: SimulationScenario;
  beaconInterval: number; // seconds
  startTime: number; // Unix timestamp
  currentTime: number; // Unix timestamp
  noiseLevel: number; // 0-1, amount of random variation
  simulationSpeed: number; // 1-100x speed multiplier
  physicsModel: 'basic' | 'advanced' | 'realistic';
  weatherIntegration: boolean;
  turbulenceModel: boolean;
  thermalEffects: boolean;
  lastBeaconTime?: number;
  assumedLanded?: boolean;
  assumedLandingLocation?: { lat: number; lng: number; time: number };
  replayMode: boolean;
  replayData?: APRSPosition[];
  customWindProfile?: WindProfile;
  equipmentFailures?: EquipmentFailure[];
}

export interface SimulationScenario {
  name: string;
  description: string;
  type: 'standard' | 'early_burst' | 'wind_shear' | 'slow_ascent' | 'fast_descent' | 'equipment_failure' | 'weather_event' | 'custom';
  parameters: {
    burstAltitudeModifier?: number; // 0.5 = burst at 50% of predicted altitude
    ascentRateModifier?: number; // 0.8 = 20% slower ascent
    descentRateModifier?: number; // 1.5 = 50% faster descent
    windShearAltitude?: number; // altitude where wind shear occurs
    windShearIntensity?: number; // 0-1 intensity of wind shear
    turbulenceLevel?: number; // 0-1 turbulence intensity
    thermalCyclePeriod?: number; // seconds between thermal cycles
    equipmentFailureTime?: number; // seconds after launch when failure occurs
    weatherEventType?: 'storm' | 'jet_stream' | 'thermal_inversion';
  };
}

export interface WindProfile {
  altitude: number; // meters
  windSpeed: number; // m/s
  windDirection: number; // degrees
  turbulence: number; // 0-1
}

export interface EquipmentFailure {
  type: 'parachute' | 'beacon' | 'balloon' | 'payload';
  time: number; // seconds after launch
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
}

export interface SimulationMetrics {
  currentAltitude: number;
  currentSpeed: number;
  currentCourse: number;
  ascentRate: number;
  descentRate: number;
  burstAltitude?: number;
  burstTime?: number;
  landingTime?: number;
  totalDistance: number;
  maxAltitude: number;
  flightPhase: 'ascent' | 'burst' | 'descent' | 'landed';
  weatherConditions: {
    temperature: number;
    pressure: number;
    windSpeed: number;
    windDirection: number;
    humidity: number;
  };
  deviations: {
    fromPredictedAltitude: number;
    fromPredictedPosition: number;
    fromPredictedTime: number;
  };
}

export class EnhancedFlightSimulator {
  private config: EnhancedSimulationConfig;
  private launchParams: LaunchParams;
  private originalPrediction: PredictionResult;
  private weatherData: WeatherData | null;
  private positions: APRSPosition[] = [];
  private metrics: SimulationMetrics | null = null;
  private windCache: Map<number, WindProfile> = new Map();
  private turbulenceCache: Map<number, number> = new Map();

  constructor(
    config: EnhancedSimulationConfig,
    launchParams: LaunchParams,
    originalPrediction: PredictionResult,
    weatherData: WeatherData | null = null
  ) {
    this.config = config;
    this.launchParams = launchParams;
    this.originalPrediction = originalPrediction;
    this.weatherData = weatherData;
  }

  /**
   * Generate APRS positions with enhanced physics and realistic modeling
   */
  async generatePositions(): Promise<APRSPosition[]> {
    if (!this.config.enabled) return [];

    const currentTime = this.config.currentTime;
    const startTime = this.config.startTime;

    // If already landed, don't generate new positions
    if (this.config.assumedLanded) {
      return this.positions;
    }

    // Clear existing positions and regenerate
    this.positions = [];

    // Generate positions at beacon intervals
    for (let time = startTime; time <= currentTime; time += this.config.beaconInterval) {
      const position = await this.generatePositionAtTime(time);
      if (position) {
        this.positions.push(position);

        // Check for landing or equipment failures
        if (this.shouldStopBeaconing(position, time)) {
          this.config.lastBeaconTime = time;
          this.checkForAssumedLanding(position, time);
          break;
        }

        // Check for ground landing - if altitude is at ground level
        if (this.isAtGroundLevel(position)) {
          this.config.assumedLanded = true;
          this.config.assumedLandingLocation = {
            lat: position.lat,
            lng: position.lng,
            time: time
          };
          break;
        }
      }
    }

    // Update last beacon time if we have positions
    if (this.positions.length > 0) {
      this.config.lastBeaconTime = this.positions[this.positions.length - 1].time;
    }

    // Update metrics
    this.updateMetrics();

    return this.positions;
  }

  /**
   * Generate a single position with advanced physics modeling
   */
  private async generatePositionAtTime(timestamp: number): Promise<APRSPosition | null> {
    const flightTime = timestamp - this.config.startTime;
    
    // Get base position from prediction
    let basePosition = this.getBasePosition(flightTime);
    
    // Apply scenario-specific modifications
    let modifiedPosition = this.applyScenarioModifications(basePosition, flightTime);
    
    // Apply advanced physics based on selected model
    switch (this.config.physicsModel) {
      case 'basic':
        modifiedPosition = this.applyBasicPhysics(modifiedPosition, flightTime);
        break;
      case 'advanced':
        modifiedPosition = await this.applyAdvancedPhysics(modifiedPosition, flightTime);
        break;
      case 'realistic':
        modifiedPosition = await this.applyRealisticPhysics(modifiedPosition, flightTime);
        break;
    }
    
    // Apply weather effects if enabled
    if (this.config.weatherIntegration) {
      modifiedPosition = await this.applyWeatherEffects(modifiedPosition, flightTime);
    }
    
    // Apply turbulence if enabled
    if (this.config.turbulenceModel) {
      modifiedPosition = this.applyTurbulence(modifiedPosition, flightTime);
    }
    
    // Apply thermal effects if enabled
    if (this.config.thermalEffects) {
      modifiedPosition = this.applyThermalEffects(modifiedPosition, flightTime);
    }
    
    // Add realistic noise
    const noisyPosition = this.addRealisticNoise(modifiedPosition, flightTime);
    
    // Ensure final data points are stable for landed balloons
    if (noisyPosition.altitude < 100) {
      noisyPosition.altitude = Math.max(0, noisyPosition.altitude);
      const groundNoise = this.config.noiseLevel * 0.3;
      const latSeed = Math.sin(flightTime * 2.345) * Math.cos(flightTime * 1.876);
      const lonSeed = Math.sin(flightTime * 3.456) * Math.cos(flightTime * 2.987);
      
      noisyPosition.lat += latSeed * groundNoise * 0.000005;
      noisyPosition.lon += lonSeed * groundNoise * 0.000005;
    }

    return {
      time: timestamp,
      lat: noisyPosition.lat,
      lng: noisyPosition.lon,
      altitude: noisyPosition.altitude,
      speed: this.calculateSpeed(noisyPosition, flightTime),
      course: this.calculateCourse(noisyPosition, flightTime),
      comment: this.generateComment(noisyPosition, flightTime)
    };
  }

  /**
   * Get base position from original prediction or extrapolate
   */
  private getBasePosition(flightTime: number): FlightPoint {
    // Find the closest predicted point
    let closestPoint = this.originalPrediction.launchPoint;
    let minTimeDiff = Math.abs(flightTime);
    
    for (const point of this.originalPrediction.path) {
      const timeDiff = Math.abs(point.time - flightTime);
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestPoint = point;
      }
    }

    // Extrapolate beyond predicted flight time
    if (flightTime > this.originalPrediction.totalTime) {
      const landingPoint = this.originalPrediction.landingPoint;
      const extraTime = flightTime - this.originalPrediction.totalTime;
      
      // Ground drift after landing
      const groundWindSpeed = GROUND_WIND_SPEED_MS;
      const groundWindDir = GROUND_WIND_DIRECTION_DEG;
      
      const driftDistance = groundWindSpeed * extraTime;
      const driftLat = (driftDistance * Math.cos(groundWindDir * Math.PI / 180)) / 111320;
      const driftLon = (driftDistance * Math.sin(groundWindDir * Math.PI / 180)) / 
                      (111320 * Math.cos(landingPoint.lat * Math.PI / 180));
      
      return {
        time: flightTime,
        lat: landingPoint.lat + driftLat,
        lon: landingPoint.lon + driftLon,
        altitude: 0 // Ground level
      };
    }

    return closestPoint;
  }

  /**
   * Apply scenario-specific modifications
   */
  private applyScenarioModifications(position: FlightPoint, flightTime: number): FlightPoint {
    const scenario = this.config.scenario;
    const modified = { ...position };

    switch (scenario.type) {
      case 'early_burst': {
        const burstModifier = scenario.parameters.burstAltitudeModifier || 0.75;
        const burstAltitude = this.launchParams.burstAltitude * burstModifier;
        
        if (position.altitude >= burstAltitude) {
          // Simulate burst
          const burstTime = flightTime;
          const descentTime = flightTime - burstTime;
          const descentRate = this.launchParams.descentRate * (scenario.parameters.descentRateModifier || 1.0);
          
          modified.altitude = Math.max(0, burstAltitude - descentRate * descentTime);
        }
        break;
      }
      
      case 'wind_shear': {
        const shearAltitude = scenario.parameters.windShearAltitude || 5000;
        const shearIntensity = scenario.parameters.windShearIntensity || 0.5;
        
        if (position.altitude >= shearAltitude) {
          // Apply wind shear effects
          const shearEffect = Math.sin(flightTime * 0.1) * shearIntensity;
          modified.lat += shearEffect * 0.001;
          modified.lon += shearEffect * 0.001;
        }
        break;
      }
      
      case 'slow_ascent': {
        const ascentModifier = scenario.parameters.ascentRateModifier || 0.8;
        const newAscentRate = this.launchParams.ascentRate * ascentModifier;
        modified.altitude = newAscentRate * flightTime;
        break;
      }
      
      case 'fast_descent': {
        const descentModifier = scenario.parameters.descentRateModifier || 1.5;
        const burstAltitude = this.launchParams.burstAltitude;
        
        if (position.altitude >= burstAltitude) {
          const descentTime = flightTime - (burstAltitude / this.launchParams.ascentRate);
          const descentRate = this.launchParams.descentRate * descentModifier;
          modified.altitude = Math.max(0, burstAltitude - descentRate * descentTime);
        }
        break;
      }
      
      case 'equipment_failure': {
        const failureTime = scenario.parameters.equipmentFailureTime || 1800; // 30 minutes
        
        if (flightTime >= failureTime) {
          // Simulate equipment failure effects
          const failureEffect = Math.sin(flightTime * 0.2) * 0.5;
          modified.altitude += failureEffect * 100; // Irregular altitude changes
        }
        break;
      }
    }

    return modified;
  }

  /**
   * Apply basic physics model
   */
  private applyBasicPhysics(position: FlightPoint, _flightTime: number): FlightPoint {
    // Simple atmospheric density effect on ascent rate
    const atmosphericDensity = Math.exp(-position.altitude / 8000);
    
    // Apply simple wind drift at altitude
    const windSpeed = this.getWindSpeed(position.altitude);
    const windDirection = GROUND_WIND_DIRECTION_DEG + (position.altitude / 1000) * 10;
    
    // Basic wind drift calculation
    const windDriftDistance = windSpeed * 0.1; // Simplified
    const windDriftLat = windDriftDistance * Math.cos(windDirection * Math.PI / 180) / 111320;
    const windDriftLon = windDriftDistance * Math.sin(windDirection * Math.PI / 180) / (111320 * Math.cos(position.lat * Math.PI / 180));
    
    return {
      ...position,
      lat: position.lat + windDriftLat,
      lon: position.lon + windDriftLon
    };
  }

  /**
   * Apply advanced physics model with atmospheric modeling
   */
  private async applyAdvancedPhysics(position: FlightPoint, _flightTime: number): Promise<FlightPoint> {
    // More sophisticated atmospheric modeling
    const pressure = altitudeToPressure(position.altitude);
    const temperature = this.calculateTemperature(position.altitude, _flightTime);
    
    // Account for balloon expansion with altitude
    const balloonVolume = this.calculateBalloonVolume(position.altitude);
    const liftForce = this.calculateLiftForce(balloonVolume, temperature, 50);
    const dragForce = this.calculateDragForce(position.altitude, 5);
    
    // Calculate net force and acceleration
    const totalMass = this.calculateTotalMass();
    const netForce = liftForce - dragForce - (totalMass * 9.8);
    const acceleration = netForce / totalMass;
    
    // Get wind profile for current altitude
    const windProfile = await this.getWindProfile(position.altitude, _flightTime);
    const windDrift = this.calculateWindDrift(position, windProfile);
    
    return {
      ...position,
      lat: position.lat + windDrift.latDrift,
      lon: position.lon + windDrift.lonDrift,
      altitude: Math.max(0, position.altitude + acceleration * 0.1)
    };
  }

  /**
   * Apply realistic physics with detailed atmospheric modeling
   */
  private async applyRealisticPhysics(position: FlightPoint, _flightTime: number): Promise<FlightPoint> {
    // Full physics simulation with all effects
    const pressure = altitudeToPressure(position.altitude);
    
    // Complex atmospheric modeling
    const atmosphericDensity = pressure / (287.05 * (288.15 - 0.0065 * position.altitude));
    const temperature = 288.15 - 0.0065 * position.altitude;
    
    // Balloon physics
    const balloonVolume = this.calculateBalloonVolume(position.altitude);
    const liftForce = this.calculateLiftForce(balloonVolume, temperature, 50);
    const dragForce = this.calculateDragForce(position.altitude, 5);
    
    // Calculate net force and acceleration
    const totalMass = this.calculateTotalMass();
    const netForce = liftForce - dragForce - (totalMass * 9.8);
    const acceleration = netForce / totalMass;
    
    // Get wind profile for current altitude
    const windProfile = await this.getWindProfile(position.altitude, _flightTime);
    const windDrift = this.calculateWindDrift(position, windProfile);
    
    return {
      ...position,
      lat: position.lat + windDrift.latDrift,
      lon: position.lon + windDrift.lonDrift,
      altitude: Math.max(0, position.altitude + acceleration * 0.1)
    };
  }

  /**
   * Apply weather effects from real weather data
   */
  private async applyWeatherEffects(position: FlightPoint, flightTime: number): Promise<FlightPoint> {
    if (!this.weatherData) return position;
    
    const altitude = position.altitude;
    const windProfile = await this.getWindProfile(altitude, flightTime);
    
    const modified = { ...position };
    
    // Apply wind effects
    const windDrift = this.calculateWindDrift(position, windProfile);
    modified.lat += windDrift.latDrift;
    modified.lon += windDrift.lonDrift;
    
    // Apply temperature effects on balloon performance
    const temperature = this.getWeatherTemperature(flightTime);
    if (temperature) {
      const tempEffect = (temperature - 15) / 30; // Normalized around 15°C
      modified.altitude += tempEffect * 50; // Temperature affects lift
    }
    
    return modified;
  }

  /**
   * Apply turbulence effects
   */
  private applyTurbulence(position: FlightPoint, flightTime: number): FlightPoint {
    const altitude = position.altitude;
    const turbulenceLevel = this.config.scenario.parameters.turbulenceLevel || 0.3;
    
    // Turbulence increases with altitude and wind speed
    const windSpeed = this.getWindSpeed(altitude);
    const turbulenceIntensity = turbulenceLevel * (altitude / 10000) * (windSpeed / 10);
    
    const modified = { ...position };
    
    // Add random turbulence
    const turbulenceLat = Math.sin(flightTime * 3.14159) * Math.cos(flightTime * 2.718) * turbulenceIntensity * 0.0001;
    const turbulenceLon = Math.cos(flightTime * 2.718) * Math.sin(flightTime * 3.14159) * turbulenceIntensity * 0.0001;
    
    modified.lat += turbulenceLat;
    modified.lon += turbulenceLon;
    modified.altitude += Math.sin(flightTime * 0.5) * turbulenceIntensity * 10;
    
    return modified;
  }

  /**
   * Apply thermal effects (daytime heating, nighttime cooling)
   */
  private applyThermalEffects(position: FlightPoint, flightTime: number): FlightPoint {
    const launchTime = new Date(this.launchParams.launchTime);
    const currentTime = new Date(this.config.startTime * 1000 + flightTime * 1000);
    const hoursSinceLaunch = (currentTime.getTime() - launchTime.getTime()) / (1000 * 60 * 60);
    
    // Thermal effects are strongest during daytime
    const hourOfDay = currentTime.getHours();
    const isDaytime = hourOfDay >= 6 && hourOfDay <= 18;
    const thermalIntensity = isDaytime ? 0.5 : 0.1;
    
    const modified = { ...position };
    
    // Thermal updrafts during daytime
    if (isDaytime && position.altitude < 5000) {
      const thermalEffect = Math.sin(hoursSinceLaunch * 2) * thermalIntensity;
      modified.altitude += thermalEffect * 50;
    }
    
    return modified;
  }

  /**
   * Get wind profile for a specific altitude and time
   */
  private async getWindProfile(altitude: number, _flightTime: number): Promise<WindProfile> {
    const cacheKey = Math.round(altitude / 100) * 100; // Cache by 100m intervals
    
    if (this.windCache.has(cacheKey)) {
      return this.windCache.get(cacheKey)!;
    }
    
    // Calculate wind profile based on altitude
    let windSpeed = GROUND_WIND_SPEED_MS;
    let windDirection = GROUND_WIND_DIRECTION_DEG;
    
    if (altitude > 1000) {
      // Wind increases with altitude
      windSpeed = GROUND_WIND_SPEED_MS + (altitude - 1000) * 0.01;
    }
    
    if (altitude > JET_STREAM_ALTITUDE_M) {
      // Jet stream effects
      windSpeed = 30 + Math.sin(altitude / 1000) * 10;
      windDirection = 270 + Math.sin(altitude / 2000) * 30; // Westerly with variations
    }
    
    const windProfile: WindProfile = {
      altitude,
      windSpeed,
      windDirection,
      turbulence: Math.min(1, altitude / 10000)
    };
    
    this.windCache.set(cacheKey, windProfile);
    return windProfile;
  }

  /**
   * Calculate wind drift based on wind profile
   */
  private calculateWindDrift(position: FlightPoint, windProfile: WindProfile): { latDrift: number; lonDrift: number } {
    const windSpeed = windProfile.windSpeed;
    const windDirection = windProfile.windDirection;
    const timeInterval = this.config.beaconInterval;
    
    const driftDistance = windSpeed * timeInterval;
    const latDrift = (driftDistance * Math.cos(windDirection * Math.PI / 180)) / 111320;
    const lonDrift = (driftDistance * Math.sin(windDirection * Math.PI / 180)) / 
                    (111320 * Math.cos(position.lat * Math.PI / 180));
    
    return { latDrift, lonDrift };
  }

  /**
   * Add realistic noise to positions
   */
  private addRealisticNoise(position: FlightPoint, flightTime: number): FlightPoint {
    const noiseLevel = this.config.noiseLevel;
    const altitude = position.altitude;
    
    // Noise decreases with altitude (GPS accuracy improves)
    const altitudeFactor = Math.max(0.1, 1 - altitude / 30000);
    const effectiveNoise = noiseLevel * altitudeFactor;
    
    const modified = { ...position };
    
    // Add position noise
    const latNoise = Math.sin(flightTime * 1.234) * Math.cos(flightTime * 2.345) * effectiveNoise * 0.00001;
    const lonNoise = Math.cos(flightTime * 2.345) * Math.sin(flightTime * 3.456) * effectiveNoise * 0.00001;
    const altNoise = Math.sin(flightTime * 0.789) * effectiveNoise * 10;
    
    modified.lat += latNoise;
    modified.lon += lonNoise;
    modified.altitude += altNoise;
    
    return modified;
  }

  /**
   * Calculate speed based on position changes
   */
  private calculateSpeed(position: FlightPoint, _flightTime: number): number {
    if (this.positions.length === 0) return 0;
    
    const lastPosition = this.positions[this.positions.length - 1];
    const distance = this.haversine(
      lastPosition.lat, lastPosition.lng,
      position.lat, position.lon
    );
    const timeDiff = this.config.beaconInterval;
    
    return distance / timeDiff;
  }

  /**
   * Calculate course (bearing) based on position changes
   */
  private calculateCourse(position: FlightPoint, _flightTime: number): number {
    if (this.positions.length === 0) return 0;
    
    const lastPosition = this.positions[this.positions.length - 1];
    return this.calculateBearing(
      lastPosition.lat, lastPosition.lng,
      position.lat, position.lon
    );
  }

  /**
   * Generate comment for APRS position
   */
  private generateComment(position: FlightPoint, _flightTime: number): string {
    const phase = this.determineFlightPhase(position, _flightTime);
    const altitude = Math.round(position.altitude);
    
    return `${phase.toUpperCase()} ${altitude}m`;
  }

  /**
   * Determine current flight phase
   */
  private determineFlightPhase(position: FlightPoint, _flightTime: number): 'ascent' | 'burst' | 'descent' | 'landed' {
    const altitude = position.altitude;
    const burstAltitude = this.launchParams.burstAltitude;
    
    if (altitude < 100) return 'landed';
    if (altitude >= burstAltitude) return 'descent';
    return 'ascent';
  }

  /**
   * Check if beaconing should stop (low altitude, equipment failure, etc.)
   */
  private shouldStopBeaconing(position: APRSPosition, currentTime: number): boolean {
    const altitude = position.altitude || 0;
    
    // Stop beaconing at very low altitude
    if (altitude < 50) return true;
    
    // Check for equipment failures
    if (this.config.equipmentFailures) {
      for (const failure of this.config.equipmentFailures) {
        const failureTime = this.config.startTime + failure.time;
        if (currentTime >= failureTime && failure.type === 'beacon') {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Check for assumed landing conditions
   */
  private checkForAssumedLanding(lastPosition: APRSPosition, currentTime: number): void {
    const altitude = lastPosition.altitude || 0;
    const timeSinceLastBeacon = currentTime - (this.config.lastBeaconTime || 0);
    const missedBeacons = timeSinceLastBeacon / this.config.beaconInterval;
    
    // Assume landed if beacon lost at low altitude for extended period
    // Enhanced thresholds based on altitude
    const lowAltitudeThreshold = altitude < 200 && timeSinceLastBeacon > 300; // 5 minutes
    const veryLowAltitudeThreshold = altitude < 100 && timeSinceLastBeacon > 180; // 3 minutes
    const nearGroundThreshold = altitude < 50 && timeSinceLastBeacon > 60; // 1 minute
    const missedBeaconThreshold = altitude < 500 && missedBeacons >= 2;
    
    if (lowAltitudeThreshold || veryLowAltitudeThreshold || nearGroundThreshold || missedBeaconThreshold) {
      this.config.assumedLanded = true;
      this.config.assumedLandingLocation = {
        lat: lastPosition.lat,
        lng: lastPosition.lng,
        time: currentTime
      };
    }
  }

  /**
   * Check if the position is at ground level
   */
  private isAtGroundLevel(position: APRSPosition): boolean {
    const altitude = position.altitude || 0;
    // Consider landed if altitude is very low and likely at or near ground
    return altitude < 50; // More stringent for enhanced simulator
  }

  /**
   * Update simulation metrics
   */
  private updateMetrics(): void {
    if (this.positions.length === 0) {
      this.metrics = null;
      return;
    }
    
    const currentPosition = this.positions[this.positions.length - 1];
    const flightTime = currentPosition.time - this.config.startTime;
    
    // Calculate ascent and descent rates
    let ascentRate = 0;
    let descentRate = 0;
    let burstAltitude: number | undefined;
    let burstTime: number | undefined;
    
    for (let i = 1; i < this.positions.length; i++) {
      const prev = this.positions[i - 1];
      const curr = this.positions[i];
      const timeDiff = curr.time - prev.time;
      const altDiff = (curr.altitude || 0) - (prev.altitude || 0);
      
      if (altDiff > 0) {
        ascentRate = altDiff / timeDiff;
      } else if (altDiff < 0) {
        descentRate = Math.abs(altDiff) / timeDiff;
        
        // Detect burst
        if (!burstAltitude && curr.altitude && curr.altitude < (prev.altitude || 0)) {
          burstAltitude = prev.altitude;
          burstTime = prev.time - this.config.startTime;
        }
      }
    }
    
    // Calculate total distance
    let totalDistance = 0;
    for (let i = 1; i < this.positions.length; i++) {
      const prev = this.positions[i - 1];
      const curr = this.positions[i];
      totalDistance += this.haversine(prev.lat, prev.lng, curr.lat, curr.lng);
    }
    
    // Find max altitude
    const maxAltitude = Math.max(...this.positions.map(p => p.altitude || 0));
    
    // Calculate deviations from prediction
    const predictedLanding = this.originalPrediction.landingPoint;
    const actualPosition = currentPosition;
    const altitudeDeviation = Math.abs((actualPosition.altitude || 0) - predictedLanding.altitude);
    const positionDeviation = this.haversine(
      actualPosition.lat, actualPosition.lng,
      predictedLanding.lat, predictedLanding.lon
    );
    const timeDeviation = Math.abs(flightTime - this.originalPrediction.totalTime);
    
    this.metrics = {
      currentAltitude: currentPosition.altitude || 0,
      currentSpeed: currentPosition.speed || 0,
      currentCourse: currentPosition.course || 0,
      ascentRate,
      descentRate,
      burstAltitude,
      burstTime,
      landingTime: this.config.assumedLanded ? currentPosition.time : undefined,
      totalDistance,
      maxAltitude,
      flightPhase: this.determineFlightPhase({
        time: currentPosition.time,
        lat: currentPosition.lat,
        lon: currentPosition.lng,
        altitude: currentPosition.altitude || 0
      }, flightTime),
      weatherConditions: {
        temperature: 15, // Placeholder
        pressure: altitudeToPressure(currentPosition.altitude || 0),
        windSpeed: 5, // Placeholder
        windDirection: 180, // Placeholder
        humidity: 50 // Placeholder
      },
      deviations: {
        fromPredictedAltitude: altitudeDeviation,
        fromPredictedPosition: positionDeviation,
        fromPredictedTime: timeDeviation
      }
    };
  }

  // Utility methods
  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => deg * Math.PI / 180;
    const R = 6371000; // Earth radius in meters
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => deg * Math.PI / 180;
    const toDeg = (rad: number) => rad * 180 / Math.PI;
    
    const dLon = toRad(lon2 - lon1);
    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    let bearing = toDeg(Math.atan2(y, x));
    return (bearing + 360) % 360;
  }

  // Placeholder methods for physics calculations
  private calculateTemperature(altitude: number, _flightTime: number): number {
    return 15 - (altitude / 1000) * 6.5;
  }

  private calculateHumidity(altitude: number, _flightTime: number): number {
    return Math.max(10, 100 - altitude / 100);
  }

  private calculateBalloonVolume(_altitude: number): number {
    return 1.0; // Placeholder
  }

  private calculateLiftForce(_volume: number, _temperature: number, _humidity: number): number {
    return 9.8; // Placeholder - 1g lift
  }

  private calculateDragForce(_altitude: number, _speed: number): number {
    return 0.1; // Placeholder
  }

  private calculateTotalMass(): number {
    return 1.0; // Placeholder - 1kg total mass
  }

  private getWindSpeed(altitude: number): number {
    return 5 + altitude / 1000; // Placeholder
  }

  private getWeatherTemperature(_flightTime: number): number | null {
    return 15; // Placeholder
  }

  // Public methods for configuration and data access
  updateTime(newTime: number): void {
    this.config.currentTime = newTime;
  }

  getConfig(): EnhancedSimulationConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<EnhancedSimulationConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getMetrics(): SimulationMetrics | null {
    return this.metrics;
  }

  getPositions(): APRSPosition[] {
    return [...this.positions];
  }

  clearCache(): void {
    this.windCache.clear();
    this.turbulenceCache.clear();
  }
}

// Factory functions
export function createDefaultEnhancedConfig(): EnhancedSimulationConfig {
  return {
    enabled: false,
    scenario: {
      name: 'Standard Flight',
      description: 'Normal balloon flight with realistic variations',
      type: 'standard',
      parameters: {}
    },
    beaconInterval: 15,
    startTime: Date.now() / 1000,
    currentTime: Date.now() / 1000,
    noiseLevel: 0.3,
    simulationSpeed: 1,
    physicsModel: 'advanced',
    weatherIntegration: true,
    turbulenceModel: true,
    thermalEffects: true,
    replayMode: false
  };
}

export function createEnhancedFlightSimulator(
  launchParams: LaunchParams,
  originalPrediction: PredictionResult,
  config?: Partial<EnhancedSimulationConfig>,
  weatherData?: WeatherData | null
): EnhancedFlightSimulator {
  const defaultConfig = createDefaultEnhancedConfig();
  const finalConfig = { ...defaultConfig, ...config };
  
  return new EnhancedFlightSimulator(
    finalConfig,
    launchParams,
    originalPrediction,
    weatherData
  );
} 