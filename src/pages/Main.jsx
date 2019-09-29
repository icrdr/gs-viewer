import React, { useRef, useState } from "react";
import { Canvas, useFrame, extend, useThree } from "react-three-fiber";
import { useSpring, a } from "react-spring/three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
extend({ OrbitControls });

function Controls() {
  const constrol = useRef();
  const { camera, gl } = useThree();
  useFrame(() => {
    constrol.current.update();
  });
  return <orbitControls ref={constrol} args={[camera, gl.domElement]} />;
}

function Thing() {
  const cube = useRef();
  const [isHover, setHover] = useState(false);
  useFrame(() => {
    cube.current.rotation.y += 0.01;
  });
  const props = useSpring({
    color: isHover ? "hotpink" : "gray",
    scale: isHover ? [2, 2, 2] : [1, 1, 1]
  });
  return (
    <a.mesh
      ref={cube}
      onClick={e => console.log("click")}
      onPointerOver={e => setHover(true)}
      onPointerOut={e => setHover(false)}
      scale={props.scale}
    >
      <boxGeometry attach="geometry" />
      <a.meshBasicMaterial attach="material" color={props.color} />
    </a.mesh>
  );
}

export default function Main() {
  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <Thing />
      <Controls />
    </Canvas>
  );
}
