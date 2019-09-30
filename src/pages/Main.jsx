import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, extend, useThree } from "react-three-fiber";
import { useSpring, a } from "react-spring/three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EquirectangularToCubeGenerator } from "three/examples/jsm/loaders/EquirectangularToCubeGenerator.js";
import { PMREMGenerator } from "three/examples/jsm/pmrem/PMREMGenerator.js";
import { PMREMCubeUVPacker } from "three/examples/jsm/pmrem/PMREMCubeUVPacker.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";

import Stats from "three/examples/jsm/libs/stats.module";
import { Switch } from "antd";
extend({ OrbitControls, EffectComposer, ShaderPass, RenderPass });

function Effect({ stats }) {
  const { gl, scene, camera, size } = useThree();
  const composer = useRef();
  useEffect(() => {
    composer.current.setSize(size.width, size.height);
  }, [size]);

  useFrame(() => {
    composer.current.render();
    stats.update();
  });
  return (
    <effectComposer ref={composer} args={[gl]}>
      <renderPass attachArray="passes" args={[scene, camera]} />
      <shaderPass
        attachArray="passes"
        args={[FXAAShader]}
        uniforms-resolution-value={[1 / size.width, 1 / size.height]}
        renderToScreen
      />
    </effectComposer>
  );
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
          console.log(child.material.normalScale.y);
          child.material.normalScale.y = -1;
          setModels(prevState => [...prevState, child]);
        }
      });
    });
    // eslint-disable-next-line
  }, []);
  const props = useSpring({
    scale: isHover ? [1.2, 1.2, 1.2] : [1, 1, 1]
  });
  return models.map((model, index) => (
    <a.mesh
      key={index}
      onPointerOver={e => setHover(true)}
      onPointerOut={e => setHover(false)}
      onUpdate={self => {
        if (envMap) {
          self.material.envMap = envMap;
          self.material.needsUpdate = true;
        }
      }}
      scale={props.scale}
      geometry={model.geometry}
      material={model.material}
      castShadow
      receiveShadow
    />
  ));
}

function Plane({ color, envMap }) {
  const props = useSpring({
    color: color ? "hotpink" : "gray"
  });
  return (
    <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeBufferGeometry attach="geometry" args={[10, 10, 10]} />
      <a.meshStandardMaterial
        attach="material"
        color={props.color}
        onUpdate={self => {
          if (envMap) {
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
        camera={{ position: [0, 2, 5] }}
        shadowMap
        onCreated={({ gl, scene }) => {
          const stats = new Stats();
          gl.domElement.parentElement.appendChild(stats.domElement);
          stats.domElement.style.position = "absolute";
          setStatsRef(stats);

          gl.gammaOutput = true;
          gl.gammaFactor = 2.2;

          new RGBELoader()
            .setDataType(THREE.UnsignedByteType)
            .load("/static/textures/lakes_2k.hdr", function(texture) {
              const cubemapGenerator = new EquirectangularToCubeGenerator(
                texture,
                { resolution: 1024 }
              );
              cubemapGenerator.update(gl);

              const pmremGenerator = new PMREMGenerator(
                cubemapGenerator.renderTarget.texture
              );
              pmremGenerator.update(gl);

              const pmremCubeUVPacker = new PMREMCubeUVPacker(
                pmremGenerator.cubeLods
              );
              pmremCubeUVPacker.update(gl);

              texture.dispose();
              pmremGenerator.dispose();
              pmremCubeUVPacker.dispose();
              scene.background = cubemapGenerator.renderTarget;
              setTextureCube(pmremCubeUVPacker.CubeUVRenderTarget.texture);
            });
        }}
      >
        <directionalLight position={[0, 5, 3]} castShadow />
        {/* <Cube /> */}
        {/* <Plane color={color} envMap={textureCube} /> */}
        <Controls />
        <Model url="/static/models/sphere/test.gltf" envMap={textureCube} />
        <Effect stats={statsRef} />
      </Canvas>
    </>
  );
}
