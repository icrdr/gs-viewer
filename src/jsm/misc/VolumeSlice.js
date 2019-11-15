/* eslint-disable */
/**
 * This class has been made to hold a slice of a volume data
 * @class
 * @author Valentin Demeusy / https://github.com/stity
 * @param   {Volume} volume    The associated volume
 * @param   {number}       [index=0] The index of the slice
 * @param   {Vector3}      [axis=new Vector3(0,0,1)]      normal vector
 * @param   {number}       [depth=1]
 * @see Volume
 */
import { testShader } from "../shaders/testShader";
import {
  DoubleSide,
  LinearFilter,
  Mesh,
  ShaderMaterial,
  RedFormat,
  FloatType,
  UnsignedIntType,
  UnsignedByteType,
  Matrix4,
  ShortType,
  IntType,
  HalfFloatType,
  DataTexture3D,
  Quaternion,
  MeshBasicMaterial,
  UniformsUtils,
  PlaneBufferGeometry,
  Texture,
  Vector3
} from "three/build/three.module.js";

var VolumeSlice = function(volume, index, axis, depth) {
  var slice = this;
  /**
   * @member {Volume} volume The associated volume
   */
  this.volume = volume;
  /**
   * @member {Number} index The index of the slice, if changed, will automatically call updateGeometry at the next repaint
   */
  index = index || 0;
  Object.defineProperty(this, "index", {
    get: function() {
      return index;
    },
    set: function(value) {
      index = value;
      this.mesh.material.uniforms["u_index"].value = index;
      return index;
    }
  });
  /**
   * @member {Vector3} axis The normal axis
   */
  this.axis = axis || new Vector3(0, 0, 1);

  /**
   * @member {depth} depth
   */
  this.depth = depth || 1;

  const v_min = volume.windowLow;
  const v_max = volume.windowHigh;
  console.log(volume.data);
  const float_volume = new Uint16Array(volume.data.length);
  volume.data.map((v, i) => {
    // float_volume[i] = (v - v_min) / (v_max - v_min);
    float_volume[i] = v>31744?31744:v;
  });
  console.log(float_volume);
  var texture = new DataTexture3D(
    float_volume,
    volume.xLength,
    volume.yLength,
    volume.zLength
  );

  texture.type = HalfFloatType;
  texture.format = RedFormat;

  texture.minFilter = texture.magFilter = LinearFilter;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  console.log(texture);
  const quaternion = new Quaternion();
  quaternion.setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(1, 1, 1).normalize());

  
  const planeWidth = 500;
  const XYZtoSlice = new Matrix4()
    .multiply(new Matrix4().makeTranslation(0.5, 0.5, 0.5))
    .multiply(volume.inverseMatrix)
    .multiply(
      new Matrix4().makeScale(
        planeWidth / volume.xLength,
        planeWidth / volume.yLength,
        planeWidth / volume.zLength
      )
    )
    .multiply(new Matrix4().makeRotationFromQuaternion(quaternion))
    .multiply(new Matrix4().makeTranslation(-0.5, -0.5, -0.5));

  console.log(XYZtoSlice);
  const uniforms = UniformsUtils.clone(testShader.uniforms);
  uniforms["u_data"].value = texture;
  uniforms["u_m4"].value = XYZtoSlice;
  uniforms["u_index"].value = index;

  var material2 = new ShaderMaterial({
    side: DoubleSide,
    alphaTest: 0.5,
    uniforms: uniforms,
    vertexShader: testShader.vertexShader,
    fragmentShader: testShader.fragmentShader
  });

  /**
   * @member {Mesh} mesh The mesh ready to get used in the scene
   */
  this.mesh = new Mesh(this.geometry, material2);

  /**
   * @member {Number} needUpdateMesh Width of slice in the original coordinate system, corresponds to the width of the buffer canvas
   */
  this.needUpdateMesh = true;
  this.repaint();

  /**
   * @member {Number} iLength Width of slice in the original coordinate system, corresponds to the width of the buffer canvas
   */

  /**
   * @member {Function} sliceAccess Function that allow the slice to access right data
   * @see Volume.extractPerpendicularPlane
   * @param {Number} i The first coordinate
   * @param {Number} j The second coordinate
   * @returns {Number} the index corresponding to the voxel in volume.data of the given position in the slice
   */
};

VolumeSlice.prototype = {
  constructor: VolumeSlice,

  /**
   * @member {Function} repaint Refresh the texture and the geometry
   * @memberof VolumeSlice
   */
  repaint: function() {
    if (this.needUpdateMesh) {
      this.updateGeometry();
    }
    // this.mesh.material.map.needsUpdate = true;
  },

  /**
   * @member {Function} Refresh the geometry according to axis and index
   * @see Volume.extractPerpendicularPlane
   * @memberof VolumeSlice
   */
  updateGeometry: function() {
    var extracted = this.volume.extractPerpendicularPlane(
      this.axis,
      this.index,
      this.depth
    );
    this.matrix = extracted.matrix;

    if (this.geometry) this.geometry.dispose(); // dispose existing geometry

    this.geometry = new PlaneBufferGeometry(
      extracted.planeWidth,
      extracted.planeWidth
    );

    if (this.mesh) {
      this.mesh.matrixAutoUpdate = false;
      this.mesh.geometry = this.geometry;
      //reset mesh matrix
      // this.mesh.matrix.identity();

      this.mesh.matrix.copy(this.matrix);
    }
  }
};

export { VolumeSlice };
