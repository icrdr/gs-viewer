import {
  DoubleSide,
  Mesh,
  ShaderMaterial,
  Matrix4,
  Quaternion,
  UniformsUtils,
  PlaneBufferGeometry,
  Vector3
} from "three/build/three.module.js";
import { SliceShader } from "../shaders/SliceShader";

class VolumeSlice {
  constructor(volume, index, axis) {
    this.volume = volume;
    this._index = index;
    this._axis = axis;
    this._min = volume.min;
    this._max = volume.max;
    this._sliceWidth = new Vector3(
      volume.image.width,
      volume.image.height,
      volume.image.depth,
    ).length();

    const { sliceMeshMatrix, sliceTexMatrix } = this.computeMatrix(index, axis);
    const uniforms = UniformsUtils.clone(SliceShader.uniforms);
    uniforms["volume_data"].value = volume;
    uniforms["data_to_slice_m4"].value = sliceTexMatrix;
    uniforms["slice_index"].value = index;
    uniforms["slice_width"].value = this._sliceWidth;
    uniforms["value_min"].value = volume.min;
    uniforms["value_max"].value = volume.max;

    const material = new ShaderMaterial({
      side: DoubleSide,
      alphaTest: 0.5,
      uniforms: uniforms,
      vertexShader: SliceShader.vertexShader,
      fragmentShader: SliceShader.fragmentShader
    });

    const geometry = new PlaneBufferGeometry(
      this._sliceWidth,
      this._sliceWidth
    );

    this.mesh = new Mesh(geometry, material);
    this.mesh.matrixAutoUpdate = false;
    this.mesh.matrix.copy(sliceMeshMatrix);
  }

  computeMatrix(index, axis) {
    const quaternion = new Quaternion();
    quaternion.setFromUnitVectors(new Vector3(0, 0, 1), axis);

    const sliceMeshMatrix = new Matrix4()
      .multiply(new Matrix4().makeRotationFromQuaternion(quaternion))
      .multiply(
        new Matrix4().makeTranslation(0, 0, index - this._sliceWidth / 2)
      );

    const sliceTexMatrix = new Matrix4() // xyz=>slice
      .multiply(new Matrix4().makeTranslation(0.5, 0.5, 0.5))
      .multiply(new Matrix4().getInverse(this.volume.matrix4))
      .multiply(
        new Matrix4().makeScale(
          this._sliceWidth / this.volume.image.width,
          this._sliceWidth / this.volume.image.height,
          this._sliceWidth / this.volume.image.depth
        )
      )
      .multiply(new Matrix4().makeRotationFromQuaternion(quaternion))
      .multiply(new Matrix4().makeTranslation(-0.5, -0.5, -0.5));

    return { sliceMeshMatrix, sliceTexMatrix };
  }

  get index() {
    return this._index;
  }

  set index(value) {
    this._index = value;

    const { sliceMeshMatrix } = this.computeMatrix(value, this._axis);
    this.mesh.matrix.copy(sliceMeshMatrix);
    this.mesh.material.uniforms["slice_index"].value = value;
  }

  get min() {
    return this._min;
  }

  set min(value) {
    this._min = value;
    this.mesh.material.uniforms["value_min"].value = value;
  }

  get max() {
    return this._max;
  }

  set max(value) {
    this._max = value;
    this.mesh.material.uniforms["value_max"].value = value;
  }

  get axis() {
    return this._axis;
  }

  set axis(value) {
    this._axis = value;

    const { sliceMeshMatrix, sliceTexMatrix } = this.computeMatrix(
      this._index,
      value
    );
    this.mesh.matrix.copy(sliceMeshMatrix);
    this.mesh.material.uniforms["data_to_slice_m4"].value = sliceTexMatrix;
  }
}

export { VolumeSlice };
