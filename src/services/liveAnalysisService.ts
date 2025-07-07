import { 
  APRSPosition, 
  FlightPhase, 
  ActualFlightMetrics, 
  LivePredictionComparison, 
  LiveWeatherEstimate,
  PredictionResult,
  LaunchParams,
  WeatherData,
  FlightPoint
} from '../types';
import { MAX_REASONABLE_DEVIATION_M, MAX_ALTITUDE_DEVIATION_M, EARTH_RADIUS_M } from '../constants';
import { runPredictionSimulation } from './predictionService';

/**
 * Live analysis and comparison of real-time APRS data with predicted flight path.
 * Provides accuracy metrics, deviation calculations, and recommendations.
 */

/**
 * Calculate distance between two points using Haversine formula
 */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const R = EARTH_RADIUS_M;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calculate bearing from point 1 to point 2
 */
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const toDeg = (rad: number) => rad * 180 / Math.PI;
  
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - 
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Detect current flight phase based on APRS position history
 */
export function detectFlightPhase(positions: APRSPosition[]): FlightPhase {
  if (positions.length < 2) {
    return { phase: 'unknown', confidence: 0, detectedAt: positions[0]?.time || 0 };
  }

  // Sort positions by time
  const sortedPositions = [...positions].sort((a, b) => a.time - b.time);
  const recent = sortedPositions.slice(-5); // Last 5 positions
  
  if (recent.length < 2) {
    return { phase: 'unknown', confidence: 0, detectedAt: sortedPositions[sortedPositions.length - 1].time };
  }

  // Calculate altitude trends
  const altitudes = recent.filter(p => p.altitude !== undefined).map(p => p.altitude!);
  
  if (altitudes.length < 2) {
    return { phase: 'unknown', confidence: 0.3, detectedAt: sortedPositions[sortedPositions.length - 1].time };
  }

  const altitudeChange = altitudes[altitudes.length - 1] - altitudes[0];
  const timeSpan = recent[recent.length - 1].time - recent[0].time;
  const verticalRate = altitudeChange / timeSpan; // m/s

  // Determine phase based on vertical rate and altitude
  const currentAltitude = altitudes[altitudes.length - 1];
  const detectedAt = recent[recent.length - 1].time;

  // Debug flight phase detection
  if (process.env.NODE_ENV === 'development') {
    console.log('Flight Phase Debug:', {
      positionCount: positions.length,
      recentPositions: recent.length,
      currentAltitude,
      verticalRate,
      altitudeChange,
      timeSpan,
      altitudes: altitudes.slice(-3) // Last 3 altitudes
    });
  }
  
  // Check for burst detection - descent after peak altitude over a few samples
  const hasReachedPeak = altitudes.length >= 3; // Reduced from 4 to 3
  let isPastPeak = false;
  let peakAltitude = 0;
  
  if (hasReachedPeak) {
    // Find the peak altitude in the recent readings
    const recentAltitudes = altitudes.slice(-Math.min(5, altitudes.length));
    peakAltitude = Math.max(...recentAltitudes);
    const peakIndex = recentAltitudes.findIndex(alt => alt === peakAltitude);
    
    // Check if we have consistent descent after the peak
    const altitudesAfterPeak = recentAltitudes.slice(peakIndex + 1);
    if (altitudesAfterPeak.length >= 1) { // Reduced from 2 to 1
      const hasConsistentDescentAfterPeak = altitudesAfterPeak.every((alt, i, arr) => 
        i === 0 || alt < arr[i - 1]
      );
      
      // Also check that the descent is significant (not just noise)
      const descentFromPeak = peakAltitude - currentAltitude;
      isPastPeak = hasConsistentDescentAfterPeak && descentFromPeak > 50; // Reduced from 100m to 50m
    }
  }
  
  // Check for rapid descent (emergency burst detection)
  const isRapidDescent = verticalRate < -3;
  
  // Check for any descent at high altitude (likely burst)
  const isDescentAtHighAltitude = currentAltitude > 10000 && verticalRate < -0.5;
  
  if (currentAltitude < 1000 && Math.abs(verticalRate) < 1) {
    return { phase: 'landed', confidence: 0.9, detectedAt };
  } else if (isRapidDescent || isPastPeak || isDescentAtHighAltitude) {
    // Burst detected - rapid descent, consistent descent after peak, or descent at high altitude
    return { phase: 'descent', confidence: 0.9, detectedAt };
  } else if (verticalRate > 2) {
    return { phase: 'ascent', confidence: 0.8, detectedAt };
  } else if (verticalRate < -0.5) {
    // More sensitive descent detection - even slower descent
    return { phase: 'descent', confidence: 0.7, detectedAt };
  } else if (currentAltitude > 15000 && Math.abs(verticalRate) < 1.5) {
    // High altitude with minimal vertical movement could be near burst
    return { phase: 'burst', confidence: 0.6, detectedAt };
  }

  return { phase: 'unknown', confidence: 0.4, detectedAt };
}

/**
 * Calculate actual flight metrics from APRS position history
 */
export function calculateActualFlightMetrics(
  positions: APRSPosition[], 
  originalPrediction: PredictionResult
): ActualFlightMetrics {
  const sortedPositions = [...positions].sort((a, b) => a.time - b.time);
  const currentPosition = sortedPositions[sortedPositions.length - 1];
  const flightPhase = detectFlightPhase(sortedPositions);

  // Calculate actual rates
  let actualAscentRate: number | undefined;
  let actualDescentRate: number | undefined;
  let actualBurstAltitude: number | undefined;

  // Lower altitude threshold for ascent rate calculation to work better in simulation
  const ascentPositions = sortedPositions.filter(p => p.altitude && p.altitude > 500);
  if (ascentPositions.length >= 2) {
    const firstAscent = ascentPositions[0];
    const lastAscent = ascentPositions[ascentPositions.length - 1];
    
    if (lastAscent.altitude! > firstAscent.altitude!) {
      actualAscentRate = (lastAscent.altitude! - firstAscent.altitude!) / (lastAscent.time - firstAscent.time);
    }
  }

  // If we still don't have ascent rate, try with all positions that show altitude gain
  if (!actualAscentRate && sortedPositions.length >= 2) {
    const positionsWithAltitude = sortedPositions.filter(p => p.altitude && p.altitude > 0);
    if (positionsWithAltitude.length >= 2) {
      const first = positionsWithAltitude[0];
      const last = positionsWithAltitude[positionsWithAltitude.length - 1];
      
      if (last.altitude! > first.altitude!) {
        actualAscentRate = (last.altitude! - first.altitude!) / (last.time - first.time);
      }
    }
  }

  // Find burst altitude only if burst is detected (in descent phase)
  const altitudes = sortedPositions.filter(p => p.altitude).map(p => p.altitude!);
  if (altitudes.length > 0 && flightPhase.phase === 'descent') {
    actualBurstAltitude = Math.max(...altitudes);
  }

  // Calculate vertical rate for use in descent detection
  let currentVerticalRate = 0;
  const recentPositions = sortedPositions.slice(-5); // Last 5 positions
  const recentAltitudes = recentPositions.filter(p => p.altitude !== undefined).map(p => p.altitude!);
  
  if (recentAltitudes.length >= 2 && recentPositions.length >= 2) {
    const altitudeChange = recentAltitudes[recentAltitudes.length - 1] - recentAltitudes[0];
    const timeSpan = recentPositions[recentPositions.length - 1].time - recentPositions[0].time;
    currentVerticalRate = timeSpan > 0 ? altitudeChange / timeSpan : 0;
  }

  // Calculate descent rate if in descent phase or if there's any downward movement
  if (flightPhase.phase === 'descent' || currentVerticalRate < -0.5) {
    const descentPositions = sortedPositions.filter(p => 
      p.altitude && p.altitude < (actualBurstAltitude || 50000) // Increased upper bound
    );
    
    if (descentPositions.length >= 2) {
      const firstDescent = descentPositions[0];
      const lastDescent = descentPositions[descentPositions.length - 1];
      
      if (firstDescent.altitude! > lastDescent.altitude!) {
        actualDescentRate = (firstDescent.altitude! - lastDescent.altitude!) / (lastDescent.time - firstDescent.time);
      }
    }
    
    // If we still don't have descent rate, calculate from recent positions with altitude loss
    if (!actualDescentRate && sortedPositions.length >= 2) {
      const recentWithAltitude = sortedPositions.slice(-3).filter(p => p.altitude);
      if (recentWithAltitude.length >= 2) {
        const first = recentWithAltitude[0];
        const last = recentWithAltitude[recentWithAltitude.length - 1];
        
        if (first.altitude! > last.altitude!) {
          actualDescentRate = (first.altitude! - last.altitude!) / (last.time - first.time);
        }
      }
    }
  }

  // Find closest predicted point for comparison
  const currentTime = currentPosition.time;
  const launchTime = originalPrediction.launchPoint.time;
  const flightTime = currentTime - launchTime;
  
  let closestPredictedPoint = originalPrediction.launchPoint;
  let minTimeDiff = Math.abs(flightTime);
  
  for (const point of originalPrediction.path) {
    const timeDiff = Math.abs(point.time - flightTime);
    if (timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff;
      closestPredictedPoint = point;
    }
  }

  // Calculate deviation from predicted
  const distance = haversine(
    currentPosition.lat, currentPosition.lng,
    closestPredictedPoint.lat, closestPredictedPoint.lon
  );
  
  const bearing = calculateBearing(
    closestPredictedPoint.lat, closestPredictedPoint.lon,
    currentPosition.lat, currentPosition.lng
  );

  const altitudeDifference = (currentPosition.altitude || 0) - closestPredictedPoint.altitude;

  // Debug deviation calculation
  if (process.env.NODE_ENV === 'development') {
    console.log('Deviation Debug:', {
      currentPosition: { lat: currentPosition.lat, lng: currentPosition.lng, alt: currentPosition.altitude },
      closestPredictedPoint: { lat: closestPredictedPoint.lat, lon: closestPredictedPoint.lon, alt: closestPredictedPoint.altitude },
      flightTime,
      minTimeDiff,
      distance,
      altitudeDifference
    });
  }

  // Calculate time to landing based on flight phase
  let timeToLanding: number | undefined;
  const currentAltitude = currentPosition.altitude || 0;
  
  if (flightPhase.phase === 'descent' && actualDescentRate && actualDescentRate > 0) {
    // Direct descent calculation
    timeToLanding = currentAltitude / actualDescentRate; // seconds to ground
  } else if (flightPhase.phase === 'ascent' || flightPhase.phase === 'burst') {
    // Estimate remaining time based on original prediction and current progress
    const flightTime = currentTime - launchTime;
    const totalPredictedTime = originalPrediction.totalTime;
    const remainingTime = Math.max(0, totalPredictedTime - flightTime);
    
    // If we have an updated prediction, use that instead
    if (actualAscentRate && actualAscentRate > 0) {
      const estimatedBurstAltitude = actualBurstAltitude || originalPrediction.burstPoint.altitude;
      const altitudeToGo = estimatedBurstAltitude - currentAltitude;
      const timeToAscent = Math.max(0, altitudeToGo / actualAscentRate);
      const estimatedDescentTime = estimatedBurstAltitude / (actualDescentRate || 5); // Default 5 m/s descent
      timeToLanding = timeToAscent + estimatedDescentTime;
    } else {
      timeToLanding = remainingTime;
    }
  } else if (flightPhase.phase === 'landed') {
    timeToLanding = 0;
  }

  return {
    currentPosition,
    flightPhase,
    actualAscentRate,
    actualDescentRate,
    actualBurstAltitude,
    timeToLanding,
    deviationFromPredicted: {
      distance,
      bearing,
      altitudeDifference
    }
  };
}

/**
 * Estimate wind conditions from trajectory analysis
 */
export function estimateWindFromTrajectory(positions: APRSPosition[]): LiveWeatherEstimate[] {
  const estimates: LiveWeatherEstimate[] = [];
  
  if (positions.length < 3) return estimates;

  const sortedPositions = [...positions].sort((a, b) => a.time - b.time);
  
  for (let i = 1; i < sortedPositions.length - 1; i++) {
    const prev = sortedPositions[i - 1];
    const curr = sortedPositions[i];
    const next = sortedPositions[i + 1];
    
    if (!prev.altitude || !curr.altitude || !next.altitude) continue;
    
    // Calculate horizontal displacement
    const distance = haversine(prev.lat, prev.lng, next.lat, next.lng);
    const timeSpan = next.time - prev.time;
    const horizontalSpeed = distance / timeSpan;
    
    // Calculate direction of movement
    const direction = calculateBearing(prev.lat, prev.lng, next.lat, next.lng);
    
    // Estimate wind (assuming balloon moves with wind)
    estimates.push({
      estimatedWindSpeed: horizontalSpeed,
      estimatedWindDirection: direction,
      confidence: 0.7, // Medium confidence from trajectory analysis
      altitude: curr.altitude,
      derivedFrom: 'trajectory_analysis'
    });
  }
  
  return estimates;
}

/**
 * Estimate burst altitude based on current flight performance
 * Keep original prediction until actual burst is detected
 */
function estimateBurstAltitude(
  actualMetrics: ActualFlightMetrics,
  originalParams: LaunchParams
): number {
  const { flightPhase, actualBurstAltitude } = actualMetrics;
  
  // Only use actual burst altitude if we have definitive burst detection
  // (i.e., we've detected descent after reaching peak altitude)
  if (actualBurstAltitude && flightPhase.phase === 'descent') {
    return actualBurstAltitude;
  }
  
  // For all other cases (ascent, burst, unknown), stick with original prediction
  return originalParams.burstAltitude;
}

/**
 * Generate updated prediction from current position
 */
export async function generateUpdatedPrediction(
  actualMetrics: ActualFlightMetrics,
  originalParams: LaunchParams,
  weatherData: WeatherData
): Promise<PredictionResult | null> {
  const { currentPosition, flightPhase, actualAscentRate, actualDescentRate } = actualMetrics;
  
  // Estimate burst altitude based on current performance
  const estimatedBurstAltitude = estimateBurstAltitude(actualMetrics, originalParams);
  
  // Create updated parameters based on actual performance
  const updatedParams: LaunchParams = {
    ...originalParams,
    lat: currentPosition.lat,
    lon: currentPosition.lng,
    launchAltitude: currentPosition.altitude || originalParams.launchAltitude,
    launchTime: new Date(currentPosition.time * 1000).toISOString(),
    ascentRate: actualAscentRate || originalParams.ascentRate,
    descentRate: actualDescentRate || originalParams.descentRate,
    burstAltitude: estimatedBurstAltitude
  };

  // Adjust parameters based on flight phase
  if (flightPhase.phase === 'descent') {
    updatedParams.ascentRate = 0; // No more ascent
    updatedParams.burstAltitude = currentPosition.altitude || estimatedBurstAltitude;
  } else if (flightPhase.phase === 'landed') {
    return null; // No prediction needed if already landed
  }

  try {
    return await runPredictionSimulation(updatedParams, weatherData);
  } catch (error) {
    console.error('Failed to generate updated prediction:', error);
    return null;
  }
}

/**
 * Calculates the accuracy of a live flight compared to the original prediction.
 * Considers trajectory, altitude, and timing deviations.
 * @param currentPositions Array of APRSPosition (real or simulated)
 * @param originalPrediction The original PredictionResult
 * @param launchParams Launch parameters
 * @param weatherData Weather data used for prediction
 * @returns LivePredictionComparison with accuracy metrics and recommendations
 */
export async function createLivePredictionComparison(
  currentPositions: APRSPosition[],
  originalPrediction: PredictionResult,
  launchParams: LaunchParams,
  weatherData: WeatherData
): Promise<LivePredictionComparison | null> {
  if (currentPositions.length === 0) return null;
  
  const actualMetrics = calculateActualFlightMetrics(currentPositions, originalPrediction);
  const updatedPrediction = await generateUpdatedPrediction(actualMetrics, launchParams, weatherData);
  const accuracy = calculatePredictionAccuracy(originalPrediction, actualMetrics);
  
  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('Live Analysis Debug:', {
      positionCount: currentPositions.length,
      currentAltitude: actualMetrics.currentPosition.altitude,
      flightPhase: actualMetrics.flightPhase.phase,
      ascentRate: actualMetrics.actualAscentRate,
      descentRate: actualMetrics.actualDescentRate,
      deviationDistance: actualMetrics.deviationFromPredicted.distance,
      deviationAltitude: actualMetrics.deviationFromPredicted.altitudeDifference,
      trajectoryAccuracy: accuracy.trajectoryAccuracy,
      altitudeAccuracy: accuracy.altitudeAccuracy,
      timeToLanding: actualMetrics.timeToLanding,
      accuracyDetails: {
        maxTrajectoryDev: 50000,
        maxAltitudeDev: 5000,
        rawTrajectoryAccuracy: 1 - (actualMetrics.deviationFromPredicted.distance / 50000),
        rawAltitudeAccuracy: 1 - (Math.abs(actualMetrics.deviationFromPredicted.altitudeDifference) / 5000),
        trajectoryCalc: `max(0.1, ${1 - (actualMetrics.deviationFromPredicted.distance / 50000)}) = ${accuracy.trajectoryAccuracy}`,
        altitudeCalc: `max(0.1, ${1 - (Math.abs(actualMetrics.deviationFromPredicted.altitudeDifference) / 5000)}) = ${accuracy.altitudeAccuracy}`
      }
    });
  }
  
  const comparison: LivePredictionComparison = {
    originalPrediction,
    updatedPrediction: updatedPrediction || undefined,
    actualMetrics,
    accuracy,
    recommendations: []
  };
  
  return comparison;
}

/**
 * Calculates the deviation from the predicted path for a given position.
 * Used for trajectory and altitude accuracy metrics.
 * @param position The current APRSPosition
 * @param predictedPath The predicted flight path
 * @returns { distance: number, bearing: number, altitudeDifference: number }
 */
function calculateDeviationFromPredicted(
  position: APRSPosition,
  predictedPath: FlightPoint[]
): { distance: number; bearing: number; altitudeDifference: number } {
  // Find the closest point in the predicted path by time
  let minTimeDiff = Infinity;
  let closest: FlightPoint | null = null;
  for (const p of predictedPath) {
    const timeDiff = Math.abs(p.time - position.time);
    if (timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff;
      closest = p;
    }
  }
  if (!closest) {
    return { distance: 0, bearing: 0, altitudeDifference: 0 };
  }
  const distance = haversine(position.lat, position.lng, closest.lat, closest.lon);
  const bearing = calculateBearing(closest.lat, closest.lon, position.lat, position.lng);
  const altitudeDifference = (position.altitude ?? 0) - closest.altitude;
  return { distance, bearing, altitudeDifference };
}

/**
 * Calculate prediction accuracy metrics
 */
export function calculatePredictionAccuracy(
  originalPrediction: PredictionResult,
  actualMetrics: ActualFlightMetrics
): { trajectoryAccuracy: number; altitudeAccuracy: number; timingAccuracy: number; overallAccuracy: number } {
  const { deviationFromPredicted } = actualMetrics;
  
  // Trajectory accuracy (based on distance deviation)
  // For simulation scenarios, use more forgiving thresholds since we expect larger deviations
  // In real scenarios, balloons can deviate significantly due to unexpected weather
      const rawTrajectoryAccuracy = 1 - (deviationFromPredicted.distance / MAX_REASONABLE_DEVIATION_M);
  const trajectoryAccuracy = Math.max(0.1, Math.min(1, rawTrajectoryAccuracy)); // Minimum 10% accuracy
  
  // Altitude accuracy - be more forgiving for simulations testing different scenarios
      const rawAltitudeAccuracy = 1 - (Math.abs(deviationFromPredicted.altitudeDifference) / MAX_ALTITUDE_DEVIATION_M);
  const altitudeAccuracy = Math.max(0.1, Math.min(1, rawAltitudeAccuracy)); // Minimum 10% accuracy
  
  // Timing accuracy (based on actual vs predicted ascent/descent rates)
  let timingAccuracy = 0.7; // Default base accuracy
  
  // Improve timing accuracy if we have actual rates that match predictions
  if (actualMetrics.actualAscentRate && actualMetrics.actualAscentRate > 0 && originalPrediction.maxAltitude) {
    const originalAscentRate = originalPrediction.maxAltitude / originalPrediction.totalTime; // Rough estimate
    const rateRatio = Math.min(actualMetrics.actualAscentRate, originalAscentRate) / 
                     Math.max(actualMetrics.actualAscentRate, originalAscentRate);
    timingAccuracy = Math.max(timingAccuracy, rateRatio * 0.9);
  }
  
  // Overall accuracy (weighted average)
  const overallAccuracy = (trajectoryAccuracy * 0.5 + altitudeAccuracy * 0.3 + timingAccuracy * 0.2);
  
  return {
    trajectoryAccuracy,
    altitudeAccuracy,
    timingAccuracy,
    overallAccuracy
  };
}

/**
 * Generate recommendations based on live analysis
 */
export function generateRecommendations(
  comparison: LivePredictionComparison
): string[] {
  const recommendations: string[] = [];
  const { actualMetrics, accuracy } = comparison;
  
  if (accuracy.trajectoryAccuracy < 0.7) {
    recommendations.push('Significant trajectory deviation detected. Consider updated landing zone predictions.');
  }
  
  if (actualMetrics.actualAscentRate && actualMetrics.actualAscentRate < 3) {
    recommendations.push('Slower than expected ascent rate. Burst altitude may be lower than predicted.');
  }
  
  if (actualMetrics.actualAscentRate && actualMetrics.actualAscentRate > 8) {
    recommendations.push('Faster than expected ascent rate. Monitor for early burst.');
  }
  
  if (actualMetrics.deviationFromPredicted.distance > 10000) {
    recommendations.push('Flight path deviating significantly from prediction. Check wind conditions.');
  }
  
  if (actualMetrics.flightPhase.phase === 'descent' && !actualMetrics.actualDescentRate) {
    recommendations.push('Descent phase detected but descent rate unknown. Monitor closely.');
  }
  
  return recommendations;
} 