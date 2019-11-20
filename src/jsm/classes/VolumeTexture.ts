import { Matrix4, Vector3, DataTexture3D } from "three";

export class VolumeTexture extends DataTexture3D {
  matrix4: Matrix4;
  offset3: Vector3;
  min: number;
  max: number;
  
  constructor(data:any, width:number, height:number, depth:number) {
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
