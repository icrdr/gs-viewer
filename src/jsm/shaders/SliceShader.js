import { Matrix4 } from "three/build/three.module.js";
import { VolumeTexture } from "../classes/VolumeTexture";

const vert = `
varying vec2 vUv; 
  
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
  vUv = uv; 
}
`;
const frag = `
precision highp int;
precision highp float;
precision highp sampler3D;

uniform sampler3D volume_data;
uniform mat4 data_to_slice_m4;
uniform float slice_index;
uniform float slice_width;
uniform float value_min;
uniform float value_max;
varying vec2 vUv;

float halfFloatBitsToIntValue(float inputx){
  int step = 0;
  bool isneg = inputx < 0.0;

  if (isinf(inputx)){
    if (isneg){
      return 64512.0;
    }else{
      return 31744.0;
    }
  }else if(abs(inputx)>=1.0){
    while(inputx/2.0 >= 1.0) {
      inputx /= 2.0;
      step ++;
    }
  }else if(abs(inputx)>0.0){
    while(inputx < 1.0) {
      inputx *= 2.0;
      step --;
    }
  }else{
    return 0.0;
  }

  float exponent= float(step+15);

  if (exponent>0.0){
    return (float(step+15) + inputx -1.0)*1024.0 + float(isneg) * 32768.0;
  }else{
    return pow(2.0,exponent-1.0)*inputx*1024.0 + float(isneg) * 32768.0;
  }
}

vec4 getV(vec3 pos){
  if(pos.x >1.0 || pos.x <0.0 || pos.y >1.0 || pos.y <0.0 || pos.z >1.0 || pos.z <0.0){
    return vec4(vec3(0.0),0.0);
  }else{
    float value = halfFloatBitsToIntValue(texture(volume_data, pos).r);
    float v = (value-value_min)/(value_max-value_min);
    return vec4(v,v,v,1.0);
  }
}

vec3 applyMatrix4(vec3 v3, mat4 m){
  return (m*vec4(v3,1.0)).xyz;
}

void main() {
  vec3 pos_Slice = vec3(vUv.x, vUv.y, slice_index/slice_width);
  vec3 pos_XYZ = applyMatrix4(pos_Slice, data_to_slice_m4);
  // gl_FragColor = vec4(1.0);
  gl_FragColor = getV(pos_XYZ.xyz);
}
`;

const SliceShader = {
  uniforms: {
    volume_data: { value: new VolumeTexture(new Uint16Array([0]), 1, 1, 1) },
    data_to_slice_m4: { value: new Matrix4() },
    slice_index: { value: 250.0 },
    slice_width: { value: 500.0 },
    value_min: { value: 0.0 },
    value_max: { value: 500.0 }
  },
  vertexShader: vert,
  fragmentShader: frag
};

export { SliceShader };
