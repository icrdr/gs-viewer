/* eslint-disable no-unused-vars */
import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, extend, useThree } from "react-three-fiber";
import { useSpring, a } from "react-spring/three";
import * as THREE from "three";
import * as dat from "dat.gui";
import Stats from "three/examples/jsm/libs/stats.module";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// loader
import { NRRDLoader } from "../jsm/loaders/NRRDLoader";
import { VTKLoader } from "three/examples/jsm/loaders/VTKLoader";

import { VolumeSlice } from "../jsm/classes/VolumeSlice";
import { vShader } from "../jsm/shaders/vShader";

// react gui
import { Switch, Button } from "antd";

extend({ OrbitControls });

function promisifyLoader(loader, url, onProgress) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, onProgress, reject);
  });
}

function Effect({ stats }) {
  useFrame(() => {
    stats.update();
  });
  return null;
}

function Slices({ volume, gui }) {
  const [slice, setSlice] = useState();
  const [cube, setCube] = useState();
  const sliceRef = useRef();
  const grpRef = useRef();

  const { camera, gl } = useThree();

  useEffect(() => {
    //cube helper
    const geometry = new THREE.BoxBufferGeometry(
      240,
      240,
      169.5
    );

    const uniforms = THREE.UniformsUtils.clone(vShader.uniforms);
    uniforms["volume_data"].value = volume;
    uniforms["xyz_to_ras_m4"].value = volume.matrix4;

    const material = new THREE.ShaderMaterial({
      transparent: true,
      alphaTest:0.5,
      uniforms: uniforms,
      vertexShader: vShader.vertexShader,
      fragmentShader: vShader.fragmentShader
    });

    const mesh = new THREE.Mesh(geometry, material);
    // mesh.applyMatrix(volume.matrix4);
    setCube(mesh);

    const slice = new VolumeSlice(
      volume,
      0,
      new THREE.Vector3(1, 1, 1).normalize()
    );
    setSlice(slice);

    gui.add(slice, "index", 0, slice._sliceWidth, 1).name("Slice Index");
    gui.add(slice, "min", volume.min, volume.max, 1).name("min");
    gui.add(slice, "max", volume.min, volume.max, 1).name("max");

    gui.add(grpRef.current.userData, "value_t",0,1,0.02).onChange(e => {
      mesh.material.uniforms['value_t'].value = e;
    });

    gui.add(grpRef.current.userData, "followCamera").onChange(e => {
      grpRef.current.userData.followCamera = e;
    });
    // eslint-disable-next-line
  }, []);

  useFrame(() => {
    var vector = new THREE.Vector3(0, 0, 1);
    if (grpRef.current.userData.followCamera) {
      vector.applyQuaternion(camera.quaternion);
      slice.axis = vector;
    }
  });

  return (
    <group ref={grpRef} userData={{ followCamera: true, value_t:0.5}}>
      {cube && <boxHelper args={[cube]} />}
      {cube && <primitive object={cube} />}
      {slice && <primitive ref={sliceRef} object={slice.mesh} />}
      <VTKmodel url="./static/models/vtk/liver.vtk" gui={gui} />
      <group
        position={[-volume.offset3.x, -volume.offset3.y, -volume.offset3.z]}
      >
        {/* <VTKmodel url="./static/models/vtk/k.vtk" gui={gui} />
        <VTKmodel url="./static/models/vtk/k_a.vtk" gui={gui} />
        <VTKmodel url="./static/models/vtk/k_v.vtk" gui={gui} /> */}
      </group>
    </group>
  );
}

function VTKmodel({ url, offset = [0, 0, 0], gui }) {
  const [geo, setGeo] = useState();
  const meshRef = useRef();
  useEffect(() => {
    new VTKLoader().load(url, geo => {
      setGeo(geo);
    });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (meshRef.current) {
      console.log(meshRef.current);
      gui.add(meshRef.current.material, "opacity", 0, 1, 0.01).name("Opacity");
    }
    // eslint-disable-next-line
  }, [geo]);

  return geo ? (
    <mesh
      ref={meshRef}
      geometry={geo}
      material={
        new THREE.MeshStandardMaterial({
          color: new THREE.Color("white"),
          transparent: true
        })
      }
      position={offset}
    ></mesh>
  ) : null;
}

function Control() {
  const ctlRef = useRef();
  const { camera, gl } = useThree();
  useFrame(() => {
    ctlRef.current.update();
  });

  return (
    <orbitControls enableDamping ref={ctlRef} args={[camera, gl.domElement]} />
  );
}

function Camera(props) {
  const camRef = useRef();
  const { setDefaultCamera } = useThree();

  useEffect(() => {
    setDefaultCamera(camRef.current);
    camRef.current.position.set(0, 0, 1000);
    // eslint-disable-next-line
  }, []);

  return (
    <>
      <perspectiveCamera ref={camRef} {...props} />
      {camRef && <Control />}
    </>
  );
}

export default function Main() {
  const [volume, setVolume] = useState();
  const [statsRef, setStatsRef] = useState();
  const [guiRef, setGuiRef] = useState();
  const [flash, setFlash] = useState(false);

  console.log("rerender");

  const init = gl => {
    const stats = new Stats();
    setStatsRef(stats);
    gl.domElement.parentElement.appendChild(stats.domElement);
    stats.domElement.style.position = "absolute";

    const gui = new dat.GUI();
    setGuiRef(gui);

    gl.gammaOutput = true;
    gl.gammaFactor = 2.2;
    gl.physicallyCorrectLights = true;

    const loader = new NRRDLoader();
    loader.setPath("./static/slices/");
    loader.load("liver.nrrd", function(volumeTexture) {
      setVolume(volumeTexture);
    });
  };

  return (
    <>
      <Canvas
        gl2
        onCreated={({ gl }) => {
          init(gl);
        }}
      >
        <Camera near={0.01} far={10000} />
        <Effect stats={statsRef} />
        {volume && <Slices volume={volume} gui={guiRef} />}
        <directionalLight intensity={3} position={[0, 5, 3]} castShadow />
        <hemisphereLight
          intensity={1}
          skyColor={0xffffbb}
          groundColor={0x080820}
        />
        <axesHelper args={[50]} position={[0, 0, 0]} />
      </Canvas>
      <Button className="pos:a bottom:0" block onClick={() => setFlash(!flash)}>
        flash
      </Button>
    </>
  );
}
