import {
  Mesh,
  ShaderMaterial,
  UniformsUtils,
  BoxBufferGeometry,
  Texture,
  BoxHelper,
  Group
} from "three";
import { VolumeShaderA } from "../shaders/VolumeShaderA";
import { VolumeTexture } from "./VolumeTexture";

export class VolumeContainer extends Group{
  readonly volumeData: VolumeTexture;
  readonly helper: BoxHelper;
  readonly volume: Mesh;

  protected _colorMap: Texture;
  protected _min: number;
  protected _max: number;
  protected _level: number;

  constructor(
    volumeData: VolumeTexture,
    colorMap: Texture,
    level: number = 0.3
  ) {
    super()
    this.volumeData = volumeData;
    this._min = volumeData.min;
    this._max = volumeData.max;
    this._level = level;
    this._colorMap = colorMap

    const dimensions = volumeData.getDimensions()

    //create geo
    const geometry = new BoxBufferGeometry(
      dimensions.x,
      dimensions.y,
      dimensions.z
    );

    const uniforms = UniformsUtils.clone(VolumeShaderA.uniforms);
    uniforms["cmap"].value = colorMap;
    uniforms["volume_data"].value = volumeData;
    uniforms["volume_matrix"].value = volumeData.matrix4;
    uniforms["window_min"].value = volumeData.min;
    uniforms["window_max"].value = volumeData.max;

    const material = new ShaderMaterial({
      uniforms: uniforms,
      vertexShader: VolumeShaderA.vertexShader,
      fragmentShader: VolumeShaderA.fragmentShader
    });

    this.volume = new Mesh(geometry,material)
    this.helper = new BoxHelper(this.volume);
    this.add(this.volume)
    this.add(this.helper)
  }

  get min() {
    return this._min;
  }

  set min(value) {
    this._min = value;
    const material = this.volume.material as ShaderMaterial;
    material.uniforms["window_min"].value = value;
  }

  get max() {
    return this._max;
  }

  set max(value) {
    this._max = value;
    const material = this.volume.material as ShaderMaterial;
    material.uniforms["window_max"].value = value;
  }

  get level() {
    return this._level;
  }

  set level(value) {
    this._level = value;
    const material = this.volume.material as ShaderMaterial;
    material.uniforms["level"].value = value;
  }

  get colorMap() {
    return this._colorMap;
  }

  set colorMap(value) {
    this._colorMap = value;
    const material = this.volume.material as ShaderMaterial;
    material.uniforms["cmap"].value = value;
  }
}
