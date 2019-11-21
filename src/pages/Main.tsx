/* eslint-disable no-unused-vars */
import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, extend, useThree } from "react-three-fiber";
import { useSpring, a } from "react-spring/three";
import Stats from "stats.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// loader
import { NRRDLoader } from "../jsm/loaders/NRRDLoader";
import { VTKLoader } from "three/examples/jsm/loaders/VTKLoader";
import { VolumeSlice } from "../jsm/classes/VolumeSlice";
import { VolumeContainer } from "../jsm/classes/VolumeContainer";

import { Button } from "antd";

import { VolumeTexture } from "../jsm/classes/VolumeTexture";
import { ColorMapTexture } from "../jsm/classes/ColorMapTexture";
import { GUI } from "dat.gui";
import { Group, Vector3, PerspectiveCamera, WebGLRenderer, Color } from "three";

extend({ OrbitControls });

// function promisifyLoader(loader, url, onProgress) {
//   return new Promise((resolve, reject) => {
//     loader.load(url, resolve, onProgress, reject);
//   });
// }

const stats = new Stats();
stats.dom.style.position = "absolute";
const gui = new GUI();

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
  const [slice, setSlice] = useState();
  const [container, setContainer] = useState();
  const grpRef = useRef<Group>();
  const { camera } = useThree();

  useEffect(() => {
    const group = grpRef.current!;
    const colMap = new ColorMapTexture();
    const container = new VolumeContainer(volume, colMap);
    setContainer(container);
    const slice = new VolumeSlice(volume, colMap);
    setSlice(slice);

    const f1 = gui.addFolder("Slice");
    f1.add(slice, "index", 0, slice.sliceWidth, 1).name("Slice Index");
    f1.add(slice, "min", volume.min, volume.max, 1).name("Slice Min");
    f1.add(slice, "max", volume.min, volume.max, 1).name("Slice Max");
    f1.add(group.userData, "followCamera").onChange(e => {
      group.userData.followCamera = e;
    });

    const f2 = gui.addFolder("Container");
    f2.add(container, "level", 0, 1, 0.01).name("Surface Lever");
    f2.add(container, "min", volume.min, volume.max, 1).name("Volume Min");
    f2.add(container, "max", volume.min, volume.max, 1).name("Volume Max");

    const f3 = gui.addFolder("Color Map");
    colMap.colorMapData.forEach((e: object, i: number) => {
      f3.addColor(e, "color").onChange(v => {
        const cmap = colMap.colorMapData;
        cmap[i].color = v;
        colMap.colorMapData = cmap;
      });
      f3.add(e, "pos", 0, 1, 0.01).onChange(v => {
        const cmap = colMap.colorMapData;
        cmap[i].pos = v;
        colMap.colorMapData = cmap;
      });
    });

    const addColor = () => {
      colMap.colorMapData.push({
        color: "#ffae23",
        pos: 0.0
      });

      const length = colMap.colorMapData.length;
      f3.addColor(colMap.colorMapData[length - 1], "color").onChange(v => {
        const cmap = colMap.colorMapData;
        cmap[length - 1].color = v;
        colMap.colorMapData = cmap;
      });

      f3.add(colMap.colorMapData[length - 1], "pos", 0, 1, 0.01).onChange(v => {
        const cmap = colMap.colorMapData;
        cmap[length - 1].pos = v;
        colMap.colorMapData = cmap;
      });
    };

    group.userData["addColor"] = addColor;
    f3.add(group.userData, "addColor").name("Add Color");
    // eslint-disable-next-line
  }, []);

  useFrame(() => {
    const grp = grpRef.current!;
    if (grp.userData.followCamera) {
      var vector = new Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
      slice.axis = vector;
    }
  });

  return (
    <group
      ref={grpRef}
      userData={{
        followCamera: true
      }}
    >
      {container && <primitive object={container} renderOrder={1} />}

      {slice && <primitive object={slice} renderOrder={0} />}
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
  const camRef = useRef<PerspectiveCamera>();
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

  const init = (gl: WebGLRenderer) => {
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
          skyColor={new Color(0xffffbb)}
          groundColor={new Color(0x080820)}
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
