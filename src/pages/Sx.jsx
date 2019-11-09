import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, extend, useThree } from "react-three-fiber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { PMREMGenerator } from "three/examples/jsm/pmrem/PMREMGenerator.js";
import { PMREMCubeUVPacker } from "three/examples/jsm/pmrem/PMREMCubeUVPacker.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";

import Stats from "three/examples/jsm/libs/stats.module";
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
  useEffect(() => {
    new GLTFLoader().load(url, node => {
      const mergeMeshs = [];
      node.scene.traverse(function(child) {
        if (child instanceof THREE.Mesh) {
          let matchMesh;
          for (const mesh of mergeMeshs) {
            if (mesh.material.uuid === child.material.uuid) {
              matchMesh = mesh;
              break;
            }
          }
          if (matchMesh) {
            const bufGeometry = new THREE.Geometry().fromBufferGeometry(
              child.geometry
            );
            matchMesh.geometry.merge(bufGeometry, bufGeometry.matrix);
          } else {
            const emptyGeometry = new THREE.Geometry();
            const geometry = new THREE.Geometry().fromBufferGeometry(
              child.geometry
            );
            emptyGeometry.merge(geometry, geometry.matrix);
            mergeMeshs.push({
              geometry: emptyGeometry,
              material: child.material
            });
          }
        }
      });
      for (const mesh of mergeMeshs) {
        const bufGeometry = new THREE.BufferGeometry().fromGeometry(
          mesh.geometry
        );
        mesh.geometry = bufGeometry;
        mesh.material.normalScale.y = -1;
      }
      console.log(mergeMeshs);
      setModels(mergeMeshs);
    });
    // eslint-disable-next-line
  }, []);
  return models.map((model, index) => (
    <mesh
      key={index}
      // onPointerOver={e => setHover(true)}
      // onPointerOut={e => setHover(false)}
      onUpdate={self => {
        if (envMap) {
          self.material.envMap = envMap;
          self.material.needsUpdate = true;
        }
      }}
      geometry={model.geometry}
      material={model.material}
    ></mesh>
  ));
}

export default function Main() {
  const [textureCube, setTextureCube] = useState();
  const [statsRef, setStatsRef] = useState();
  return (
    <>
      <Canvas
        camera={{ position: [0, 0.2, 1] }}
        shadowMap
        onCreated={({ gl, scene }) => {
          const stats = new Stats();
          gl.domElement.parentElement.appendChild(stats.domElement);
          stats.domElement.style.position = "absolute";
          setStatsRef(stats);

          gl.gammaOutput = true;
          gl.gammaFactor = 2.2;
          gl.physicallyCorrectLights = true;

          new RGBELoader()
            .setDataType(THREE.UnsignedByteType)
            .load("/static/textures/leadenhall_market_1k.hdr", function(
              texture
            ) {
              const options = {
                generateMipmaps: false,
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter
              };
              const cubemapGenerator = new THREE.WebGLRenderTargetCube(
                512,
                512,
                options
              ).fromEquirectangularTexture(gl, texture);

              const pmremGenerator = new PMREMGenerator(
                cubemapGenerator.texture
              );
              pmremGenerator.update(gl);

              const pmremCubeUVPacker = new PMREMCubeUVPacker(
                pmremGenerator.cubeLods
              );
              pmremCubeUVPacker.update(gl);

              texture.dispose();
              pmremGenerator.dispose();
              pmremCubeUVPacker.dispose();
              scene.background = cubemapGenerator;
              setTextureCube(pmremCubeUVPacker.CubeUVRenderTarget.texture);
            });
        }}
      >
        <directionalLight intensity={3} position={[0, 5, 3]} castShadow />
        <Controls />
        <Model url="/static/models/test/test.gltf" envMap={textureCube} />
        <Effect stats={statsRef} />
      </Canvas>
    </>
  );
}
