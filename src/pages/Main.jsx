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

// react gui
import { Switch, Button } from "antd";

extend({ OrbitControls });

function Effect({ stats }) {
  useFrame(() => {
    stats.update();
  });
  return null;
}

function Slices({ volume, index, gui }) {
  const [slice, setSlice] = useState();
  const [cube, setCube] = useState();
  const sliceRef = useRef();
  const grpRef = useRef();
  const helpRef = useRef();
  const { camera, gl } = useThree();
  useEffect(() => {
    //cube helper
    const geometry = new THREE.BoxBufferGeometry(
      volume.RASDimensions[0],
      volume.RASDimensions[1],
      volume.RASDimensions[2]
    );
    const material = new THREE.MeshBasicMaterial();
    setCube(new THREE.Mesh(geometry, material));
    const depth = 1;
    //create slice plane
    const slice = volume.extractSlice(
      new THREE.Vector3(0, 1, 1).normalize(),
      0,
      depth
    );
    setSlice(slice);

    gui.add(grpRef.current.userData, "followCamera").onChange(e => {
      grpRef.current.userData.followCamera=e
    });

    gui
      .add(slice, "index", 0, 500, 1)
      .name("Slice Index");

    gui
      .add(slice, "depth", 0.2, 1, 0.1)
      .name("Slice Render Depth");

    gui
      .add(volume, "lowerThreshold", volume.min, volume.max, 1)
      .name("Lower Threshold");
    gui
      .add(volume, "upperThreshold", volume.min, volume.max, 1)
      .name("Upper Threshold");
    gui.add(volume, "windowLow", volume.min, volume.max, 1).name("Window Low");
    gui
      .add(volume, "windowHigh", volume.min, volume.max, 1)
      .name("Window High");
    // eslint-disable-next-line
  }, []);

  useFrame(() => {
    var vector = new THREE.Vector3(0, 0, 1);
    if (grpRef.current.userData.followCamera) {
      vector.applyQuaternion(camera.quaternion);
      slice.axis.copy(vector);
    }
    slice.repaint();
  });

  return (
    <group ref={grpRef} userData={{ followCamera: true }}>
      {cube && <boxHelper args={[cube]} />}
      {slice && <primitive ref={sliceRef} object={slice.mesh} />}
      <axesHelper ref={helpRef} args={[20]} position={[50, 20, 5]} />
      <VTKmodel
        url="./static/models/vtk/liver.vtk"
        offset={[0,0,0]}
        // offset={[-volume.offset[0], -volume.offset[1], -volume.offset[2]]}
        gui={gui}
      />
    </group>
  );
}

function VTKmodel({ url, offset, gui }) {
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

  if (geo) {
    return (
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
    );
  } else {
    return null;
  }
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
      <orthographicCamera ref={camRef} {...props} />
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
    loader.load("liver.nrrd", function(v) {
      setVolume(v);
      console.log(v);
    });
  };

  return (
    <>
      <Canvas
        onCreated={({ gl }) => {
          init(gl);
        }}
      >
        <Camera near={0.01} far={10000} />
        <Effect stats={statsRef} />
        {volume && <Slices volume={volume} gui={guiRef} />}
        <directionalLight intensity={3} position={[0, 5, 3]} castShadow />
        <hemisphereLight intensity={1} skyColor={0xffffbb} groundColor={0x080820}/>
        <axesHelper args={[50]} position={[0, 0, 0]} />
      </Canvas>
      <Button className="pos:a bottom:0" block onClick={() => setFlash(!flash)}>
        flash
      </Button>
    </>
  );
}
