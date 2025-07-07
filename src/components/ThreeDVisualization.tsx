import React, { useEffect, useRef } from 'react';
import { PredictionResult, UnitSystem } from '../types/index';
import { metersToFeet } from '../constants/index';

interface ThreeDVisualizationProps {
  prediction: PredictionResult | null;
  unitSystem: UnitSystem;
}

const ThreeDVisualization: React.FC<ThreeDVisualizationProps> = ({ prediction, unitSystem }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const trajectoryPointsRef = useRef<any[]>([]);

  // Helper to reset camera view
  const resetView = () => {
    if (!cameraRef.current || !controlsRef.current || !trajectoryPointsRef.current.length) return;
    const THREE = require('three');
    const box = new THREE.Box3().setFromPoints(trajectoryPointsRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5;
    cameraRef.current.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
    cameraRef.current.lookAt(center);
    controlsRef.current.target.copy(center);
  };

  useEffect(() => {
    if (!prediction || !mountRef.current) return;
    if (!prediction.path || prediction.path.length < 2) {
      return;
    }

    // Dynamically import Three.js to avoid SSR issues
    const initThreeJS = async () => {
      const THREE = await import('three');
      const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

      // Clean up previous scene
      if (sceneRef.current) {
        mountRef.current?.removeChild(rendererRef.current.domElement);
      }

      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1f2937); // Dark gray background
      sceneRef.current = scene;

      // Camera setup
      if (!mountRef.current) return;
      const camera = new THREE.PerspectiveCamera(
        75,
        mountRef.current.clientWidth / mountRef.current.clientHeight,
        0.1,
        10000
      );
      cameraRef.current = camera;

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      if (!mountRef.current) return;
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;
      mountRef.current.appendChild(renderer.domElement);

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controlsRef.current = controls;

      // Lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(100, 100, 50);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      scene.add(directionalLight);

      // Ground plane
      const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
      const groundMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x374151,
        transparent: true,
        opacity: 0.3
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      // Grid helper
      const gridHelper = new THREE.GridHelper(1000, 50, 0x4b5563, 0x6b7280);
      gridHelper.position.y = 0;
      scene.add(gridHelper);

      // Flight trajectory
      const trajectoryPoints: any[] = [];
      const isImperial = unitSystem === 'imperial';
      prediction.path.forEach((point) => {
        // Scale coordinates for better visualization
        const x = point.lon * 1000; // Scale longitude
        const z = point.lat * 1000; // Scale latitude
        const y = isImperial ? metersToFeet(point.altitude) : point.altitude; // Altitude
        trajectoryPoints.push(new THREE.Vector3(x, y, z));
      });
      trajectoryPointsRef.current = trajectoryPoints;

      // Create trajectory line
      if (trajectoryPoints.length > 1) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(trajectoryPoints);
        const lineMaterial = new THREE.LineBasicMaterial({ 
          color: 0x2dd4bf,
          linewidth: 3
        });
        const trajectoryLine = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(trajectoryLine);

        // Add trajectory points
        trajectoryPoints.forEach((point, index) => {
          const sphereGeometry = new THREE.SphereGeometry(2, 8, 8);
          const sphereMaterial = new THREE.MeshLambertMaterial({ 
            color: index === 0 ? 0x10b981 : index === trajectoryPoints.length - 1 ? 0xef4444 : 0x3b82f6
          });
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.copy(point);
          sphere.castShadow = true;
          scene.add(sphere);
        });

        // Launch point marker
        const launchGeometry = new THREE.ConeGeometry(5, 20, 8);
        const launchMaterial = new THREE.MeshLambertMaterial({ color: 0x10b981 });
        const launchMarker = new THREE.Mesh(launchGeometry, launchMaterial);
        launchMarker.position.copy(trajectoryPoints[0]);
        launchMarker.rotation.x = Math.PI;
        launchMarker.castShadow = true;
        scene.add(launchMarker);

        // Landing point marker
        const landingGeometry = new THREE.ConeGeometry(5, 20, 8);
        const landingMaterial = new THREE.MeshLambertMaterial({ color: 0xef4444 });
        const landingMarker = new THREE.Mesh(landingGeometry, landingMaterial);
        landingMarker.position.copy(trajectoryPoints[trajectoryPoints.length - 1]);
        landingMarker.castShadow = true;
        scene.add(landingMarker);

        // --- Camera fit to trajectory (use same logic as resetView) ---
        const box = new THREE.Box3().setFromPoints(trajectoryPoints);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5;
        camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
        camera.lookAt(center);
        controls.target.copy(center);
        // --- End camera fit ---
      }

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // Handle resize
      const handleResize = () => {
        if (!mountRef.current) return;
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };

      window.addEventListener('resize', handleResize);

      // Cleanup function
      return () => {
        window.removeEventListener('resize', handleResize);
        if (mountRef.current && renderer.domElement) {
          mountRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };
    };

    initThreeJS();
  }, [prediction, unitSystem]);

  if (!prediction) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-6xl mb-4">🌍</div>
          <h3 className="text-xl font-semibold mb-2">3D Flight Visualization</h3>
          <p>Run a prediction first to view the 3D trajectory</p>
        </div>
      </div>
    );
  }

  if (!prediction.path || prediction.path.length < 2) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-6xl mb-4">🌍</div>
          <h3 className="text-xl font-semibold mb-2">3D Flight Visualization</h3>
          <p>Prediction path is missing or too short to display a trajectory.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-[400px] max-h-[600px] h-[50vh] relative">
      <div ref={mountRef} className="w-full h-full rounded-lg overflow-hidden" />
      <div className="absolute top-4 left-4 bg-gray-800/80 p-3 rounded-lg text-sm z-10">
        <div className="text-cyan-300 font-semibold mb-2">3D Flight Path</div>
        <div className="space-y-1 text-gray-300">
          <div>🟢 Launch Point</div>
          <div>🔴 Landing Point</div>
          <div>🔵 Trajectory Points</div>
        </div>
        <button
          onClick={resetView}
          className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow transition"
        >
          Reset 3D View
        </button>
      </div>
    </div>
  );
};

export default ThreeDVisualization; 