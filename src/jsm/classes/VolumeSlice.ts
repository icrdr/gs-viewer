import {
  DoubleSide,
  Mesh,
  ShaderMaterial,
  Matrix4,
  Quaternion,
  UniformsUtils,
  PlaneBufferGeometry,
  Vector3,
  Texture,
  Group
} from "three";
import { SliceShader } from "../shaders/SliceShader";
import { VolumeTexture } from "./VolumeTexture";

export class VolumeSlice extends Group {
  readonly volumeData: VolumeTexture;
  readonly sliceWidth: number;
  readonly slice: Mesh;

  protected _colorMap: Texture;
  protected _index: number;
  protected _min: number;
  protected _max: number;
  protected _axis: Vector3;

  constructor(
    volumeData: VolumeTexture,
    colorMap: Texture,
    index: number = 0,
    axis: Vector3 = new Vector3(0, 0, 1).normalize()
  ) {
    super();
    this.volumeData = volumeData;
    this._index = index;
    this._axis = axis;
    this._min = volumeData.min;
    this._max = volumeData.max;
    this._colorMap = colorMap;

    const dimensions = volumeData.getDimensions();
    this.sliceWidth = new Vector3(
      dimensions.x,
      dimensions.y,
      dimensions.z
    ).length();

    const uniforms = UniformsUtils.clone(SliceShader.uniforms);
    uniforms["cmap"].value = colorMap;
    uniforms["volume_data"].value = volumeData;
    uniforms["pivot_matrix"].value = this.matrix;
    uniforms["volume_matrix"].value = this.volumeData.matrix4;
    uniforms["window_min"].value = volumeData.min;
    uniforms["window_max"].value = volumeData.max;

    const material = new ShaderMaterial({
      side: DoubleSide,
      uniforms: uniforms,
      vertexShader: SliceShader.vertexShader,
      fragmentShader: SliceShader.fragmentShader
    });

    const geometry = new PlaneBufferGeometry(this.sliceWidth, this.sliceWidth);
    this.slice = new Mesh(geometry, material);
    this.add(this.slice);

    this.slice.matrixAutoUpdate = false;
    const sliceMeshMatrix = this.computeMatrix(index, axis);
    this.slice.matrix.copy(sliceMeshMatrix);
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

  updateMatrix() {
    const material = this.slice.material as ShaderMaterial;
    material.uniforms["pivot_matrix"].value = this.matrix;
    super.updateMatrix();
  }
  
  get index() {
    return this._index;
  }

  set index(value) {
    this._index = value;

    const sliceMeshMatrix = this.computeMatrix(value, this._axis);
    this.slice.matrix.copy(sliceMeshMatrix);
  }

  get min() {
    return this._min;
  }

  set min(value) {
    this._min = value;
    const material = this.slice.material as ShaderMaterial;
    material.uniforms["window_min"].value = value;
  }

  get max() {
    return this._max;
  }

  set max(value) {
    this._max = value;
    const material = this.slice.material as ShaderMaterial;
    material.uniforms["window_max"].value = value;
  }

  get axis() {
    return this._axis;
  }

  set axis(value) {
    this._axis = value;

    const sliceMeshMatrix = this.computeMatrix(this._index, value);
    this.slice.matrix.copy(sliceMeshMatrix);
  }

  get colorMap() {
    return this._colorMap;
  }

  set colorMap(value) {
    this._colorMap = value;
    const material = this.slice.material as ShaderMaterial;
    material.uniforms["cmap"].value = value;
  }
}
