import { Matrix4, Vector3, DataTexture3D } from "three/build/three.module.js";

export class VolumeTexture extends DataTexture3D {
  constructor(data, width, height, depth) {
    super(data, width, height, depth);
    this.matrix4 = new Matrix4();
    this.offset3 = new Vector3();

    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < width * height * depth; i++) {
      if (!isNaN(data[i])) {
        var value = data[i];
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }

    this.min = min;
    this.max = max;
  }
}
