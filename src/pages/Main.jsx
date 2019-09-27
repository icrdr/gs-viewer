import React, { useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from 'react-three-fiber'

function Thing() {
  const ref = useRef()
  useFrame(() => (ref.current.rotation.y += 0.01))
  return (
    <group ref={ref}>
      <mesh
        onClick={e => console.log('click')}
        onPointerOver={e => console.log('hover')}
        onPointerOut={e => console.log('unhover')}>
        <octahedronGeometry attach="geometry" />
        <meshBasicMaterial attach="material" color="peachpuff" opacity={0.5} transparent />
      </mesh>
    </group>
  )
}

export default function Main() {
  return (
    <Canvas style={{ height: '500px' }}>
      <Thing />
    </Canvas>
  )
}
