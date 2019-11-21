import {
  DoubleSide,
  Mesh,
  ShaderMaterial,
  Matrix4,
  Quaternion,
  UniformsUtils,
  PlaneBufferGeometry,
  Vector3
} from "three";
import { SliceShader } from "../shaders/SliceShader";
import { VolumeTexture } from "./VolumeTexture";

class VolumeSlice {
  volume: VolumeTexture;
  sliceWidth: number;
  mesh: Mesh;
  protected _index: number;
  protected _min: number;
  protected _max: number;
  protected _axis: Vector3;
  protected _material: ShaderMaterial;

  constructor(volume: VolumeTexture, index: number, axis: Vector3) {
    this.volume = volume;
    this._index = index;
    this._axis = axis;
    this._min = volume.min;
    this._max = volume.max;
    this.sliceWidth = new Vector3(
      volume.image.width,
      volume.image.height,
      volume.image.depth
    ).length();

    const sliceMeshMatrix = this.computeMatrix(index, axis);
    const uniforms = UniformsUtils.clone(SliceShader.uniforms);
    uniforms["volume_data"].value = volume;
    uniforms["volume_matrix"].value = this.volume.matrix4;
    uniforms["window_min"].value = volume.min;
    uniforms["window_max"].value = volume.max;

    this._material = new ShaderMaterial({
      side: DoubleSide,
      uniforms: uniforms,
      vertexShader: SliceShader.vertexShader,
      fragmentShader: SliceShader.fragmentShader
    });

    const geometry = new PlaneBufferGeometry(this.sliceWidth, this.sliceWidth);

    this.mesh = new Mesh(geometry, this._material);
    this.mesh.matrixAutoUpdate = false;
    this.mesh.matrix.copy(sliceMeshMatrix);
  }

  computeMatrix(index: number, axis: Vector3) {
    const quaternion = new Quaternion();
    quaternion.setFromUnitVectors(new Vector3(0, 0, 1), axis);

    const sliceMeshMatrix = new Matrix4()
      .multiply(new Matrix4().makeRotationFromQuaternion(quaternion))
      .multiply(
        new Matrix4().makeTranslation(0, 0, index - this.sliceWidth / 2)
      );

    return sliceMeshMatrix;
  }

  get index() {
    return this._index;
  }

  set index(value) {
    this._index = value;

    const sliceMeshMatrix = this.computeMatrix(value, this._axis);
    this.mesh.matrix.copy(sliceMeshMatrix);
  }

  get min() {
    return this._min;
  }

  set min(value) {
    this._min = value;
    this._material.uniforms["window_min"].value = value;
  }

  get max() {
    return this._max;
  }

  set max(value) {
    this._max = value;
    this._material.uniforms["window_max"].value = value;
  }

  get axis() {
    return this._axis;
  }

  set axis(value) {
    this._axis = value;

    const sliceMeshMatrix = this.computeMatrix(this._index, value);
    this.mesh.matrix.copy(sliceMeshMatrix);
  }
}

export { VolumeSlice };
