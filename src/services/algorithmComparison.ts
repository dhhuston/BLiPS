import { LaunchParams, WeatherData, PredictionResult, CalculatorParams } from '../types';
import { runPredictionSimulation, calculateFlightPerformance, altitudeToPressure } from './predictionService';
import { 
  EARTH_RADIUS_M, 
  TIME_STEP_S, 
  GRAVITY_MS2,
  AIR_DENSITY_SEA_LEVEL_KGM3,
  GAS_DENSITY_HELIUM_KGM3,
  GAS_DENSITY_HYDROGEN_KGM3,
  BALLOON_DRAG_COEFFICIENT,
  BURST_RADIUS_COEFFICIENT,
  BURST_RADIUS_EXPONENT,
  AVG_STRATOSPHERE_TEMP_K,
  SEA_LEVEL_TEMP_K
} from '../constants';

/**
 * Standard physics constants used by other established calculators (CUSF, HABHUB, etc.)
 * for comparison with our implementation
 */
export const STANDARD_CONSTANTS = {
  // Physics constants from CUSF/HABHUB
  EARTH_RADIUS_M: 6371000, // meters (matches our value)
  GRAVITY_MS2: 9.80665, // m/s² (matches our value)
  AIR_DENSITY_SEA_LEVEL_KGM3: 1.225, // kg/m³ (matches our value)
  GAS_DENSITY_HELIUM_KGM3: 0.1786, // kg/m³ (matches our value)
  GAS_DENSITY_HYDROGEN_KGM3: 0.0899, // kg/m³ (matches our value)
  BALLOON_DRAG_COEFFICIENT: 0.3, // dimensionless (matches our value)
  
  // Burst calculation constants (from CUSF burst calculator)
  BURST_RADIUS_COEFFICIENT: 0.479, // (matches our value)
  BURST_RADIUS_EXPONENT: 0.3115, // (matches our value)
  
  // Atmosphere model constants
  TROPOSPHERE_LAPSE_RATE: 0.0065, // K/m
  STRATOSPHERE_TEMP_K: 216.65, // K (slightly different from our 220K)
  SEA_LEVEL_TEMP_K: 288.15, // K (matches our value)
  SEA_LEVEL_PRESSURE_HPA: 1013.25, // hPa
  
  // Time step (CUSF uses variable steps, but commonly 60s)
  TIME_STEP_S: 60 // seconds (matches our value)
};

/**
 * Test cases for algorithm validation against known scenarios
 */
export interface ValidationTestCase {
  name: string;
  description: string;
  launchParams: LaunchParams;
  calculatorParams: CalculatorParams;
  expectedResults: {
    burstAltitude?: number; // meters
    ascentRate?: number; // m/s
    flightTime?: number; // seconds
    landingDistance?: number; // meters from launch
  };
  tolerance: {
    burstAltitude?: number; // ± meters
    ascentRate?: number; // ± m/s
    flightTime?: number; // ± seconds
    landingDistance?: number; // ± meters
  };
  source: string; // Which calculator/standard this is based on
}

/**
 * Standard test cases based on established calculator results
 */
export const VALIDATION_TEST_CASES: ValidationTestCase[] = [
  {
    name: "CUSF Standard Case",
    description: "Typical amateur HAB flight matching CUSF burst calculator",
    launchParams: {
      lat: 52.2135, // Cambridge, UK
      lon: 0.0964,
      launchAltitude: 50, // meters
      launchTime: new Date("2024-01-15T12:00:00Z").toISOString(),
      ascentRate: 5.0, // m/s
      descentRate: 5.0, // m/s
      burstAltitude: 30000 // meters
    },
    calculatorParams: {
      payloadWeight: 500, // grams
      balloonWeight: 800, // grams (Kaymont 800)
      parachuteWeight: 50, // grams
      neckLift: 1500, // grams
      gas: 'Helium'
    },
    expectedResults: {
      burstAltitude: 30000,
      ascentRate: 5.0,
      flightTime: 6000 // ~1.67 hours
    },
    tolerance: {
      burstAltitude: 2000, // ±2km
      ascentRate: 0.5, // ±0.5 m/s
      flightTime: 600 // ±10 minutes
    },
    source: "CUSF Burst Calculator"
  },
  {
    name: "HABHUB High Altitude",
    description: "High altitude flight similar to HABHUB test cases",
    launchParams: {
      lat: 40.7128, // New York
      lon: -74.0060,
      launchAltitude: 0,
      launchTime: new Date("2024-02-01T15:00:00Z").toISOString(),
      ascentRate: 4.5,
      descentRate: 5.5,
      burstAltitude: 35000
    },
    calculatorParams: {
      payloadWeight: 800,
      balloonWeight: 1200,
      parachuteWeight: 100,
      neckLift: 2000,
      gas: 'Helium'
    },
    expectedResults: {
      burstAltitude: 35000,
      ascentRate: 4.5,
      flightTime: 7778 // ~2.16 hours
    },
    tolerance: {
      burstAltitude: 3000,
      ascentRate: 0.5,
      flightTime: 900
    },
    source: "HABHUB Predictor"
  },
  {
    name: "Launch With Us Example",
    description: "Based on Launch With Us tutorial example",
    launchParams: {
      lat: 39.7392, // Denver, CO area
      lon: -104.9903,
      launchAltitude: 1600, // Denver elevation
      launchTime: new Date("2024-03-01T18:00:00Z").toISOString(),
      ascentRate: 4.2,
      descentRate: 5.0,
      burstAltitude: 28000
    },
    calculatorParams: {
      payloadWeight: 600,
      balloonWeight: 600,
      parachuteWeight: 80,
      neckLift: 1300,
      gas: 'Helium'
    },
    expectedResults: {
      burstAltitude: 28000,
      ascentRate: 4.2,
      flightTime: 6286 // ~1.75 hours
    },
    tolerance: {
      burstAltitude: 2500,
      ascentRate: 0.4,
      flightTime: 700
    },
    source: "Launch With Us Calculator"
  }
];

/**
 * Results from algorithm comparison
 */
export interface ComparisonResults {
  testCase: ValidationTestCase;
  ourResults: {
    burstAltitude: number;
    ascentRate: number;
    flightTime: number;
    calculationBreakdown?: any;
  };
  deviations: {
    burstAltitudeDeviation: number; // meters
    ascentRateDeviation: number; // m/s
    flightTimeDeviation: number; // seconds
  };
  withinTolerance: {
    burstAltitude: boolean;
    ascentRate: boolean;
    flightTime: boolean;
    overall: boolean;
  };
  notes: string[];
}

/**
 * Physics constants comparison
 */
export interface ConstantsComparison {
  constant: string;
  ourValue: number;
  standardValue: number;
  deviation: number;
  percentDifference: number;
  withinAcceptableRange: boolean;
  notes: string;
}

/**
 * Compare our physics constants with established standards
 */
export function comparePhysicsConstants(): ConstantsComparison[] {
  const comparisons: ConstantsComparison[] = [];
  
  const constants = [
    {
      name: "Earth Radius (m)",
      ours: EARTH_RADIUS_M,
      standard: STANDARD_CONSTANTS.EARTH_RADIUS_M,
      acceptablePercent: 0.1
    },
    {
      name: "Gravity (m/s²)",
      ours: GRAVITY_MS2,
      standard: STANDARD_CONSTANTS.GRAVITY_MS2,
      acceptablePercent: 0.1
    },
    {
      name: "Air Density at Sea Level (kg/m³)",
      ours: AIR_DENSITY_SEA_LEVEL_KGM3,
      standard: STANDARD_CONSTANTS.AIR_DENSITY_SEA_LEVEL_KGM3,
      acceptablePercent: 1.0
    },
    {
      name: "Helium Density (kg/m³)",
      ours: GAS_DENSITY_HELIUM_KGM3,
      standard: STANDARD_CONSTANTS.GAS_DENSITY_HELIUM_KGM3,
      acceptablePercent: 1.0
    },
    {
      name: "Hydrogen Density (kg/m³)",
      ours: GAS_DENSITY_HYDROGEN_KGM3,
      standard: STANDARD_CONSTANTS.GAS_DENSITY_HYDROGEN_KGM3,
      acceptablePercent: 1.0
    },
    {
      name: "Balloon Drag Coefficient",
      ours: BALLOON_DRAG_COEFFICIENT,
      standard: STANDARD_CONSTANTS.BALLOON_DRAG_COEFFICIENT,
      acceptablePercent: 5.0
    },
    {
      name: "Burst Radius Coefficient",
      ours: BURST_RADIUS_COEFFICIENT,
      standard: STANDARD_CONSTANTS.BURST_RADIUS_COEFFICIENT,
      acceptablePercent: 2.0
    },
    {
      name: "Burst Radius Exponent",
      ours: BURST_RADIUS_EXPONENT,
      standard: STANDARD_CONSTANTS.BURST_RADIUS_EXPONENT,
      acceptablePercent: 1.0
    },
    {
      name: "Time Step (s)",
      ours: TIME_STEP_S,
      standard: STANDARD_CONSTANTS.TIME_STEP_S,
      acceptablePercent: 0
    }
  ];
  
  for (const constant of constants) {
    const deviation = constant.ours - constant.standard;
    const percentDifference = Math.abs(deviation / constant.standard) * 100;
    const withinAcceptableRange = percentDifference <= constant.acceptablePercent;
    
    let notes = '';
    if (!withinAcceptableRange) {
      notes = `Deviation of ${percentDifference.toFixed(2)}% exceeds acceptable range of ${constant.acceptablePercent}%`;
    } else if (percentDifference === 0) {
      notes = 'Perfect match with standard';
    } else {
      notes = `Within acceptable range (${percentDifference.toFixed(2)}% difference)`;
    }
    
    comparisons.push({
      constant: constant.name,
      ourValue: constant.ours,
      standardValue: constant.standard,
      deviation,
      percentDifference,
      withinAcceptableRange,
      notes
    });
  }
  
  return comparisons;
}

/**
 * Run validation tests against our algorithm
 */
export async function runValidationTests(weatherData?: WeatherData): Promise<ComparisonResults[]> {
  const results: ComparisonResults[] = [];
  
  // Use simple weather data if none provided
  const defaultWeatherData: WeatherData = {
    hourly: {
      time: [new Date().toISOString()],
      windspeed_10hPa: [15],
      winddirection_10hPa: [270],
      windspeed_50hPa: [25],
      winddirection_50hPa: [260],
      windspeed_100hPa: [30],
      winddirection_100hPa: [250],
      windspeed_200hPa: [35],
      winddirection_200hPa: [240],
      windspeed_300hPa: [20],
      winddirection_300hPa: [230],
      windspeed_500hPa: [15],
      winddirection_500hPa: [220],
      windspeed_700hPa: [10],
      winddirection_700hPa: [210],
      windspeed_850hPa: [8],
      winddirection_850hPa: [200],
      windspeed_925hPa: [6],
      winddirection_925hPa: [190],
      windspeed_1000hPa: [5],
      winddirection_1000hPa: [180]
    }
  };
  
  const testWeatherData = weatherData || defaultWeatherData;
  
  for (const testCase of VALIDATION_TEST_CASES) {
    try {
      // Calculate burst performance using our calculator
      const calculationBreakdown = calculateFlightPerformance(
        testCase.calculatorParams,
        testCase.launchParams.launchAltitude
      );
      
      if (!calculationBreakdown) {
        results.push({
          testCase,
          ourResults: {
            burstAltitude: 0,
            ascentRate: 0,
            flightTime: 0
          },
          deviations: {
            burstAltitudeDeviation: Infinity,
            ascentRateDeviation: Infinity,
            flightTimeDeviation: Infinity
          },
          withinTolerance: {
            burstAltitude: false,
            ascentRate: false,
            flightTime: false,
            overall: false
          },
          notes: ['Calculation failed - invalid parameters']
        });
        continue;
      }
      
      // Use calculated values for prediction
      const predictionParams: LaunchParams = {
        ...testCase.launchParams,
        ascentRate: calculationBreakdown.ascentRate,
        burstAltitude: calculationBreakdown.burstAltitude
      };
      
      // Run prediction simulation
      const prediction = await runPredictionSimulation(predictionParams, testWeatherData);
      
      // Calculate deviations
      const burstAltitudeDeviation = calculationBreakdown.burstAltitude - (testCase.expectedResults.burstAltitude || 0);
      const ascentRateDeviation = calculationBreakdown.ascentRate - (testCase.expectedResults.ascentRate || 0);
      const flightTimeDeviation = prediction.totalTime - (testCase.expectedResults.flightTime || 0);
      
      // Check tolerances
      const burstAltitudeWithinTolerance = Math.abs(burstAltitudeDeviation) <= (testCase.tolerance.burstAltitude || Infinity);
      const ascentRateWithinTolerance = Math.abs(ascentRateDeviation) <= (testCase.tolerance.ascentRate || Infinity);
      const flightTimeWithinTolerance = Math.abs(flightTimeDeviation) <= (testCase.tolerance.flightTime || Infinity);
      
      const overallWithinTolerance = burstAltitudeWithinTolerance && ascentRateWithinTolerance && flightTimeWithinTolerance;
      
      // Generate notes
      const notes: string[] = [];
      if (!burstAltitudeWithinTolerance) {
        notes.push(`Burst altitude deviation: ${burstAltitudeDeviation.toFixed(0)}m (tolerance: ±${testCase.tolerance.burstAltitude}m)`);
      }
      if (!ascentRateWithinTolerance) {
        notes.push(`Ascent rate deviation: ${ascentRateDeviation.toFixed(2)}m/s (tolerance: ±${testCase.tolerance.ascentRate}m/s)`);
      }
      if (!flightTimeWithinTolerance) {
        notes.push(`Flight time deviation: ${(flightTimeDeviation/60).toFixed(1)}min (tolerance: ±${(testCase.tolerance.flightTime||0)/60}min)`);
      }
      if (overallWithinTolerance) {
        notes.push('✅ All metrics within acceptable tolerance');
      }
      
      results.push({
        testCase,
        ourResults: {
          burstAltitude: calculationBreakdown.burstAltitude,
          ascentRate: calculationBreakdown.ascentRate,
          flightTime: prediction.totalTime,
          calculationBreakdown
        },
        deviations: {
          burstAltitudeDeviation,
          ascentRateDeviation,
          flightTimeDeviation
        },
        withinTolerance: {
          burstAltitude: burstAltitudeWithinTolerance,
          ascentRate: ascentRateWithinTolerance,
          flightTime: flightTimeWithinTolerance,
          overall: overallWithinTolerance
        },
        notes
      });
      
    } catch (error) {
      results.push({
        testCase,
        ourResults: {
          burstAltitude: 0,
          ascentRate: 0,
          flightTime: 0
        },
        deviations: {
          burstAltitudeDeviation: Infinity,
          ascentRateDeviation: Infinity,
          flightTimeDeviation: Infinity
        },
        withinTolerance: {
          burstAltitude: false,
          ascentRate: false,
          flightTime: false,
          overall: false
        },
        notes: [`Error during calculation: ${error instanceof Error ? error.message : 'Unknown error'}`]
      });
    }
  }
  
  return results;
}

/**
 * Generate a comprehensive comparison report
 */
export interface AlgorithmComparisonReport {
  constantsComparison: ConstantsComparison[];
  validationResults: ComparisonResults[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    constantsMatching: number;
    constantsTotal: number;
    overallAssessment: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'NEEDS_IMPROVEMENT' | 'POOR';
    recommendations: string[];
  };
}

/**
 * Generate complete algorithm comparison report
 */
export async function generateComparisonReport(weatherData?: WeatherData): Promise<AlgorithmComparisonReport> {
  const constantsComparison = comparePhysicsConstants();
  const validationResults = await runValidationTests(weatherData);
  
  const totalTests = validationResults.length;
  const passedTests = validationResults.filter(r => r.withinTolerance.overall).length;
  const failedTests = totalTests - passedTests;
  
  const constantsMatching = constantsComparison.filter(c => c.withinAcceptableRange).length;
  const constantsTotal = constantsComparison.length;
  
  // Determine overall assessment
  const constantsScore = constantsMatching / constantsTotal;
  const testsScore = totalTests > 0 ? passedTests / totalTests : 0;
  const overallScore = (constantsScore + testsScore) / 2;
  
  let overallAssessment: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'NEEDS_IMPROVEMENT' | 'POOR';
  if (overallScore >= 0.95) overallAssessment = 'EXCELLENT';
  else if (overallScore >= 0.85) overallAssessment = 'GOOD';
  else if (overallScore >= 0.70) overallAssessment = 'ACCEPTABLE';
  else if (overallScore >= 0.50) overallAssessment = 'NEEDS_IMPROVEMENT';
  else overallAssessment = 'POOR';
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (constantsScore < 1.0) {
    const mismatchedConstants = constantsComparison.filter(c => !c.withinAcceptableRange);
    recommendations.push(`Review physics constants: ${mismatchedConstants.map(c => c.constant).join(', ')}`);
  }
  
  if (testsScore < 0.8) {
    recommendations.push('Consider adjusting algorithm parameters to better match established calculators');
  }
  
  if (overallScore >= 0.9) {
    recommendations.push('Algorithm shows excellent agreement with established standards');
  } else if (overallScore >= 0.7) {
    recommendations.push('Algorithm performance is acceptable but could be fine-tuned');
  } else {
    recommendations.push('Algorithm requires significant review and adjustment');
  }
  
  // Add specific recommendations based on failed tests
  const failedBurstAltitude = validationResults.filter(r => !r.withinTolerance.burstAltitude);
  if (failedBurstAltitude.length > 0) {
    recommendations.push('Review burst altitude calculations - may need atmosphere model adjustments');
  }
  
  const failedAscentRate = validationResults.filter(r => !r.withinTolerance.ascentRate);
  if (failedAscentRate.length > 0) {
    recommendations.push('Review ascent rate calculations - may need drag coefficient or lift calculations adjustments');
  }
  
  return {
    constantsComparison,
    validationResults,
    summary: {
      totalTests,
      passedTests,
      failedTests,
      constantsMatching,
      constantsTotal,
      overallAssessment,
      recommendations
    }
  };
} 