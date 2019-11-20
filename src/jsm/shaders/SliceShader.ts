import { Matrix4 } from "three";
import { VolumeTexture } from "../classes/VolumeTexture";

const vert = `
varying vec3 w_pos;
  
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
  w_pos = (modelMatrix * vec4(position, 1.0)).xyz;
}
`;
const frag = `
precision highp int;
precision highp float;
precision highp sampler3D;

uniform sampler3D volume_data;
uniform mat4 volume_matrix;
uniform float window_min;
uniform float window_max;

varying vec3 w_pos;

float halfFloatBitsToIntValue(float inputx){
  int step = 0;
  bool isneg = inputx < 0.0;
  float val = 0.0;

  if (isinf(inputx)){
    if (isneg){
      val = 64512.0;
    }else{
      val = 31744.0;
    }
  }else if(inputx == 0.0){
    val = 0.0;
  }else{
    if(abs(inputx)>=1.0){
      while(inputx/2.0 >= 1.0) {
        inputx /= 2.0;
        step ++;
      }
    }else{
      while(inputx < 1.0) {
        inputx *= 2.0;
        step --;
      }
    }
    float exponent= float(step+15);

    if (exponent>0.0){
      val = (float(step+15) + inputx -1.0)*1024.0 + float(isneg) * 32768.0;
    }else{
      val = pow(2.0, exponent-1.0)*inputx*1024.0 + float(isneg) * 32768.0;
    }
  }

  return val;
}

vec3 applyMatrix4(vec3 v3, mat4 m){
  return (m*vec4(v3,1.0)).xyz;
}

float getSample(vec3 pos){
  float val;
  vec3 data_pos = applyMatrix4(pos, inverse(volume_matrix));
  data_pos = data_pos/vec3(textureSize(volume_data,0))+vec3(0.5);
  if(data_pos.x>=1.0 || data_pos.x<=0.0 || data_pos.y>=1.0 || data_pos.y<=0.0 || data_pos.z>=1.0 || data_pos.z<=0.0){
    val = 0.0;
  }else{
    float ct_val = halfFloatBitsToIntValue(texture(volume_data, data_pos).r);
    val = clamp((ct_val-window_min)/(window_max-window_min),0.0,1.0);
  }
  return val;
}

void main() {
  float val = getSample(w_pos);
  if(val == 0.0){
    discard;
  }

  gl_FragColor = vec4(vec3(val),1.0);
}
`;

const SliceShader = {
  uniforms: {
    volume_data: { value: new VolumeTexture(new Uint16Array([0]), 1, 1, 1) },
    volume_matrix: { value: new Matrix4() },
    window_min: { value: 0.0 },
    window_max: { value: 500.0 }
  },
  vertexShader: vert,
  fragmentShader: frag
};

export { SliceShader };
