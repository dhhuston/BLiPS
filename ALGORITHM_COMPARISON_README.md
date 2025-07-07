# Algorithm Comparison Feature

## Overview

This feature provides comprehensive validation of our balloon prediction algorithm against established standards from the High Altitude Balloon (HAB) community, including CUSF Landing Predictor, HABHUB, and other recognized calculators.

## Features

### 1. Physics Constants Comparison
Compares our algorithm's physics constants with established standards:

- **Earth Radius**: 6,371,000 m
- **Gravity**: 9.80665 m/s²
- **Air Density (Sea Level)**: 1.225 kg/m³
- **Helium Density**: 0.1786 kg/m³
- **Hydrogen Density**: 0.0899 kg/m³
- **Balloon Drag Coefficient**: 0.3
- **Burst Radius Formula**: 0.479 × weight^0.3115
- **Atmosphere Model Constants**

### 2. Validation Test Cases
Tests our algorithm against known scenarios from established calculators:

#### Test Case 1: CUSF Standard Case
- **Location**: Cambridge, UK (52.2135°, 0.0964°)
- **Balloon**: Kaymont 800g
- **Payload**: 500g
- **Expected Burst**: ~30,000m
- **Expected Ascent Rate**: ~5.0 m/s

#### Test Case 2: HABHUB High Altitude
- **Location**: New York, NY (40.7128°, -74.0060°)
- **Balloon**: Kaymont 1200g
- **Payload**: 800g
- **Expected Burst**: ~35,000m
- **Expected Ascent Rate**: ~4.5 m/s

#### Test Case 3: Launch With Us Example
- **Location**: Denver, CO (39.7392°, -104.9903°)
- **Balloon**: Kaymont 600g
- **Payload**: 600g
- **Expected Burst**: ~28,000m
- **Expected Ascent Rate**: ~4.2 m/s

### 3. Assessment Levels
The comparison generates an overall assessment:

- **EXCELLENT** (95%+ match): Algorithm shows exceptional agreement
- **GOOD** (85-94% match): Strong agreement with minor differences
- **ACCEPTABLE** (70-84% match): Reasonable agreement, minor tuning may help
- **NEEDS_IMPROVEMENT** (50-69% match): Significant differences, review needed
- **POOR** (<50% match): Major algorithmic issues requiring attention

## How to Use

1. **Access the Feature**: Navigate to the "Algorithm Comparison" tab in the application
2. **Run Comparison**: Click "Run Comparison" to execute all validation tests
3. **Review Results**: 
   - **Overview Tab**: Summary statistics and overall assessment
   - **Constants Tab**: Detailed physics constants comparison
   - **Validation Tab**: Test case results with deviations and tolerances

## Validation Methodology

### Physics Constants Validation
- Compares each constant against published standards
- Calculates percentage differences
- Flags constants outside acceptable tolerances

### Algorithm Testing
- Uses established calculator parameters as inputs
- Runs our algorithm with identical conditions
- Compares burst altitude, ascent rate, and flight time
- Checks deviations against reasonable tolerances

### Assessment Criteria
- **Physics Constants**: Must match within 0.1-5% depending on the constant
- **Burst Altitude**: Tolerance of ±2-3km (realistic balloon prediction variance)
- **Ascent Rate**: Tolerance of ±0.4-0.5 m/s
- **Flight Time**: Tolerance of ±10-15 minutes

## Technical Implementation

### Files Structure
```
src/services/algorithmComparison.ts     # Core comparison logic
src/components/AlgorithmComparisonPanel.tsx   # UI component
```

### Key Functions
- `comparePhysicsConstants()`: Validates physics constants
- `runValidationTests()`: Executes test cases
- `generateComparisonReport()`: Creates comprehensive report

## Expected Results

Our algorithm should achieve **GOOD** to **EXCELLENT** ratings because:

1. **Physics Constants**: We use the same established constants as CUSF/HABHUB
2. **Standard Atmosphere Model**: Implements the same pressure/altitude relationships
3. **Burst Calculations**: Uses identical empirical formulas
4. **Wind Interpolation**: Similar pressure-level interpolation methods

## Potential Differences

Minor differences may occur due to:

1. **Time Step Granularity**: We use 60-second steps vs. variable steps in some calculators
2. **Atmosphere Model Variations**: Slight differences in stratosphere temperature assumptions
3. **Rounding/Precision**: Different floating-point precision in calculations
4. **Weather Data**: Test cases use simplified weather vs. real GFS data

## Troubleshooting

### Poor Assessment Results
If assessment is below ACCEPTABLE:

1. **Check Constants**: Review physics constants for typos or outdated values
2. **Verify Formulas**: Ensure burst altitude and ascent rate calculations match standards
3. **Atmosphere Model**: Validate pressure-to-altitude conversion functions
4. **Units**: Confirm all units are consistent (SI base units)

### Individual Test Failures
For specific test case failures:

1. **Burst Altitude Issues**: Review pressure calculations and burst diameter formulas
2. **Ascent Rate Issues**: Check drag coefficient and lift force calculations
3. **Flight Time Issues**: Verify time step integration and termination conditions

## References

- [CUSF Landing Predictor](https://predict.habhub.org/)
- [CUSF Burst Calculator](https://sondehub.org/calc/)
- [CUSF Wiki](https://wiki.cusf.co.uk/landing_predictor)
- [Launch With Us Tutorial](https://launchwithus.com/lwu-blog/2015/12/29/space-camp-lesson-3-flight-path-prediction)
- [UKHAS Balloon Data](https://ukhas.org.uk/guides:balloon_data)

## Validation Report Example

```
Overall Assessment: GOOD (87.5%)

Physics Constants: 9/9 matching (100%)
Validation Tests: 2/3 passed (66.7%)

Recommendations:
✅ Algorithm shows excellent agreement with established standards
• Review ascent rate calculations - may need drag coefficient adjustments
```

## Benefits

1. **Confidence**: Validates algorithm accuracy against proven standards
2. **Quality Assurance**: Catches algorithmic errors before they affect predictions
3. **Continuous Improvement**: Identifies areas for algorithm refinement
4. **Standards Compliance**: Ensures compatibility with HAB community practices
5. **Educational**: Helps users understand prediction algorithm fundamentals 