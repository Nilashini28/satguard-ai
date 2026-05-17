'use client'
import { useEffect, useRef, useState } from 'react'
import { SatelliteState } from '@/types/satellite'

const COLORS = { nominal: '#22c55e', warning: '#f59e0b', critical: '#ef4444' }

export function Globe({ satellites }: { satellites: SatelliteState[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [supported, setSupported] = useState(true)
  const [tooltip, setTooltip] = useState<{ name: string; alt: number; x: number; y: number } | null>(null)

  useEffect(() => {
    const c = document.createElement('canvas')
    if (!c.getContext('webgl') && !c.getContext('experimental-webgl')) {
      setSupported(false); return
    }
    let raf: number
    let renderer: import('three').WebGLRenderer

    async function init() {
      if (!ref.current) return
      const THREE = await import('three')
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

      const w = ref.current.clientWidth
      const h = ref.current.clientHeight

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)
      camera.position.z = 2.8

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      ref.current.appendChild(renderer.domElement)

      scene.add(new THREE.AmbientLight(0x334455))
      const sun = new THREE.DirectionalLight(0xffffff, 1.2)
      sun.position.set(5, 3, 5)
      scene.add(sun)

      const earthGeo = new THREE.SphereGeometry(1, 64, 64)
      const loader = new THREE.TextureLoader()
      let earthMat: any
      try {
        const tex = await loader.loadAsync('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        earthMat = new THREE.MeshPhongMaterial({ map: tex })
      } catch {
        earthMat = new THREE.MeshPhongMaterial({ color: 0x1a3a5c })
      }
      const earth = new THREE.Mesh(earthGeo, earthMat)
      scene.add(earth)

      const satMeshes: any[] = []
      satellites.forEach(sat => {
        const phi = (90 - sat.lat) * Math.PI / 180
        const theta = (sat.lng + 180) * Math.PI / 180
        const r = 1 + sat.altitude / 6371
        const x = -r * Math.sin(phi) * Math.cos(theta)
        const y = r * Math.cos(phi)
        const z = r * Math.sin(phi) * Math.sin(theta)
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.02, 8, 8),
          new THREE.MeshBasicMaterial({ color: COLORS[sat.status] })
        )
        mesh.position.set(x, y, z)
        scene.add(mesh)
        satMeshes.push(mesh)

        const pts = []
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2
          pts.push(new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a)))
        }
        const orbit = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: COLORS[sat.status], opacity: 0.2, transparent: true })
        )
        orbit.rotation.x = (sat.lat * Math.PI) / 180
        scene.add(orbit)
      })

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.minDistance = 1.5
      controls.maxDistance = 6

      const raycaster = new THREE.Raycaster()
      const mouse = new THREE.Vector2()
      renderer.domElement.addEventListener('click', e => {
        if (!ref.current) return
        const rect = ref.current.getBoundingClientRect()
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
        raycaster.setFromCamera(mouse, camera)
        const hits = raycaster.intersectObjects(satMeshes)
        if (hits.length > 0) {
          const idx = satMeshes.indexOf(hits[0].object)
          const sat = satellites[idx]
          if (sat) {
            setTooltip({ name: sat.name, alt: sat.altitude, x: e.clientX - rect.left, y: e.clientY - rect.top })
            setTimeout(() => setTooltip(null), 3000)
          }
        }
      })

      function animate() {
        raf = requestAnimationFrame(animate)
        earth.rotation.y += 0.0004
        controls.update()
        renderer.render(scene, camera)
      }
      animate()
    }

    init()
    return () => { cancelAnimationFrame(raf); renderer?.dispose() }
  }, [satellites])

  if (!supported) return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 h-64 flex items-center justify-center">
      <p className="text-gray-500 text-sm">WebGL not available</p>
    </div>
  )

  return (
    <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden relative">
      <div ref={ref} className="w-full h-64 md:h-72" />
      {tooltip && (
        <div className="absolute bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white pointer-events-none z-10"
          style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}>
          <p className="font-medium">{tooltip.name}</p>
          <p className="text-gray-400">{tooltip.alt.toFixed(1)} km</p>
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex gap-2">
        {[['#22c55e', 'Nominal'], ['#f59e0b', 'Warning'], ['#ef4444', 'Critical']].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />{l}
          </span>
        ))}
      </div>
    </div>
  )
}