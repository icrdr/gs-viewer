import { Matrix4, Vector3 } from "three";
import { VolumeTexture } from "../classes/VolumeTexture";

const vert = `
varying vec3 w_pos;
varying mat4 vprojectionViewMatrix;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
  w_pos = (modelMatrix * vec4(position, 1.0)).xyz;
  vprojectionViewMatrix = projectionMatrix * viewMatrix;
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
uniform float level;
uniform vec3 box_min;
uniform vec3 box_max;

varying vec3 w_pos;
varying mat4 vprojectionViewMatrix;

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

vec2 intersect_box(vec3 orig, vec3 dir) {
	vec3 inv_dir = 1.0 / dir;
	vec3 tmin_tmp = (box_min - orig) * inv_dir;
	vec3 tmax_tmp = (box_max - orig) * inv_dir;
	vec3 tmin = min(tmin_tmp, tmax_tmp);
	vec3 tmax = max(tmin_tmp, tmax_tmp);
	float t0 = max(tmin.x, max(tmin.y, tmin.z));
	float t1 = min(tmax.x, min(tmax.y, tmax.z));
	return vec2(t0, t1);
}

float getSample(vec3 pos){
  float val;
  vec3 data_pos = applyMatrix4(pos, inverse(volume_matrix));
  data_pos = data_pos/vec3(textureSize(volume_data,0))+vec3(0.5);
  if(data_pos.x>=0.99 || data_pos.x<=0.01 || data_pos.y>=0.99 || data_pos.y<=0.01 || data_pos.z>=0.99 || data_pos.z<=0.01){
    val = 0.0;
  }else{
    float ct_val = halfFloatBitsToIntValue(texture(volume_data, data_pos).r);
    val = clamp((ct_val-window_min)/(window_max-window_min),0.0,1.0);
  }
  return val;
}

void main(void) {
  vec4 col;
  
  vec3 ray_dir = normalize(w_pos - cameraPosition);

  vec2 t_hit = intersect_box(w_pos, ray_dir);
	if (t_hit.x > t_hit.y) {
		discard;
  }

  t_hit.x = max(t_hit.x, 0.0);

  float random = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233))+0.1) * 43758.5453);
  vec3 pos = w_pos + t_hit.x * ray_dir * random;

  float dt =  1.0;
  vec3 lightDirection = vec3(1.0,1.0,1.0);
  
  for (float t = t_hit.x; t < t_hit.y; t += dt) {
    float val = getSample(pos);
    vec4 src = vec4(val);
    src.rgb *= src.a;
    col += (1.0 - col.a)*src;
  
    //break from the loop when alpha gets high enough
    if(src.a >= .95)
      break; 
    
    pos += ray_dir * dt;
  }
  
  if(col.a == 0.0){
    discard;
  }

  gl_FragColor = vec4(col.rgb, col.a);
}
`;

const VolumeShaderB = {
  uniforms: {
    volume_data: { value: new VolumeTexture(new Uint16Array([0]), 1, 1, 1) },
    volume_matrix: { value: new Matrix4() },
    level: { value: 0.5 },
    window_min: { value: 0.0 },
    window_max: { value: 2000.0 },
    box_min: { value: new Vector3(-150, -150, -150) },
    box_max: { value: new Vector3(150, 150, 150) }
  },
  vertexShader: vert,
  fragmentShader: frag
};

export { VolumeShaderB };
