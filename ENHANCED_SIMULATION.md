# Enhanced Flight Simulator

The Enhanced Flight Simulator is a sophisticated balloon flight simulation tool that provides realistic physics modeling, advanced weather integration, and comprehensive scenario testing for balloon prediction applications.

## Features

### 🚀 Advanced Physics Models

- **Basic Model**: Simple atmospheric drag and wind effects
- **Advanced Model**: Detailed atmospheric modeling with temperature, pressure, and humidity effects
- **Realistic Model**: Full physics simulation including balloon volume, lift forces, and drag calculations

### 🌤️ Weather Integration

- Real-time weather data integration
- Wind profile modeling at different altitudes
- Temperature and pressure effects on balloon performance
- Humidity impact on lift calculations

### 🎯 Scenario Testing

#### Predefined Scenarios

1. **Standard Flight**: Normal balloon flight with realistic variations
2. **Early Burst**: Balloon bursts at 75% of predicted altitude due to UV damage
3. **Wind Shear**: Severe wind shear at 5km altitude causing trajectory deviation
4. **Slow Ascent**: Reduced ascent rate due to thermal cycles and atmospheric conditions
5. **Fast Descent**: Rapid descent due to parachute deployment issues
6. **Equipment Failure**: Beacon failure 30 minutes after launch
7. **Storm Conditions**: Flight through severe weather with high turbulence
8. **Jet Stream**: Flight through strong jet stream at high altitude

#### Custom Scenarios

- Configurable burst altitude modifiers
- Adjustable ascent and descent rate modifiers
- Custom wind shear parameters
- Turbulence level controls
- Equipment failure timing

### 📊 Real-time Metrics

- Current altitude, speed, and course
- Ascent and descent rates
- Burst altitude and timing
- Total distance traveled
- Weather conditions at current position
- Deviations from predicted trajectory

### ⚙️ Advanced Controls

- **Simulation Speed**: 1x to 100x real-time
- **Beacon Intervals**: 15 seconds to 5 minutes
- **Noise Level**: 0-1 scale for realistic GPS variations
- **Physics Model Selection**: Choose simulation complexity
- **Weather Integration Toggle**: Enable/disable weather effects
- **Turbulence Modeling**: Realistic atmospheric turbulence
- **Thermal Effects**: Daytime heating and nighttime cooling

### 🎛️ Custom Wind Profiles

- Define wind speed and direction at multiple altitudes
- Create realistic wind shear conditions
- Model jet stream effects
- Custom turbulence parameters

## Usage

### Basic Operation

1. **Select Data Source**: Choose "Enhanced Simulation" from the data source options
2. **Choose Scenario**: Select from predefined scenarios or create custom ones
3. **Configure Parameters**: Adjust beacon interval, simulation speed, and physics model
4. **Start Simulation**: Click "Start Simulation" to begin
5. **Monitor Progress**: Watch real-time metrics and flight path updates

### Advanced Configuration

#### Physics Model Selection

- **Basic**: Good for quick testing and basic scenarios
- **Advanced**: Recommended for most use cases with weather integration
- **Realistic**: Full physics simulation for detailed analysis

#### Weather Integration

When enabled, the simulator:
- Uses real weather data for wind calculations
- Applies temperature effects on balloon performance
- Models pressure changes with altitude
- Includes humidity impact on lift

#### Custom Wind Profiles

Create custom wind profiles by:
1. Enabling "Custom Wind Profile" in advanced settings
2. Adding wind levels at different altitudes
3. Specifying wind speed and direction for each level
4. The simulator interpolates between defined levels

### Scenario Parameters

Each scenario can be customized with:

- `burstAltitudeModifier`: Multiplier for burst altitude (0.5 = 50% of predicted)
- `ascentRateModifier`: Multiplier for ascent rate (0.8 = 20% slower)
- `descentRateModifier`: Multiplier for descent rate (1.5 = 50% faster)
- `windShearAltitude`: Altitude where wind shear occurs (meters)
- `windShearIntensity`: Intensity of wind shear (0-1)
- `turbulenceLevel`: Turbulence intensity (0-1)
- `thermalCyclePeriod`: Seconds between thermal cycles
- `equipmentFailureTime`: Seconds after launch when failure occurs

## Technical Details

### Physics Models

#### Basic Model
- Simple atmospheric density calculations
- Basic wind drift effects
- GPS noise simulation

#### Advanced Model
- Temperature lapse rate calculations
- Pressure-based atmospheric modeling
- Wind profile interpolation
- Realistic GPS accuracy variations

#### Realistic Model
- Balloon volume calculations
- Lift force calculations based on temperature and humidity
- Drag force modeling
- Detailed atmospheric physics

### Weather Integration

The simulator integrates with the OpenMeteo weather service to:
- Get real wind data at multiple altitudes
- Apply temperature effects on balloon performance
- Model pressure changes with altitude
- Include humidity effects on lift calculations

### Noise and Realism

- **GPS Accuracy**: Varies with altitude (better at higher altitudes)
- **Atmospheric Turbulence**: Random variations in wind and position
- **Thermal Effects**: Daytime heating and nighttime cooling cycles
- **Equipment Failures**: Realistic beacon loss and equipment issues

## API Reference

### EnhancedFlightSimulator Class

```typescript
class EnhancedFlightSimulator {
  constructor(
    config: EnhancedSimulationConfig,
    launchParams: LaunchParams,
    originalPrediction: PredictionResult,
    weatherData: WeatherData | null
  )

  async generatePositions(): Promise<APRSPosition[]>
  updateTime(newTime: number): void
  getConfig(): EnhancedSimulationConfig
  updateConfig(updates: Partial<EnhancedSimulationConfig>): void
  getMetrics(): SimulationMetrics | null
  getPositions(): APRSPosition[]
  clearCache(): void
}
```

### Configuration Interface

```typescript
interface EnhancedSimulationConfig {
  enabled: boolean;
  scenario: SimulationScenario;
  beaconInterval: number;
  startTime: number;
  currentTime: number;
  noiseLevel: number;
  simulationSpeed: number;
  physicsModel: 'basic' | 'advanced' | 'realistic';
  weatherIntegration: boolean;
  turbulenceModel: boolean;
  thermalEffects: boolean;
  replayMode: boolean;
  customWindProfile?: WindProfile[];
  equipmentFailures?: EquipmentFailure[];
}
```

### Metrics Interface

```typescript
interface SimulationMetrics {
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
```

## Examples

### Creating a Custom Scenario

```typescript
const customScenario: SimulationScenario = {
  name: 'High Altitude Wind Shear',
  description: 'Balloon encounters severe wind shear at 8km altitude',
  type: 'wind_shear',
  parameters: {
    windShearAltitude: 8000,
    windShearIntensity: 0.9,
    turbulenceLevel: 0.7
  }
};

const config: EnhancedSimulationConfig = {
  enabled: true,
  scenario: customScenario,
  beaconInterval: 30,
  physicsModel: 'advanced',
  weatherIntegration: true,
  turbulenceModel: true,
  thermalEffects: true,
  simulationSpeed: 10,
  noiseLevel: 0.3
};
```

### Monitoring Simulation Progress

```typescript
const simulator = createEnhancedFlightSimulator(launchParams, prediction, config, weatherData);

// Generate positions
const positions = await simulator.generatePositions();

// Get current metrics
const metrics = simulator.getMetrics();
console.log(`Current altitude: ${metrics.currentAltitude}m`);
console.log(`Flight phase: ${metrics.flightPhase}`);
console.log(`Deviation from prediction: ${metrics.deviations.fromPredictedPosition}m`);
```

## Best Practices

1. **Start with Basic Model**: Use the basic physics model for initial testing
2. **Gradually Increase Complexity**: Move to advanced/realistic models as needed
3. **Test Multiple Scenarios**: Run different scenarios to understand failure modes
4. **Monitor Metrics**: Pay attention to deviations from predicted trajectories
5. **Use Real Weather**: Enable weather integration for more realistic simulations
6. **Adjust Noise Levels**: Higher noise for realistic GPS variations, lower for clean data

## Troubleshooting

### Common Issues

1. **Simulation Too Fast**: Reduce simulation speed for better control
2. **Unrealistic Results**: Check physics model and weather integration settings
3. **Performance Issues**: Use basic physics model for large datasets
4. **Weather Data Errors**: Ensure weather service is available and data is valid

### Performance Optimization

- Use basic physics model for quick testing
- Reduce beacon frequency for longer simulations
- Disable weather integration if not needed
- Clear cache periodically for long-running simulations

## Future Enhancements

- **3D Visualization**: Real-time 3D flight path visualization
- **Multi-Balloon Support**: Simulate multiple balloons simultaneously
- **Advanced Weather Models**: Integration with more sophisticated weather services
- **Machine Learning**: AI-powered trajectory prediction improvements
- **Export Capabilities**: Save simulation data for external analysis
- **Replay System**: Record and replay simulation sessions 