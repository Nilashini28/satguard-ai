"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SatelliteState } from '@/types/satellite';

interface EarthGlobeProps {
  satellites: SatelliteState[];
  onSatelliteClick?: (satellite: SatelliteState) => void;
}

export default function EarthGlobe({ satellites, onSatelliteClick }: EarthGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const earthRef = useRef<THREE.Mesh | null>(null);
  const satelliteMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const [webglSupported, setWebglSupported] = useState(true);
  const [tooltip, setTooltip] = useState<{ name: string; altitude: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 1.5;
    controls.maxDistance = 10;

    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);

    const sunPosition = new THREE.Vector3(1, 0.5, 1).normalize();
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.copy(sunPosition);
    scene.add(directionalLight);

    const earthGeometry = new THREE.SphereGeometry(1, 64, 64);

    const textureLoader = new THREE.TextureLoader();
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'),
      bumpMap: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-topology.png'),
      bumpScale: 0.05,
      specular: new THREE.Color(0x333333),
      shininess: 5
    });

    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);
    earthRef.current = earth;

    const atmosphereGeometry = new THREE.SphereGeometry(1.02, 64, 64);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    renderer.domElement.addEventListener('click', (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(Array.from(satelliteMeshesRef.current.values()));

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh;
        const satId = Array.from(satelliteMeshesRef.current.entries()).find(([, m]) => m === clickedMesh)?.[0];
        const sat = satellites.find(s => s.noradId === satId);
        if (sat && onSatelliteClick) {
          onSatelliteClick(sat);
        }
      }
    });

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (earthRef.current) {
        earthRef.current.rotation.y += 0.0005;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !earthRef.current) return;

    const earth = earthRef.current;
    const scene = sceneRef.current;

    satelliteMeshesRef.current.forEach((mesh) => {
      scene.remove(mesh);
    });
    satelliteMeshesRef.current.clear();

    satellites.forEach((sat) => {
      const radius = 1 + sat.altitude / 6371;
      const phi = (90 - sat.lat) * Math.PI / 180;
      const theta = (sat.lng + 180) * Math.PI / 180;

      const x = -radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      const adjustedPos = new THREE.Vector3(x, y, z);
      adjustedPos.applyEuler(earth.rotation);

      let color: number;
      switch (sat.status) {
        case 'critical': color = 0xff4444; break;
        case 'warning': color = 0xffaa00; break;
        default: color = 0x00ff88;
      }

      const satGeometry = new THREE.SphereGeometry(0.02, 16, 16);
      const satMaterial = new THREE.MeshBasicMaterial({ color });
      const satMesh = new THREE.Mesh(satGeometry, satMaterial);
      satMesh.position.copy(adjustedPos);

      scene.add(satMesh);
      satelliteMeshesRef.current.set(sat.noradId, satMesh);
    });
  }, [satellites]);

  if (!webglSupported) {
    return (
      <div className="relative bg-card border border-border rounded-xl p-4">
        <div className="text-center text-gray-400">
          <p>3D Globe not supported</p>
          <p className="text-sm mt-2">Please use a WebGL-enabled browser</p>
        </div>
        <div className="mt-4 relative">
          <svg viewBox="0 0 360 180" className="w-full h-48">
            <defs>
              <linearGradient id="ocean" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0a1929" />
                <stop offset="100%" stopColor="#0d2137" />
              </linearGradient>
            </defs>
            <ellipse cx="180" cy="90" rx="170" ry="80" fill="url(#ocean)" />
            <path d="M40,90 Q90,60 180,90 Q270,120 320,90" fill="none" stroke="#1e3a5f" strokeWidth="2" />
            <path d="M20,70 Q180,40 340,70" fill="none" stroke="#1e3a5f" strokeWidth="1" opacity="0.5" />
            <path d="M20,110 Q180,140 340,110" fill="none" stroke="#1e3a5f" strokeWidth="1" opacity="0.5" />
            {satellites.map((sat, i) => {
              const x = ((sat.lng + 180) / 360) * 340 + 10;
              const y = ((90 - sat.lat) / 180) * 140 + 20;
              const color = sat.status === 'critical' ? '#ef4444' : sat.status === 'warning' ? '#f59e0b' : '#22c55e';
              return (
                <g key={sat.noradId}>
                  <circle cx={x} cy={y} r="4" fill={color} className="animate-pulse" />
                  <text x={x + 8} y={y + 4} fill="#9ca3af" fontSize="8">{sat.name.split(' ')[0]}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full h-80 rounded-xl overflow-hidden bg-darker/50" />
      {tooltip && (
        <div
          className="absolute bg-card border border-border rounded-lg px-3 py-2 shadow-lg pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-semibold text-sm">{tooltip.name}</div>
          <div className="text-xs text-gray-400">{tooltip.altitude}</div>
        </div>
      )}
    </div>
  );
}