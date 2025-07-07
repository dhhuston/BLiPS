import React, { useRef, useEffect } from 'react';
import { PredictionResult } from '../types/index';
import { LaunchIcon, BurstIcon, LandingIcon, svgToDataURL } from './icons/IconComponents';
import * as Cesium from 'cesium';

interface GlobeVisualizationProps {
  result: PredictionResult | null;
}

const GlobeVisualization: React.FC<GlobeVisualizationProps> = ({ result }) => {
  // Always call hooks at the top level
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  
  // Early return after hooks
  if (!result) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-6xl mb-4">🌍</div>
          <h3 className="text-xl font-semibold mb-2">3D Globe View</h3>
          <p>Run a prediction first to view the 3D trajectory</p>
        </div>
      </div>
    );
  }

  const { path, launchPoint, burstPoint, landingPoint } = result;

  // Load Cesium Ion access token from localStorage (for Tauri) or window/global
  let cesiumToken = '';
  try {
    if (typeof window !== 'undefined') {
      cesiumToken = localStorage.getItem('cesiumIonAccessToken') || (window as any).CESIUM_ION_ACCESS_TOKEN || '';
    }
  } catch {
    // Ignore errors
  }

  useEffect(() => {
    if (cesiumContainer.current && !viewerRef.current && result) {
      // Set your Cesium Ion access token in api.keys as CESIUM_ION_ACCESS_TOKEN=get_your_token_from_cesium.com
      Cesium.Ion.defaultAccessToken = cesiumToken;
      const viewer = new Cesium.Viewer(cesiumContainer.current, {
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        selectionIndicator: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
      });
      viewer.scene.globe.enableLighting = true;
      viewer.scene.postProcessStages.fxaa.enabled = true;
      viewerRef.current = viewer;
    }
    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [cesiumToken, result]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !result) return;
    viewer.entities.removeAll();
    const pathPositions = path.map(p => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.altitude));
    viewer.entities.add({
      name: 'Flight Path',
      polyline: {
        positions: pathPositions,
        width: 4,
        material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.2,
            color: Cesium.Color.fromCssColorString('#2dd4bf'),
        }),
        clampToGround: false,
      },
    });
    viewer.entities.add({
      name: 'Ground Track',
      polyline: {
        positions: pathPositions,
        width: 2,
        material: Cesium.Color.fromCssColorString('#60a5fa').withAlpha(0.7),
        clampToGround: true,
      }
    });
    const keyPoints = [
      { point: launchPoint, color: '#34d399', icon: LaunchIcon, name: 'Launch' },
      { point: burstPoint, color: '#f87171', icon: BurstIcon, name: 'Burst' },
      { point: landingPoint, color: '#60a5fa', icon: LandingIcon, name: 'Landing' },
    ];
    keyPoints.forEach(({ point, color, icon, name }) => {
        const position = Cesium.Cartesian3.fromDegrees(point.lon, point.lat, point.altitude);
        viewer.entities.add({
            polyline: {
                positions: [
                    position,
                    Cesium.Cartesian3.fromDegrees(point.lon, point.lat, 0)
                ],
                width: 1,
                material: Cesium.Color.fromCssColorString(color).withAlpha(0.6),
            }
        });
        viewer.entities.add({
            name,
            position,
            billboard: {
                image: svgToDataURL(icon(color)),
                width: 32,
                height: 32,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            },
        });
    });
    // Camera: fit to trajectory using rectangle only (no forced side view)
    if (pathPositions.length > 1) {
      const rectangle = Cesium.Rectangle.fromCartesianArray(pathPositions);
      viewer.camera.flyTo({
        destination: rectangle,
        duration: 2.0
      });
    }
  }, [result, path, launchPoint, burstPoint, landingPoint]);

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: '0.5rem', position: 'relative' }}>
      <div ref={cesiumContainer} style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }} />
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }} className="bg-gray-900/80 text-xs text-gray-200 rounded-lg px-3 py-2 shadow-lg pointer-events-none select-none">
        <div className="font-semibold text-cyan-300 mb-1">3D Controls</div>
        <ul className="space-y-1">
          <li><b>Pan:</b> Left mouse drag</li>
          <li><b>Zoom:</b> Mouse wheel or double-click</li>
          <li><b>Tilt:</b> Right mouse drag, or Ctrl + Left mouse drag</li>
          <li><b>Rotate:</b> Middle mouse drag, or Ctrl + Left mouse drag</li>
        </ul>
      </div>
    </div>
  );
};

export default GlobeVisualization;