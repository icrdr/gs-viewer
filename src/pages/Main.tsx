/* eslint-disable no-unused-vars */
import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, extend, useThree } from "react-three-fiber";
// import { useSpring, a } from "react-spring/three";
import * as THREE from "three";
import * as dat from "dat.gui";
import Stats from "stats.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// loader
import { NRRDLoader } from "../jsm/loaders/NRRDLoader";
import { VTKLoader } from "three/examples/jsm/loaders/VTKLoader";

import { VolumeSlice } from "../jsm/classes/VolumeSlice";
import { VolumeShaderA } from "../jsm/shaders/VolumeShaderA";
import { VolumeShaderB } from "../jsm/shaders/VolumeShaderB";

// react gui
import { Switch, Button } from "antd";
import { VolumeTexture } from "../jsm/classes/VolumeTexture";

extend({ OrbitControls });

// function promisifyLoader(loader, url, onProgress) {
//   return new Promise((resolve, reject) => {
//     loader.load(url, resolve, onProgress, reject);
//   });
// }

const stats = new Stats();
stats.dom.style.position = "absolute";
const gui = new dat.GUI();

const Effect: React.FC<{
  stats: Stats;
}> = ({ stats }) => {
  useFrame(() => {
    stats.update();
  });
  return null;
};

const Slices: React.FC<{
  volume: VolumeTexture;
  gui: dat.GUI;
}> = ({ volume, gui }) => {
  interface cmapColor {
    color: string;
    pos: number;
  }

  const [slice, setSlice] = useState();
  const [cube, setCube] = useState();
  const sliceRef = useRef<THREE.Object3D>();
  const grpRef = useRef<THREE.Group>();

  const { camera, gl } = useThree();

  const updateCtx = (can: HTMLCanvasElement, cmap: Array<cmapColor>) => {
    const ctx = can.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 10, 0);

    cmap.forEach(e => {
      gradient.addColorStop(e.pos, e.color);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 10, 1);
  };

  useEffect(() => {
    const group = grpRef.current!;
    //cube helper
    const geometry = new THREE.BoxBufferGeometry(
      volume.image.width,
      volume.image.height,
      volume.image.depth
    );
    const can = document.createElement("canvas");
    can.width = 10;
    can.height = 1;
    updateCtx(can, group.userData.color_map);

    const canvasMap = new THREE.Texture(can);
    canvasMap.minFilter = THREE.LinearFilter;
    canvasMap.needsUpdate = true;

    const uniforms = THREE.UniformsUtils.clone(VolumeShaderA.uniforms);
    uniforms["cmap"].value = canvasMap;
    uniforms["volume_data"].value = volume;
    uniforms["volume_matrix"].value = volume.matrix4;
    uniforms["window_min"].value = volume.min;
    uniforms["window_max"].value = volume.max;

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: VolumeShaderA.vertexShader,
      fragmentShader: VolumeShaderA.fragmentShader
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.applyMatrix(volume.matrix4);
    setCube(mesh);

    const slice = new VolumeSlice(
      volume,
      0,
      new THREE.Vector3(1, 1, 1).normalize()
    );
    setSlice(slice);

    gui.add(slice, "index", 0, slice.sliceWidth, 1).name("Slice Index");
    gui.add(slice, "min", volume.min, volume.max, 1).name("Slice Min");
    gui.add(slice, "max", volume.min, volume.max, 1).name("Slice Max");

    gui
      .add(group.userData, "volume_min", volume.min, volume.max, 1)
      .name("Volume Min")
      .onChange(e => {
        material.uniforms["window_min"].value = e;
      });
    gui
      .add(group.userData, "volume_max", volume.min, volume.max, 1)
      .name("Volume Max")
      .onChange(e => {
        material.uniforms["window_max"].value = e;
      });

    gui
      .add(group.userData, "surface_level", 0, 1, 0.005)
      .name("Surface Level")
      .onChange(e => {
        material.uniforms["level"].value = e;
      });

    gui.add(group.userData, "followCamera").onChange(e => {
      group.userData.followCamera = e;
    });

    group.userData.color_map.forEach((e: object, i: number) => {
      gui.addColor(e, "color").onChange(v => {
        const cmap = group.userData.color_map;
        cmap[i].color = v;
        updateCtx(can, cmap);
        material.uniforms["cmap"].value.needsUpdate = true;
      });
      gui.add(e, "pos", 0, 1, 0.01).onChange(v => {
        const cmap = group.userData.color_map;
        cmap[i].pos = v;
        updateCtx(can, cmap);
        material.uniforms["cmap"].value.needsUpdate = true;
      });
    });

    const addColor = () => {
      group.userData.color_map.push({
        color: "#ffae23",
        pos: 0.0
      });

      const index = group.userData.color_map.length;
      gui.addColor(group.userData.color_map[index - 1], "color").onChange(v => {
        const cmap = group.userData.color_map;
        cmap[index - 1].color = v;
        updateCtx(can, cmap);
        material.uniforms["cmap"].value.needsUpdate = true;
      });
      gui
        .add(group.userData.color_map[index - 1], "pos", 0, 1, 0.01)
        .onChange(v => {
          const cmap = group.userData.color_map;
          cmap[index - 1].pos = v;
          updateCtx(can, cmap);
          material.uniforms["cmap"].value.needsUpdate = true;
        });
    };

    group.userData["explode"] = addColor;
    gui.add(group.userData, "explode");
    // eslint-disable-next-line
  }, []);

  useFrame(() => {
    if (grpRef.current) {
      var vector = new THREE.Vector3(0, 0, 1);
      if (grpRef.current.userData.followCamera) {
        vector.applyQuaternion(camera.quaternion);
        slice.axis = vector;
      }
    }
  });

  return (
    <group
      ref={grpRef}
      userData={{
        followCamera: true,
        surface_level: 0.5,
        volume_min: volume.min,
        volume_max: volume.max,
        color_map: [
          { color: "#000", pos: 0 },
          { color: "#fff", pos: 1 }
        ]
      }}
    >
      {cube && <boxHelper args={[cube]} />}
      {cube && <primitive object={cube} renderOrder={1} />}
      {slice && (
        <primitive ref={sliceRef} object={slice.mesh} renderOrder={0} />
      )}
      {/* <VTKmodel url="./static/models/vtk/liver.vtk" gui={gui} /> */}
      {/* <group
        position={[-volume.offset3.x, -volume.offset3.y, -volume.offset3.z]}
      >
        <VTKmodel url="./static/models/vtk/k.vtk" gui={gui} />
        <VTKmodel url="./static/models/vtk/k_a.vtk" gui={gui} />
        <VTKmodel url="./static/models/vtk/k_v.vtk" gui={gui} />
      </group> */}
    </group>
  );
};

const VTKmodel: React.FC<{
  url: string;
  gui: dat.GUI;
  props: object;
}> = ({ url, gui, ...props }) => {
  const [geo, setGeo] = useState();
  const meshRef = useRef<THREE.Mesh>();
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
      gui.add(meshRef.current.material, "transparent").name("transparent");
    }
    // eslint-disable-next-line
  }, [geo]);

  return geo ? (
    <mesh
      {...props}
      ref={meshRef}
      geometry={geo}
      material={
        new THREE.MeshStandardMaterial({
          color: new THREE.Color("white"),
          transparent: true
        })
      }
    ></mesh>
  ) : null;
};

const Control: React.FC = () => {
  const ctlRef = useRef<OrbitControls>();
  const { camera, gl } = useThree();
  useFrame(() => {
    const ctrl = ctlRef.current!;
    ctrl.update();
  });

  return (
    <orbitControls enableDamping ref={ctlRef} args={[camera, gl.domElement]} />
  );
};

const Camera: React.FC<{
  far?: number;
  near?: number;
}> = props => {
  const camRef = useRef<THREE.PerspectiveCamera>();
  const { setDefaultCamera } = useThree();

  useEffect(() => {
    const camera = camRef.current!;
    setDefaultCamera(camera);
    camera.position.set(0, 0, 1000);
    // eslint-disable-next-line
  }, []);

  return (
    <>
      <perspectiveCamera ref={camRef} {...props} />
      {camRef && <Control />}
    </>
  );
};

const Main: React.FC = () => {
  const [volume, setVolume] = useState<VolumeTexture>();
  const [flash, setFlash] = useState<boolean>(false);

  console.log("rerender");

  const init = (gl: THREE.WebGLRenderer) => {
    const div = gl.domElement.parentElement!;
    div.appendChild(stats.dom);

    gl.gammaOutput = true;
    gl.gammaFactor = 2.2;
    gl.physicallyCorrectLights = true;

    const loader = new NRRDLoader();
    loader.setPath("./static/slices/");
    loader.load("k.nrrd", function(volumeTexture: VolumeTexture) {
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
        <Camera near={10} far={100000} />
        <Effect stats={stats} />
        {volume && <Slices volume={volume} gui={gui} />}
        <directionalLight intensity={3} position={[0, 5, 3]} castShadow />
        <hemisphereLight
          intensity={1}
          skyColor={new THREE.Color(0xffffbb)}
          groundColor={new THREE.Color(0x080820)}
        />
        <axesHelper args={[50]} position={[0, 0, 0]} />
      </Canvas>
      <Button className="pos:a bottom:0" block onClick={() => setFlash(!flash)}>
        flash
      </Button>
    </>
  );
};

export default Main;
