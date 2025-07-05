import { APRSPosition, DummyFlightConfig, LaunchParams, PredictionResult, WeatherData } from '../types';
import { altitudeToPressure } from './predictionService';
import { PRESSURE_LEVELS } from '../constants';

/**
 * Generate realistic dummy APRS positions for testing live prediction features
 */
export class DummyFlightSimulator {
  private config: DummyFlightConfig;
  private launchParams: LaunchParams;
  private originalPrediction: PredictionResult;
  private weatherData: WeatherData | null;
  private positions: APRSPosition[] = [];

  constructor(
    config: DummyFlightConfig,
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
   * Generate APRS positions up to current simulation time
   */
  generatePositions(): APRSPosition[] {
    if (!this.config.enabled) return [];

    const currentTime = this.config.currentTime;
    const startTime = this.config.startTime;
    const elapsed = currentTime - startTime;

    // Clear existing positions and regenerate
    this.positions = [];

    // Generate positions at beacon intervals until assumed landing
    let lastValidTime = startTime;
    for (let time = startTime; time <= currentTime; time += this.config.beaconInterval) {
      const position = this.generatePositionAtTime(time);
      if (position) {
        this.positions.push(position);
        lastValidTime = time;
        
        // Check if we should stop beaconing (simulate beacon loss at low altitude)
        if (this.shouldStopBeaconing(position, time)) {
          this.config.lastBeaconTime = time;
          this.checkForAssumedLanding(position, time);
          break;
        }
      }
    }

    // Update last beacon time if we have positions
    if (this.positions.length > 0) {
      this.config.lastBeaconTime = this.positions[this.positions.length - 1].time;
    }

    // Check for assumed landing if no recent beacons
    if (!this.config.assumedLanded && this.positions.length > 0) {
      const lastPosition = this.positions[this.positions.length - 1];
      this.checkForAssumedLanding(lastPosition, currentTime);
    }

    return this.positions;
  }

  /**
   * Generate a single position at a specific time
   */
  private generatePositionAtTime(timestamp: number): APRSPosition | null {
    const flightTime = timestamp - this.config.startTime;
    
    // Find the closest predicted point or extrapolate beyond the flight
    let closestPoint = this.originalPrediction.launchPoint;
    let minTimeDiff = Math.abs(flightTime);
    
    for (const point of this.originalPrediction.path) {
      const timeDiff = Math.abs(point.time - flightTime);
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestPoint = point;
      }
    }

    // Better landing extrapolation for points beyond predicted flight time
    if (flightTime > this.originalPrediction.totalTime) {
      const landingPoint = this.originalPrediction.landingPoint;
      const extraTime = flightTime - this.originalPrediction.totalTime;
      
      // Balloon continues to drift after landing due to wind
      const groundWindSpeed = 3; // m/s ground wind
      const groundWindDir = 180; // degrees (southward drift)
      
      const driftDistance = groundWindSpeed * extraTime;
      const driftLat = (driftDistance * Math.cos(groundWindDir * Math.PI / 180)) / 111320;
      const driftLon = (driftDistance * Math.sin(groundWindDir * Math.PI / 180)) / 
                      (111320 * Math.cos(landingPoint.lat * Math.PI / 180));
      
      closestPoint = {
        time: flightTime,
        lat: landingPoint.lat + driftLat,
        lon: landingPoint.lon + driftLon,
        altitude: 0 // On ground
      };
    }

    // Apply scenario-specific modifications
    const modifiedPoint = this.applyScenarioModifications(closestPoint, flightTime);
    
    // Add realistic noise
    const noisyPoint = this.addRealisticNoise(modifiedPoint, flightTime);

    // Ensure final data points are more stable for landed balloons
    if (noisyPoint.altitude < 100) {
      noisyPoint.altitude = Math.max(0, noisyPoint.altitude);
      
      // Reduce noise for ground-level balloons
      const groundNoise = this.config.noiseLevel * 0.3; // Reduced noise on ground
      const latSeed = Math.sin(flightTime * 2.345) * Math.cos(flightTime * 1.876);
      const lonSeed = Math.sin(flightTime * 3.456) * Math.cos(flightTime * 2.987);
      
      noisyPoint.lat += latSeed * groundNoise * 0.000005; // ~0.5m noise
      noisyPoint.lng += lonSeed * groundNoise * 0.000005;
    }

    return {
      time: timestamp,
      lat: noisyPoint.lat,
      lng: noisyPoint.lon,
      altitude: noisyPoint.altitude,
      speed: this.calculateSpeed(noisyPoint, flightTime),
      course: this.calculateCourse(noisyPoint, flightTime),
      comment: this.generateComment(noisyPoint, flightTime)
    };
  }

  /**
   * Apply scenario-specific modifications to predicted points
   * Based on real balloon flight data from amateur radio balloon tracking
   */
  private applyScenarioModifications(point: any, flightTime: number): any {
    const modified = { ...point };

    // Get actual wind conditions from weather data
    const windData = this.interpolateWind(point.altitude, flightTime);
    
    // Calculate realistic atmospheric variations
    const altitudeKm = point.altitude / 1000;
    const timeHours = flightTime / 3600;
    
    // Base atmospheric effects that apply to all scenarios
    const atmosphericFactor = this.calculateAtmosphericEffects(altitudeKm, timeHours);
    
    // Calculate wind drift once for all scenarios
    const windDrift = this.calculateWindDrift(point, windData, flightTime);
    
    switch (this.config.scenario) {
      case 'early_burst': {
        // Based on real balloon data: UV degradation and material stress
        // Leo Bodnar's flights show balloons sometimes burst at 70-85% predicted altitude
        const uvDegradation = Math.min(1, timeHours / 1.5); // UV effects over 1.5 hours
        const stressFactor = Math.pow(point.altitude / this.launchParams.burstAltitude, 2.5);
        
        // More realistic burst conditions based on actual flight data
        const burstSeed = Math.sin(flightTime * 0.654321) * 0.5 + 0.5;
        if (stressFactor > 0.75 && burstSeed < uvDegradation * 0.15) {
          // Burst at 75-85% of predicted altitude (realistic range)
          const actualBurstAltitude = point.altitude;
          
          // Calculate descent trajectory based on real parachute behavior
          if (flightTime > this.originalPrediction.burstPoint.time * 0.75) {
            const descentTime = flightTime - (this.originalPrediction.burstPoint.time * 0.75);
            
            // Real balloons often have irregular descent patterns
            const descentVariation = 1 + 0.3 * Math.sin(descentTime / 120); // 2-minute oscillations
            const actualDescentRate = this.launchParams.descentRate * descentVariation;
            
            modified.altitude = Math.max(0, actualBurstAltitude - actualDescentRate * descentTime);
            
            // Wind effects are stronger during descent (lower air density)
            const descentWindFactor = 1.5;
            modified.lat += windDrift.latDrift * descentWindFactor;
            modified.lon += windDrift.lonDrift * descentWindFactor;
          }
        }
        break;
      }

      case 'wind_shear': {
        // Based on Leo Bodnar B-6 flight: severe weather caused 2000m altitude drops
        const jetStreamAltitude = 10000; // Jet stream at ~30,000ft
        const proximityToJet = Math.exp(-Math.pow((point.altitude - jetStreamAltitude) / 2500, 2));
        
        // Turbulent weather patterns from real flight data
        const turbulenceIntensity = proximityToJet * (1 + Math.sin(flightTime / 900) * 0.5);
        const severeWeatherSeed = Math.sin(flightTime * 0.123) * 0.5 + 0.5;
        
        if (severeWeatherSeed > 0.85 && turbulenceIntensity > 0.6) {
          // Simulate dramatic altitude drops like B-6 experienced
          const altitudeDrop = 1500 * turbulenceIntensity; // Up to 1500m drop
          modified.altitude = Math.max(point.altitude - altitudeDrop, point.altitude * 0.7);
        }
        
        // Enhanced wind shear effects
        const shearIntensity = proximityToJet * (1 + Math.sin(flightTime / 600) * 0.4);
        const windDirection = 90 + Math.sin(flightTime / 800) * 60; // ±60° variation
        
        const windSpeed = 25 * shearIntensity; // Up to 25 m/s in shear layers
        const windDriftLat = (windSpeed * Math.cos(windDirection * Math.PI / 180) * flightTime) / 111320;
        const windDriftLon = (windSpeed * Math.sin(windDirection * Math.PI / 180) * flightTime) / 
                            (111320 * Math.cos(point.lat * Math.PI / 180));
        
        modified.lat += windDriftLat * 0.00015; // More pronounced drift
        modified.lon += windDriftLon * 0.00015;
        break;
      }

      case 'slow_ascent': {
        // Based on B-6 flight: balloons can take much longer to reach altitude
        // Thermal effects and balloon stretching create complex ascent profiles
        const thermalEffect = Math.sin((timeHours * 2 * Math.PI) / 24) * 0.4; // Stronger diurnal cycle
        const balloonStretching = Math.min(0.3, timeHours / 8); // Balloon stretches over time
        
        if (point.altitude > this.launchParams.launchAltitude) {
          const ascentProgress = (point.altitude - this.launchParams.launchAltitude) / 
                               (this.launchParams.burstAltitude - this.launchParams.launchAltitude);
          
          // Real balloons show non-linear ascent due to envelope stretching
          const stretchingEffect = 1 - balloonStretching * (1 - ascentProgress);
          const efficiencyFactor = stretchingEffect * (1 + thermalEffect);
          
          // Night vs day altitude variations (B-6 showed 500m altitude swings)
          const timeOfDay = (timeHours % 24);
          const isNight = timeOfDay < 6 || timeOfDay > 18;
          const dailyVariation = isNight ? -200 : 300; // Lower at night, higher during day
          
          modified.altitude = this.launchParams.launchAltitude + 
                            (this.launchParams.burstAltitude - this.launchParams.launchAltitude) * 
                            ascentProgress * efficiencyFactor + dailyVariation;
        }
        break;
      }

      case 'fast_descent': {
        // Based on real balloon data: parachute tangles, partial deployment, or damage
        if (flightTime > this.originalPrediction.burstPoint.time) {
          const burstPoint = this.originalPrediction.burstPoint;
          const descentTime = flightTime - burstPoint.time;
          
          // Real scenarios: tangled chute, damaged lines, or partial deployment
          const parachuteFault = Math.sin(flightTime * 0.234567) * 0.5 + 0.5;
          let descentMultiplier = 1;
          
          if (parachuteFault > 0.8) {
            descentMultiplier = 3; // Chute tangled - nearly free fall
          } else if (parachuteFault > 0.6) {
            descentMultiplier = 2; // Partial deployment
          } else {
            descentMultiplier = 1.5; // Faster than normal
          }
          
          const actualDescentRate = this.launchParams.descentRate * descentMultiplier;
          modified.altitude = Math.max(0, burstPoint.altitude - actualDescentRate * descentTime);
          
          // High descent rate creates more wind drift
          const fastDescentDrift = descentMultiplier * 0.5;
          modified.lat += windDrift.latDrift * fastDescentDrift;
          modified.lon += windDrift.lonDrift * fastDescentDrift;
        }
        break;
      }

      case 'standard':
      default: {
        // Even standard flights have variations based on real balloon behavior
        const standardVariation = this.calculateStandardVariations(point, flightTime);
        modified.lat += standardVariation.latOffset;
        modified.lon += standardVariation.lonOffset;
        modified.altitude += standardVariation.altOffset;
        
        // Add realistic float behavior at high altitude (common in real balloons)
        if (point.altitude > this.launchParams.burstAltitude * 0.9) {
          const floatVariation = Math.sin(flightTime / 1800) * 100; // ±100m float variation
          modified.altitude += floatVariation;
        }
        break;
      }
    }

    // Apply realistic wind drift based on weather data (already calculated above)
    modified.lat += windDrift.latDrift;
    modified.lon += windDrift.lonDrift;
    
    // Apply atmospheric effects to all scenarios
    modified.lat += atmosphericFactor.latDrift;
    modified.lon += atmosphericFactor.lonDrift;
    modified.altitude *= atmosphericFactor.pressureFactor;

    // Ensure altitude never goes negative or above reasonable limits
    modified.altitude = Math.max(0, Math.min(modified.altitude, 50000));

    return modified;
  }

  /**
   * Interpolate wind data from weather conditions (same as prediction service)
   */
  private interpolateWind(altitude: number, currentTime: number): { speed: number; direction: number } {
    if (!this.weatherData) {
      // Fallback to simple atmospheric effects if no weather data
      return this.calculateSimpleWind(altitude, currentTime);
    }

    const currentPressure = altitudeToPressure(altitude);
    
    // Find the correct time index from the weather data
    const launchTimestamp = new Date(this.launchParams.launchTime).getTime();
    const currentTimestamp = launchTimestamp + currentTime * 1000;
    
    let timeIndex = this.weatherData.hourly.time.length - 1;
    // Find the index of the hourly forecast that is just before or at the current simulation time
    for (let i = 0; i < this.weatherData.hourly.time.length; i++) {
      if (new Date(this.weatherData.hourly.time[i]).getTime() > currentTimestamp) {
        // We've gone past the current time, so the previous index is the correct one.
        timeIndex = Math.max(0, i - 1);
        break;
      }
    }

    let upperLevel = { p: -1, speed: 0, dir: 0 };
    let lowerLevel = { p: 1001, speed: 0, dir: 0 };
    
    const hourlyData = this.weatherData.hourly;

    for (const p of PRESSURE_LEVELS) {
      const speed = hourlyData[`windspeed_${p}hPa`]?.[timeIndex] ?? null;
      const direction = hourlyData[`winddirection_${p}hPa`]?.[timeIndex] ?? null;

      if (speed === null || direction === null) continue;

      if (typeof speed !== 'number' || typeof direction !== 'number') {
          continue;
      }

      if (p >= currentPressure && (lowerLevel.p === 1001 || p < lowerLevel.p)) {
        lowerLevel = { p, speed, dir: direction };
      }
      if (p <= currentPressure && (upperLevel.p === -1 || p > upperLevel.p)) {
        upperLevel = { p, speed, dir: direction };
      }
    }

    if (upperLevel.p === -1) return { speed: lowerLevel.speed, direction: lowerLevel.dir };
    if (lowerLevel.p === 1001) return { speed: upperLevel.speed, direction: upperLevel.dir };
    if (lowerLevel.p === upperLevel.p) return { speed: lowerLevel.speed, direction: lowerLevel.dir };

    const range = lowerLevel.p - upperLevel.p;
    const weight = (currentPressure - upperLevel.p) / range;
    
    const speed = upperLevel.speed * (1 - weight) + lowerLevel.speed * weight;
    
    let dir_diff = lowerLevel.dir - upperLevel.dir;
    if (dir_diff > 180) dir_diff -= 360;
    if (dir_diff < -180) dir_diff += 360;
    
    const direction = (upperLevel.dir + dir_diff * weight + 360) % 360;

    return { speed, direction };
  }

  /**
   * Fallback wind calculation when no weather data is available
   */
  private calculateSimpleWind(altitude: number, currentTime: number): { speed: number; direction: number } {
    const altitudeKm = altitude / 1000;
    const timeHours = currentTime / 3600;
    
    // Simple wind model based on altitude
    let windSpeed = 5 + altitudeKm * 2; // Increases with altitude
    let windDirection = 270 + Math.sin(timeHours * 0.1) * 30; // Generally westerly with variation
    
    // Jet stream effects around 10km
    if (altitudeKm > 8 && altitudeKm < 12) {
      windSpeed += 20 * Math.exp(-Math.pow((altitudeKm - 10) / 2, 2));
      windDirection = 270 + Math.sin(timeHours * 0.05) * 15; // More consistent westerly
    }
    
    return { speed: windSpeed, direction: windDirection };
  }

  /**
   * Calculate wind drift based on weather data (same as prediction service)
   */
  private calculateWindDrift(point: any, windData: { speed: number; direction: number }, flightTime: number): { latDrift: number; lonDrift: number } {
    const TIME_STEP_S = this.config.beaconInterval; // Use beacon interval as time step
    const EARTH_RADIUS_M = 6371000;
    
    const distance = windData.speed * TIME_STEP_S;
    const bearing = windData.direction * (Math.PI / 180);

    const latRad = point.lat * (Math.PI / 180);

    const dLat = (distance / EARTH_RADIUS_M) * Math.cos(bearing);
    const dLon = (distance / EARTH_RADIUS_M) * Math.sin(bearing) / Math.cos(latRad);

    const latDrift = dLat * (180 / Math.PI);
    const lonDrift = dLon * (180 / Math.PI);

    return { latDrift, lonDrift };
  }

  /**
   * Calculate realistic atmospheric effects
   */
  private calculateAtmosphericEffects(altitudeKm: number, timeHours: number): any {
    // Coriolis effect (very small but realistic)
    const coriolisEffect = Math.sin(this.launchParams.lat * Math.PI / 180) * 0.0001;
    
    // Pressure variations with altitude
    const pressureFactor = Math.exp(-altitudeKm / 8.4); // Scale height ~8.4km
    
    // Atmospheric waves and turbulence
    const turbulence = Math.sin(timeHours * 2 * Math.PI + altitudeKm) * 0.00005;
    
    return {
      latDrift: coriolisEffect + turbulence,
      lonDrift: turbulence * 2,
      pressureFactor: 0.98 + pressureFactor * 0.02 // Small pressure-related altitude variation
    };
  }

  /**
   * Calculate standard flight variations
   */
  private calculateStandardVariations(point: any, flightTime: number): any {
    // Small random variations that accumulate over time
    const timeVariation = Math.sin(flightTime / 300) * 0.00002; // 5-minute cycle
    const altitudeVariation = Math.cos(flightTime / 450) * 0.00001; // 7.5-minute cycle
    
    // Wind gusts and micro-weather effects - use deterministic "random" based on time
    const gustSeed = Math.sin(flightTime * 1.234567) * Math.cos(flightTime * 0.987654);
    const gustEffect = gustSeed * 0.00001;
    
    // Deterministic altitude variation based on time
    const altSeed = Math.sin(flightTime * 2.345678) * Math.cos(flightTime * 1.876543);
    const altOffset = altSeed * 10; // ±10m altitude variation
    
    return {
      latOffset: timeVariation + gustEffect,
      lonOffset: altitudeVariation + gustEffect * 1.5,
      altOffset: altOffset
    };
  }

  /**
   * Add realistic noise to position data
   */
  private addRealisticNoise(point: any, flightTime: number): any {
    const noiseLevel = this.config.noiseLevel;
    
    // GPS accuracy noise (decreases with altitude)
    const altitudeFactor = Math.min(1, point.altitude / 10000); // Better accuracy at higher altitudes
    const gpsNoise = (1 - altitudeFactor * 0.5) * noiseLevel;
    
    // Deterministic noise based on time - use different seeds for each component
    const latSeed = Math.sin(flightTime * 3.14159 + 1.23) * Math.cos(flightTime * 2.71828 + 4.56);
    const lonSeed = Math.sin(flightTime * 1.41421 + 7.89) * Math.cos(flightTime * 1.73205 + 2.34);
    const altSeed = Math.sin(flightTime * 2.23607 + 5.67) * Math.cos(flightTime * 1.61803 + 8.90);
    
    // Position noise (meters)
    const latNoise = latSeed * gpsNoise * 0.00001; // ~1m per 0.00001 degrees
    const lonNoise = lonSeed * gpsNoise * 0.00001;
    
    // Altitude noise (meters)
    const altitudeNoise = altSeed * noiseLevel * 50; // Up to 50m noise
    
    return {
      lat: point.lat + latNoise,
      lon: point.lon + lonNoise,
      altitude: Math.max(0, point.altitude + altitudeNoise)
    };
  }

  /**
   * Calculate realistic speed based on position and flight time
   */
  private calculateSpeed(point: any, flightTime: number): number {
    // Simplified speed calculation
    if (flightTime < 60) return 0; // No speed data for first minute
    
    const prevPosition = this.positions[this.positions.length - 1];
    if (!prevPosition) return 0;
    
    const distance = this.haversine(
      prevPosition.lat, prevPosition.lng,
      point.lat, point.lon
    );
    
    const timeSpan = this.config.beaconInterval;
    return distance / timeSpan; // m/s
  }

  /**
   * Calculate course based on movement direction
   */
  private calculateCourse(point: any, flightTime: number): number {
    if (flightTime < 60) return 0;
    
    const prevPosition = this.positions[this.positions.length - 1];
    if (!prevPosition) return 0;
    
    return this.calculateBearing(
      prevPosition.lat, prevPosition.lng,
      point.lat, point.lon
    );
  }

  /**
   * Generate realistic APRS comment
   */
  private generateComment(point: any, flightTime: number): string {
    const phase = this.determineFlightPhase(point, flightTime);
    const battery = Math.max(20, 100 - (flightTime / 3600) * 10); // Battery decreases over time
    
    return `${phase} Alt=${Math.round(point.altitude)}m Bat=${battery.toFixed(0)}%`;
  }

  /**
   * Determine flight phase for comment generation
   */
  private determineFlightPhase(point: any, flightTime: number): string {
    if (flightTime < 300) return 'LAUNCH';
    if (point.altitude < 1000) return 'LANDED';
    if (flightTime > this.originalPrediction.burstPoint.time) return 'DESC';
    return 'ASC';
  }

  /**
   * Haversine distance calculation
   */
  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
   * Calculate bearing between two points
   */
  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => deg * Math.PI / 180;
    const toDeg = (rad: number) => rad * 180 / Math.PI;
    
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - 
              Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  /**
   * Determine if beaconing should stop (simulate beacon loss at low altitude)
   */
  private shouldStopBeaconing(position: APRSPosition, currentTime: number): boolean {
    const altitude = position.altitude || 0;
    const flightTime = currentTime - this.config.startTime;
    
    // Stop beaconing if at low altitude (< 1000m) and in descent phase
    if (altitude < 1000 && flightTime > this.originalPrediction.burstPoint.time) {
      // Use deterministic chance based on altitude - lower altitude = higher chance of beacon loss
      const lossChance = (1000 - altitude) / 1000; // 0 to 1
      const lossSeed = Math.sin(currentTime * 0.987654) * 0.5 + 0.5; // 0 to 1
      
      return lossSeed < lossChance * 0.1; // 10% chance at ground level
    }
    
    return false;
  }

  /**
   * Check if balloon should be assumed landed due to missing beacons
   */
  private checkForAssumedLanding(lastPosition: APRSPosition, currentTime: number): void {
    if (this.config.assumedLanded) return;
    
    const timeSinceLastBeacon = currentTime - (this.config.lastBeaconTime || lastPosition.time);
    const missedBeacons = timeSinceLastBeacon / this.config.beaconInterval;
    const altitude = lastPosition.altitude || 0;
    
    // Assume landed if at low altitude and missed 3+ beacon intervals
    if (altitude < 1000 && missedBeacons >= 3) {
      this.config.assumedLanded = true;
      
      // Use original prediction's landing point as the assumed location
      this.config.assumedLandingLocation = {
        lat: this.originalPrediction.landingPoint.lat,
        lng: this.originalPrediction.landingPoint.lon,
        time: currentTime
      };
    }
  }

  /**
   * Update simulation time
   */
  updateTime(newTime: number): void {
    this.config.currentTime = newTime;
  }

  /**
   * Get current simulation configuration
   */
  getConfig(): DummyFlightConfig {
    return { ...this.config };
  }

  /**
   * Update simulation configuration
   */
  updateConfig(updates: Partial<DummyFlightConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

/**
 * Create a default dummy flight configuration
 */
export function createDefaultDummyConfig(): DummyFlightConfig {
  const now = Date.now() / 1000;
  return {
    enabled: false,
    scenario: 'standard',
    beaconInterval: 120, // 2 minutes
    startTime: now,
    currentTime: now,
    noiseLevel: 0.3 // 30% noise
  };
}

/**
 * Create dummy flight simulator with default settings
 */
export function createDummyFlightSimulator(
  launchParams: LaunchParams,
  originalPrediction: PredictionResult,
  config?: Partial<DummyFlightConfig>,
  weatherData?: WeatherData | null
): DummyFlightSimulator {
  const defaultConfig = createDefaultDummyConfig();
  const finalConfig = { ...defaultConfig, ...config };
  
  return new DummyFlightSimulator(finalConfig, launchParams, originalPrediction, weatherData);
} 