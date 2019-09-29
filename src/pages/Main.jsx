import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, extend, useThree } from "react-three-fiber";
import { useSpring, a } from "react-spring/three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { EquirectangularToCubeGenerator } from "three/examples/jsm/loaders/EquirectangularToCubeGenerator.js";
import { PMREMGenerator } from "three/examples/jsm/pmrem/PMREMGenerator.js";
import { PMREMCubeUVPacker } from "three/examples/jsm/pmrem/PMREMCubeUVPacker.js";

import Stats from "three/examples/jsm/libs/stats.module";
import { Switch } from "antd";
extend({ OrbitControls });

function Effect({ stats }) {
  useFrame(() => {
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

function Model({ url, envMap }) {
  const [models, setModels] = useState([]);
  const [isHover, setHover] = useState(false);
  useEffect(() => {
    new GLTFLoader().load(url, object => {
      object.scene.traverse(function(child) {
        if (child instanceof THREE.Mesh) {
          setModels(prevState => [...prevState, child]);
        }
      });
    });
    // eslint-disable-next-line
  }, []);
  const props = useSpring({
    scale: isHover ? [2, 2, 2] : [1, 1, 1]
  });
  return models.map((model, index) => (
    <a.mesh
      key={index}
      onPointerOver={e => setHover(true)}
      onPointerOut={e => setHover(false)}
      scale={props.scale}
      geometry={model.geometry}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        attach="material"
        map={model.material.map}
        metalnessMap={model.material.metalnessMap}
        normalMap={model.material.normalMap}
        roughnessMap={model.material.roughnessMap}
        envMap={envMap}
      />
    </a.mesh>
  ));
}

function Plane({ color, envMap }) {
  const props = useSpring({
    color: color ? "hotpink" : "gray",
  });
  return (
    <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeBufferGeometry attach="geometry" args={[10, 10, 10]} />
      <a.meshStandardMaterial
        attach="material"
        color={props.color}
        onUpdate={self => {
          if (envMap) {
            console.log(envMap);
            self.needsUpdate = true;
          }
        }}
        envMap={envMap}
        roughness={0.5}
        metalness={0.0}
      />
    </mesh>
  );
}

function Cube() {
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
      castShadow
    >
      <boxBufferGeometry attach="geometry" />
      <a.meshStandardMaterial attach="material" color={props.color} />
    </a.mesh>
  );
}

export default function Main() {
  const [textureCube, setTextureCube] = useState();
  const [color, setColor] = useState(false);
  const [statsRef, setStatsRef] = useState();
  return (
    <>
      <Switch checked={color} onChange={() => setColor(!color)}></Switch>
      <Canvas
        className="ff"
        camera={{ position: [0, 5, 10] }}
        shadowMap
        onCreated={({ gl, scene }) => {
          const stats = new Stats();
          gl.domElement.parentElement.appendChild(stats.domElement);
          stats.domElement.style.position = "absolute";
          console.log(gl.domElement);
          setStatsRef(stats);
          new EXRLoader()
            .setDataType(THREE.FloatType)
            .load("/static/textures/piz_compressed.exr", function(texture) {
              texture.minFilter = THREE.NearestFilter;
              // texture.magFilter = THREE.NearestFilter;
              texture.encoding = THREE.LinearEncoding;
              const cubemapGenerator = new EquirectangularToCubeGenerator(
                texture,
                { resolution: 512, type: THREE.HalfFloatType }
              );

              const cubeMapTexture = cubemapGenerator.update(gl);
              const pmremGenerator = new PMREMGenerator(cubeMapTexture);
              pmremGenerator.update(gl);
              const pmremCubeUVPacker = new PMREMCubeUVPacker(
                pmremGenerator.cubeLods
              );
              pmremCubeUVPacker.update(gl);

              texture.dispose();
              pmremGenerator.dispose();
              pmremCubeUVPacker.dispose();

              const exrBackground = cubemapGenerator.renderTarget;
              const exrCubeRenderTarget = pmremCubeUVPacker.CubeUVRenderTarget;
              console.log(exrBackground);
              scene.background = exrBackground;
              setTextureCube(exrCubeRenderTarget.texture);
              console.log(exrCubeRenderTarget);
            });
        }}
      >
        <ambientLight intensity={0.1} />
        <directionalLight position={[0, 5, 3]} castShadow />
        {/* <Cube /> */}
        <Plane color={color} envMap={textureCube} />
        <Controls />
        <Model url="/static/models/meetMat/MeetMat.gltf" envMap={textureCube} />
        <Effect stats={statsRef} />
      </Canvas>
    </>
  );
}
