import React, { useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, extend, useThree } from "react-three-fiber";
import { useSpring, a } from "react-spring/three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import Stats from "three/examples/jsm/libs/stats.module";
import { Button } from "antd";

extend({ OrbitControls });

function Effect({ stats }) {
  useFrame(({ gl, camera, scene }) => {
    stats.update();
  });
  return null;
}

function Controls() {
  const constrolRef = useRef();
  const { camera, gl } = useThree();
  useFrame(() => {
    constrolRef.current.update();
  });
  return (
    <orbitControls
      enableDamping
      ref={constrolRef}
      args={[camera, gl.domElement]}
    />
  );
}

function Cube({ envMap }) {
  const cube = useRef();
  const [isHover, setHover] = useState(false);
  useFrame(() => {
    cube.current.rotation.y += 0.01;
  });
  const {gl} = useThree()
  console.log(gl)
  const colorV1 =
    "#" + new THREE.Color("hotpink").convertSRGBToLinear().getHexString();
  const colorV2 =
    "#" + new THREE.Color("gray").convertSRGBToLinear().getHexString();
  const props = useSpring({
    color: isHover ? colorV1 : colorV2,
    scale: isHover ? [2, 2, 2] : [1, 1, 1]
  });
  return (
    <a.mesh
      ref={cube}
      onClick={e => console.log(e)}
      onPointerOver={e => setHover(true)}
      onPointerOut={e => setHover(false)}
      onUpdate={self => {
        if (envMap) {
          self.material.envMap = envMap;
          self.material.needsUpdate = true;
        }
      }}
      scale={props.scale}
      castShadow
    >
      <boxBufferGeometry attach="geometry" />
      <a.meshStandardMaterial attach="material" color={props.color} />
    </a.mesh>
  );
}

export default function Main() {
  const [scene, setScene] = useState();
  const [statsRefs, setStatsRefs] = useState([]);
  const [objs, setObjs] = useState([]);
  return (
    <>
      <Button
        onClick={() => {
          const obj = {
            geometry: new THREE.BoxBufferGeometry(),
            material: new THREE.MeshStandardMaterial()
          };
          setObjs(prevState => [...prevState, obj]);
        }}
      ></Button>
      <Canvas
        style={{ height: "50%" }}
        camera={{ position: [5, 1, 0] }}
        onCreated={({ gl, scene }) => {
          console.log(scene)
          setScene(scene)
          const stats = new Stats();
          gl.domElement.parentElement.appendChild(stats.domElement);
          stats.domElement.style.position = "absolute";
          setStatsRefs(prevState => [...prevState, stats]);

          gl.gammaOutput = true;
          gl.gammaFactor = 2.2;
          gl.physicallyCorrectLights = true;
        }}
      >
        <directionalLight intensity={3} position={[0, 5, 3]} />
        <Controls />
        <Cube />
        {objs.map((obj, index) => {
          return (
            <mesh
              key={index}
              position={[index,0,0]}
              geometry={obj.geometry}
              material={obj.material}
            ></mesh>
          );
        })}
        <Effect stats={statsRefs[0]} />
      </Canvas>
      <Canvas
        style={{ height: "50%" }}
        camera={{ position: [0, 1, 5] }}
        onCreated={({ gl, scene }) => {
          const stats = new Stats();
          gl.domElement.parentElement.appendChild(stats.domElement);
          stats.domElement.style.position = "absolute";
          setStatsRefs(prevState => [...prevState, stats]);

          gl.gammaOutput = true;
          gl.gammaFactor = 2.2;
          gl.physicallyCorrectLights = true;
        }}
      >
        <Controls />
        {scene && <primitive object={scene}/>}
        <Effect stats={statsRefs[1]} />
      </Canvas>
    </>
  );
}
