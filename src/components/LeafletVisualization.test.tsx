import React from 'react';
import { render, screen } from '@testing-library/react';
import LeafletVisualization from './LeafletVisualization';
import { PredictionResult, LaunchWeather, ComprehensiveWeather } from '../types/index';
import { vi, describe, it, expect } from 'vitest';

// Mock react-leaflet and leaflet to avoid map rendering issues
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="mock-map">{children}</div>,
  TileLayer: () => <div data-testid="mock-tile" />,
  Polyline: () => <div data-testid="mock-polyline" />,
  Marker: ({ children }: { children?: React.ReactNode }) => <div data-testid="mock-marker">{children}</div>,
  Tooltip: ({ children }: { children?: React.ReactNode }) => <div data-testid="mock-tooltip">{children}</div>,
  LayersControl: ({ children }: { children?: React.ReactNode }) => <div data-testid="mock-layers">{children}</div>,
  useMap: () => ({}),
}));
vi.mock('leaflet', () => ({
  __esModule: true,
  default: {
    divIcon: () => ({}),
    latLngBounds: () => ({ isValid: () => true }),
  },
  divIcon: () => ({}),
  latLngBounds: () => ({ isValid: () => true }),
}));

// Mock minimal prediction result for map rendering
const mockPrediction: PredictionResult = {
  path: [
    { time: 0, lat: 40, lon: -74, altitude: 100 },
    { time: 1, lat: 40.1, lon: -74.1, altitude: 200 },
    { time: 2, lat: 40.2, lon: -74.2, altitude: 300 },
  ],
  launchPoint: { time: 0, lat: 40, lon: -74, altitude: 100 },
  burstPoint: { time: 1, lat: 40.1, lon: -74.1, altitude: 200 },
  landingPoint: { time: 2, lat: 40.2, lon: -74.2, altitude: 300 },
  totalTime: 3600,
};

const validWeather: LaunchWeather = {
  ground: { speed: 5, direction: 180 },
  mid: { speed: 10, direction: 200 },
  jet: { speed: 30, direction: 220 },
};

describe('LeafletVisualization Weather Display', () => {
  it('shows "No data" when no weather is provided', () => {
    render(
      <LeafletVisualization
        result={mockPrediction}
        unitSystem={"metric"}
      />
    );
    expect(screen.getAllByText(/No data/i).length).toBeGreaterThan(0);
  });

  it('shows weather values when valid weather is provided', () => {
    render(
      <LeafletVisualization
        result={mockPrediction}
        launchWeather={validWeather}
        unitSystem={"metric"}
      />
    );
    expect(screen.getByText(/Temp:/)).toBeTruthy();
    expect(screen.getByText(/Weather:/)).toBeTruthy();
  });

  it('shows N/A for missing temp or windSpeed', () => {
    // Simulate missing fields by passing an empty object (invalid, but for test)
    render(
      <LeafletVisualization
        result={mockPrediction}
        launchWeather={{} as ComprehensiveWeather}
        unitSystem={"metric"}
      />
    );
    expect(screen.getByText(/N\/A/)).toBeTruthy();
  });

  it('renders imperial units when specified', () => {
    render(
      <LeafletVisualization
        result={mockPrediction}
        launchWeather={validWeather}
        unitSystem={"imperial"}
      />
    );
    expect(screen.getByText(/59.0°F/)).toBeTruthy();
    expect(screen.getByText(/11.2 mph/)).toBeTruthy();
  });
}); 