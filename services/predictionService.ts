import { LaunchParams, WeatherData, FlightPoint, PredictionResult, CalculatorParams, CalculationBreakdown, CalculationStep, GoalCalculationResult, GoalCalculationOption } from '../types';
import { 
  EARTH_RADIUS_M, 
  TIME_STEP_S, 
  PRESSURE_LEVELS,
  GRAVITY_MS2,
  AIR_DENSITY_SEA_LEVEL_KGM3,
  GAS_DENSITY_HELIUM_KGM3,
  GAS_DENSITY_HYDROGEN_KGM3,
  BALLOON_DRAG_COEFFICIENT,
  AVG_STRATOSPHERE_TEMP_K,
  SEA_LEVEL_TEMP_K,
} from '../constants';

// Standard atmosphere model to estimate pressure from altitude
// This is a simplified model for interpolation.
export const altitudeToPressure = (alt_m: number): number => {
  if (alt_m <= 11000) { // Troposphere
    return 1013.25 * Math.pow(1 - (0.0065 * alt_m) / 288.15, 5.255);
  } else if (alt_m <= 20000) { // Lower Stratosphere
    return 226.32 * Math.exp(-0.000157 * (alt_m - 11000));
  } else { // Upper Stratosphere
    return 54.74 * Math.pow(1 - (-0.0028 * (alt_m - 20000)) / 216.65, -12.201);
  }
};

// Inversion of the standard atmosphere model to get altitude from pressure
const pressureToAltitude = (pressure_hPa: number): number => {
  if (pressure_hPa > 226.32) { // Troposphere (up to 11km)
    return (288.15 / 0.0065) * (1 - Math.pow(pressure_hPa / 1013.25, 1 / 5.255));
  } else if (pressure_hPa > 54.74) { // Lower Stratosphere (11km to 20km)
    return 11000 - (1 / 0.000157) * Math.log(pressure_hPa / 226.32);
  } else { // Upper Stratosphere (above 20km)
    return 20000 + (216.65 / 0.0028) * (Math.pow(pressure_hPa / 54.74, -1 / 12.201) - 1);
  }
};


const interpolateWind = (altitude: number, currentTime: number, weatherData: WeatherData, launchTime: string): { speed: number; direction: number } => {
  const currentPressure = altitudeToPressure(altitude);
  
  // Find the correct time index from the weather data
  const launchTimestamp = new Date(launchTime).getTime();
  const currentTimestamp = launchTimestamp + currentTime * 1000;
  
  let timeIndex = weatherData.hourly.time.length - 1;
  // Find the index of the hourly forecast that is just before or at the current simulation time
  for (let i = 0; i < weatherData.hourly.time.length; i++) {
    if (new Date(weatherData.hourly.time[i]).getTime() > currentTimestamp) {
      // We've gone past the current time, so the previous index is the correct one.
      timeIndex = Math.max(0, i - 1);
      break;
    }
  }

  let upperLevel = { p: -1, speed: 0, dir: 0 };
  let lowerLevel = { p: 1001, speed: 0, dir: 0 };
  
  const hourlyData = weatherData.hourly;

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
};

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const R = 6371e3; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const runPredictionSimulation = (params: LaunchParams, weatherData: WeatherData): PredictionResult => {
  const path: FlightPoint[] = [];
  let currentTime = 0;
  let currentLat = params.lat;
  let currentLon = params.lon;
  let currentAltitude = params.launchAltitude;

  const launchPoint: FlightPoint = { time: 0, lat: currentLat, lon: currentLon, altitude: currentAltitude };
  path.push(launchPoint);

  // Ascent phase
  while (currentAltitude < params.burstAltitude) {
    currentAltitude += params.ascentRate * TIME_STEP_S;
    if (currentAltitude > params.burstAltitude) {
        currentAltitude = params.burstAltitude;
    }
    currentTime += TIME_STEP_S;

    const { speed, direction } = interpolateWind(currentAltitude, currentTime, weatherData, params.launchTime);
    const distance = speed * TIME_STEP_S;
    const bearing = direction * (Math.PI / 180);

    const latRad = currentLat * (Math.PI / 180);
    const lonRad = currentLon * (Math.PI / 180);

    const dLat = (distance / EARTH_RADIUS_M) * Math.cos(bearing);
    const newLatRad = latRad + dLat;

    const dLon = (distance / EARTH_RADIUS_M) * Math.sin(bearing) / Math.cos(latRad);
    const newLonRad = lonRad + dLon;

    currentLat = newLatRad * (180 / Math.PI);
    currentLon = newLonRad * (180 / Math.PI);
    
    path.push({ time: currentTime, lat: currentLat, lon: currentLon, altitude: currentAltitude });
  }

  const burstPoint: FlightPoint = path[path.length - 1];

  // Descent phase
  while (currentAltitude > 0) {
    currentAltitude -= params.descentRate * TIME_STEP_S;
     if (currentAltitude < 0) {
        currentAltitude = 0;
    }
    currentTime += TIME_STEP_S;

    const { speed, direction } = interpolateWind(currentAltitude, currentTime, weatherData, params.launchTime);
    const distance = speed * TIME_STEP_S;
    const bearing = direction * (Math.PI / 180);

    const latRad = currentLat * (Math.PI / 180);
    const lonRad = currentLon * (Math.PI / 180);

    const dLat = (distance / EARTH_RADIUS_M) * Math.cos(bearing);
    const newLatRad = latRad + dLat;

    const dLon = (distance / EARTH_RADIUS_M) * Math.sin(bearing) / Math.cos(latRad);
    const newLonRad = lonRad + dLon;
    
    currentLat = newLatRad * (180 / Math.PI);
    currentLon = newLonRad * (180 / Math.PI);
    
    path.push({ time: currentTime, lat: currentLat, lon: currentLon, altitude: currentAltitude });
  }

  const landingPoint: FlightPoint = path[path.length-1];

  // Calculate maxAltitude, total distance, and flightDuration
  const maxAltitude = path.reduce((max, p) => Math.max(max, p.altitude), -Infinity);
  let distance = 0;
  for (let i = 1; i < path.length; i++) {
    distance += haversine(path[i-1].lat, path[i-1].lon, path[i].lat, path[i].lon);
  }
  const flightDuration = currentTime; // seconds

  return {
    path,
    launchPoint,
    burstPoint,
    landingPoint,
    totalTime: currentTime,
    maxAltitude: isFinite(maxAltitude) ? maxAltitude : 0,
    distance: isFinite(distance) ? distance : 0,
    flightDuration: isFinite(flightDuration) ? flightDuration : 0
  };
};

export const calculateFlightPerformance = (
  params: CalculatorParams,
  launchAltitude: number
): CalculationBreakdown | null => {
  const { payloadWeight, balloonWeight, parachuteWeight, neckLift, gas } = params;
  
  if (balloonWeight <= 0) return null;

  const steps: CalculationStep[] = [];

  // 1. Masses and Lifts (in kg)
  const totalMassKg = (payloadWeight + balloonWeight + parachuteWeight) / 1000;
  const neckLiftKg = neckLift / 1000;
  const grossLiftKg = totalMassKg + neckLiftKg;
  steps.push({
      name: "Total Mass",
      formula: "Mass_total = (W_payload + W_balloon + W_parachute) / 1000",
      calculation: `Mass_total = (${payloadWeight} + ${balloonWeight} + ${parachuteWeight}) / 1000`,
      result: totalMassKg.toFixed(3),
      unit: "kg",
  });
  steps.push({
      name: "Gross Lift",
      formula: "Lift_gross = Mass_total + (Lift_neck / 1000)",
      calculation: `Lift_gross = ${totalMassKg.toFixed(3)} + (${neckLift} / 1000)`,
      result: grossLiftKg.toFixed(3),
      unit: "kg",
  });

  // 2. Gas properties
  const gasDensity = gas === 'Helium' ? GAS_DENSITY_HELIUM_KGM3 : GAS_DENSITY_HYDROGEN_KGM3;
  const liftPerM3 = AIR_DENSITY_SEA_LEVEL_KGM3 - gasDensity;
  steps.push({
      name: "Gas Lift per m³",
      formula: "Lift_per_m³ = ρ_air - ρ_gas",
      calculation: `Lift_per_m³ = ${AIR_DENSITY_SEA_LEVEL_KGM3} - ${gasDensity}`,
      result: liftPerM3.toFixed(3),
      unit: "kg/m³",
  });

  // 3. Volume and Radius at Launch
  const gasVolumeLaunchM3 = grossLiftKg / liftPerM3;
  const balloonRadiusLaunchM = Math.pow((3 * gasVolumeLaunchM3) / (4 * Math.PI), 1 / 3);
  steps.push({
      name: "Gas Volume at Launch",
      formula: "V_launch = Lift_gross / Lift_per_m³",
      calculation: `V_launch = ${grossLiftKg.toFixed(3)} / ${liftPerM3.toFixed(3)}`,
      result: gasVolumeLaunchM3.toFixed(3),
      unit: "m³",
  });
  steps.push({
      name: "Balloon Radius at Launch",
      formula: "r_launch = (3 * V_launch / (4 * π))^(1/3)",
      calculation: `r_launch = (3 * ${gasVolumeLaunchM3.toFixed(3)} / (4 * π))^(1/3)`,
      result: balloonRadiusLaunchM.toFixed(3),
      unit: "m",
  });

  // 4. Calculate Ascent Rate (m/s)
  const netLiftForceN = neckLiftKg * GRAVITY_MS2;
  const ascentRate = Math.pow(
    (2 * netLiftForceN) / (AIR_DENSITY_SEA_LEVEL_KGM3 * Math.PI * Math.pow(balloonRadiusLaunchM, 2) * BALLOON_DRAG_COEFFICIENT),
    0.5
  );
  steps.push({
      name: "Ascent Rate",
      formula: "v_ascent = (2 * F_net / (ρ_air * π * r_launch² * C_d)) ^ 0.5",
      calculation: `v_ascent = (2 * (${neckLiftKg.toFixed(3)} * ${GRAVITY_MS2}) / (${AIR_DENSITY_SEA_LEVEL_KGM3} * π * ${balloonRadiusLaunchM.toFixed(3)}² * ${BALLOON_DRAG_COEFFICIENT})) ^ 0.5`,
      result: ascentRate.toFixed(3),
      unit: "m/s",
  });

  // 5. Calculate Burst Altitude (m)
  // 5a. Empirical formula for burst radius from balloon weight
  const burstRadiusM = 0.479 * Math.pow(balloonWeight, 0.3115);
  const burstVolumeM3 = (4 / 3) * Math.PI * Math.pow(burstRadiusM, 3);
  steps.push({
      name: "Burst Radius (Empirical)",
      formula: "r_burst = 0.479 * W_balloon ^ 0.3115",
      calculation: `r_burst = 0.479 * ${balloonWeight} ^ 0.3115`,
      result: burstRadiusM.toFixed(3),
      unit: "m",
  });
  steps.push({
      name: "Burst Volume",
      formula: "V_burst = (4/3) * π * r_burst³",
      calculation: `V_burst = (4/3) * π * ${burstRadiusM.toFixed(3)}³`,
      result: burstVolumeM3.toFixed(3),
      unit: "m³",
  });
  
  // 5b. Pressure at launch and burst (using Combined Gas Law)
  const pressureAtLaunchHpa = altitudeToPressure(launchAltitude);
  const pressureAtBurstHpa =
    pressureAtLaunchHpa *
    (gasVolumeLaunchM3 / burstVolumeM3) *
    (AVG_STRATOSPHERE_TEMP_K / SEA_LEVEL_TEMP_K);
  steps.push({
      name: "Pressure at Burst",
      formula: "P_burst = P_launch * (V_launch / V_burst) * (T_burst / T_launch)",
      calculation: `P_burst = ${pressureAtLaunchHpa.toFixed(2)} * (${gasVolumeLaunchM3.toFixed(3)} / ${burstVolumeM3.toFixed(3)}) * (${AVG_STRATOSPHERE_TEMP_K} / ${SEA_LEVEL_TEMP_K})`,
      result: pressureAtBurstHpa.toFixed(3),
      unit: "hPa",
  });

  // 5c. Altitude from pressure
  const burstAltitude = pressureToAltitude(pressureAtBurstHpa);
  steps.push({
      name: "Burst Altitude",
      formula: "Alt_burst = f(P_burst)",
      calculation: `Alt_burst = f(${pressureAtBurstHpa.toFixed(3)})`,
      result: Math.round(burstAltitude).toLocaleString(),
      unit: "m",
  });

  if (isNaN(ascentRate) || isNaN(burstAltitude) || burstAltitude < 0) return null;

  return { steps, ascentRate, burstAltitude };
};

/**
 * Find payload weight and neck lift combinations for fixed balloon/parachute to achieve target burst altitude
 */
export const calculateGoalOptions = (
  targetBurstAltitude: number,
  balloonWeight: number,
  parachuteWeight: number,
  gas: 'Helium' | 'Hydrogen',
  launchAltitude: number
): GoalCalculationResult => {
  const warnings: string[] = [];
  const options: GoalCalculationOption[] = [];
  
  // Validate target altitude
  if (targetBurstAltitude < 5000) {
    warnings.push('Target burst altitude is very low. Consider higher altitude for better performance.');
  }
  if (targetBurstAltitude > 45000) {
    warnings.push('Target burst altitude is very high. May require specialized equipment.');
  }
  
  // Calculate burst characteristics for this balloon weight
  const burstRadius = 0.479 * Math.pow(balloonWeight, 0.3115);
  const burstVolume = (4 / 3) * Math.PI * Math.pow(burstRadius, 3);
  
  // Calculate pressure requirements
  const targetPressure = altitudeToPressure(targetBurstAltitude);
  const pressureAtLaunch = altitudeToPressure(launchAltitude);
  const temperatureRatio = AVG_STRATOSPHERE_TEMP_K / SEA_LEVEL_TEMP_K;
  
  // Calculate required volume ratio: V_launch / V_burst = (P_burst / P_launch) / (T_burst / T_launch)
  const requiredVolumeRatio = (targetPressure / pressureAtLaunch) / temperatureRatio;
  
  if (requiredVolumeRatio <= 0 || requiredVolumeRatio >= 1) {
    warnings.push('Target altitude may not be achievable with this balloon size.');
    return { targetBurstAltitude, options: [], warnings };
  }
  
  // Calculate required launch volume
  const requiredLaunchVolume = burstVolume * requiredVolumeRatio;
  
  // Gas properties
  const gasDensity = gas === 'Helium' ? GAS_DENSITY_HELIUM_KGM3 : GAS_DENSITY_HYDROGEN_KGM3;
  const liftPerM3 = AIR_DENSITY_SEA_LEVEL_KGM3 - gasDensity;
  
  // Calculate required gross lift
  const requiredGrossLiftKg = requiredLaunchVolume * liftPerM3;
  
  // Try different neck lift values (realistic range: 200g to 2000g)
  const neckLiftOptions = [200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 1800, 2000]; // grams
  
  for (const neckLift of neckLiftOptions) {
    try {
      const neckLiftKg = neckLift / 1000;
      
      // Calculate required total system weight
      const totalSystemWeightKg = requiredGrossLiftKg - neckLiftKg;
      const totalSystemWeightG = totalSystemWeightKg * 1000;
      
      // Calculate required payload weight
      const requiredPayloadWeight = totalSystemWeightG - balloonWeight - parachuteWeight;
      
      // Skip if payload weight is unrealistic
      if (requiredPayloadWeight < 100 || requiredPayloadWeight > 5000) {
        continue; // Skip impractical payload weights
      }
      
      // Skip if neck lift is outside realistic amateur balloon ranges
      if (neckLift < 200 || neckLift > 2000) {
        continue; // Skip impractical neck lift values
      }
      
      // Create test parameters to verify actual performance
      const testParams: CalculatorParams = {
        payloadWeight: requiredPayloadWeight,
        balloonWeight,
        parachuteWeight,
        neckLift,
        gas
      };
      
      const testResult = calculateFlightPerformance(testParams, launchAltitude);
      if (!testResult) continue;
      
      // Check how close we got to target
      const altitudeDifference = Math.abs(testResult.burstAltitude - targetBurstAltitude);
      const altitudeAccuracy = 1 - (altitudeDifference / targetBurstAltitude);
      
      if (altitudeAccuracy < 0.85) continue; // Skip if we're off by more than 15%
      
      // Determine feasibility
      let feasibility: 'excellent' | 'good' | 'marginal' | 'poor' = 'poor';
      let notes = '';
      
      if (altitudeAccuracy > 0.98) {
        feasibility = 'excellent';
      } else if (altitudeAccuracy > 0.95) {
        feasibility = 'good';
      } else if (altitudeAccuracy > 0.90) {
        feasibility = 'marginal';
        notes = 'Altitude accuracy within 10% of target';
      }
      
      // Check ascent rate reasonableness
      if (testResult.ascentRate < 3) {
        feasibility = feasibility === 'excellent' ? 'good' : 'marginal';
        notes += notes ? '; ' : '';
        notes += 'Slow ascent rate may affect accuracy';
      } else if (testResult.ascentRate > 8) {
        feasibility = feasibility === 'excellent' ? 'good' : 'marginal';
        notes += notes ? '; ' : '';
        notes += 'Fast ascent rate may cause early burst';
      }
      
      // Check payload weight reasonableness
      if (requiredPayloadWeight > 3000) {
        feasibility = feasibility === 'excellent' ? 'good' : 'marginal';
        notes += notes ? '; ' : '';
        notes += 'Heavy payload may stress balloon';
      }
      
      // Check neck lift reasonableness
      if (neckLift < 300) {
        notes += notes ? '; ' : '';
        notes += 'Low neck lift may cause slow ascent';
      } else if (neckLift > 1500) {
        notes += notes ? '; ' : '';
        notes += 'High neck lift may cause fast ascent';
      }
      
      // Create description based on payload weight and lift characteristics
      let description = '';
      if (requiredPayloadWeight < 500) {
        description = 'Light payload - good for basic tracking';
      } else if (requiredPayloadWeight < 1500) {
        description = 'Medium payload - suitable for cameras and sensors';
      } else if (requiredPayloadWeight < 3000) {
        description = 'Heavy payload - for complex scientific instruments';
      } else {
        description = 'Very heavy payload - requires careful balloon selection';
      }
      
      // Add lift description
      if (neckLift < 500) {
        description += ' (low lift)';
      } else if (neckLift < 1000) {
        description += ' (moderate lift)';
      } else {
        description += ' (high lift)';
      }
      
      options.push({
        payloadWeight: requiredPayloadWeight,
        neckLift,
        totalSystemWeight: totalSystemWeightG,
        ascentRate: testResult.ascentRate,
        burstAltitude: testResult.burstAltitude,
        description,
        feasibility,
        notes
      });
      
    } catch (error) {
      console.warn(`Failed to calculate option for neck lift ${neckLift}g:`, error);
    }
  }
  
  // Sort options by feasibility and practical considerations
  options.sort((a, b) => {
    const feasibilityOrder = { 'excellent': 0, 'good': 1, 'marginal': 2, 'poor': 3 };
    const feasibilityCompare = feasibilityOrder[a.feasibility] - feasibilityOrder[b.feasibility];
    if (feasibilityCompare !== 0) return feasibilityCompare;
    
    // If feasibility is same, prefer moderate neck lift values (800-1200g)
    const aLiftScore = Math.abs(a.neckLift - 1000); // Prefer around 1000g
    const bLiftScore = Math.abs(b.neckLift - 1000);
    return aLiftScore - bLiftScore;
  });
  
  if (options.length === 0) {
    warnings.push('No viable payload/lift combinations found for target altitude with this balloon.');
    warnings.push('Try adjusting target altitude or selecting a different balloon weight.');
  }
  
  return {
    targetBurstAltitude,
    options: options.slice(0, 8), // Limit to top 8 options
    warnings
  };
};