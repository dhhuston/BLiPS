import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findNearestRoad } from './elevationService';

// Mock global fetch
beforeEach(() => {
  vi.resetAllMocks();
});

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('findNearestRoad', () => {
  it('finds a road using Overpass', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          {
            type: 'way',
            center: { lat: 40.0, lon: -86.0 },
            tags: { name: 'Main St', highway: 'primary' }
          }
        ]
      })
    });
    const result = await findNearestRoad(40.0, -86.0);
    expect(result).toBeTruthy();
    expect(result?.type).toBe('road');
    expect(result?.roadName).toContain('Main St');
  });

  it('returns null if nothing is found', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ elements: [] }) });
    const result = await findNearestRoad(0, 0);
    expect(result).toBeNull();
  });

  it('finds a real road at Purdue coordinates', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          {
            type: 'way',
            center: { lat: 40.478641405136656, lon: -86.94086257484378 },
            tags: { name: 'State St', highway: 'primary' }
          }
        ]
      })
    });
    const result = await findNearestRoad(40.478641405136656, -86.94086257484378);
    expect(result).toBeTruthy();
    expect(result?.type).toBe('road');
    expect(result?.roadName).toContain('State St');
  });

  it('finds Cherry Ln at Purdue coordinates', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          {
            type: 'way',
            center: { lat: 40.478641405136656, lon: -86.94086257484378 },
            tags: { name: 'Cherry Ln', highway: 'residential' }
          }
        ]
      })
    });
    const result = await findNearestRoad(40.478641405136656, -86.94086257484378);
    expect(result).toBeTruthy();
    expect(result?.type).toBe('road');
    expect(result?.roadName).toContain('Cherry Ln');
  });

  it('finds Cherry Ln at the new Purdue coordinates', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          {
            type: 'way',
            center: { lat: 40.478564610162906, lon: -86.94091176370307 },
            tags: { name: 'Cherry Ln', highway: 'residential' }
          }
        ]
      })
    });
    const result = await findNearestRoad(40.478564610162906, -86.94091176370307);
    expect(result).toBeTruthy();
    expect(result?.type).toBe('road');
    expect(result?.roadName).toContain('Cherry Ln');
  });

  // Integration test with live Overpass API (skipped by default)
  it.only('LIVE: finds a real road at Purdue coordinates using Overpass', async () => {
    // Remove fetch mock for this test
    delete (global as any).fetch;
    const result = await findNearestRoad(40.478564610162906, -86.94091176370307);
    expect(result).toBeTruthy();
    expect(result?.type).toBe('road');
    expect(result?.roadName).toBeTruthy();
    console.log('LIVE Overpass result:', result);
  });
}); 