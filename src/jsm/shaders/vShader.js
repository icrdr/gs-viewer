import { Matrix4, Vector3 } from "three/build/three.module.js";
import { VolumeTexture } from "../classes/VolumeTexture";

const vert = `
uniform vec3 volume_scale;

varying vec3 v_w_pos;
varying vec3 vnormal;
varying mat4 vmodelMatrix;

vec3 applyMatrix4(vec3 v3, mat4 m){
  return (m*vec4(v3,1.0)).xyz;
}

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 

  v_w_pos = position;
  vmodelMatrix = modelMatrix;
  vnormal = normal;
}
`;

const frag = `
precision highp int;
precision highp float;
precision highp sampler3D;

uniform sampler3D volume_data;
uniform vec3 volume_scale;
uniform mat4 xyz_to_ras_m4;
uniform float value_min;
uniform float value_t;
uniform float value_max;

varying vec3 v_w_pos;
varying vec3 vnormal;
varying mat4 vmodelMatrix;

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
	const vec3 box_min = vec3(-120.0,-120.0,-84.75);
	const vec3 box_max = vec3(120.0,120.0,84.75);
	vec3 inv_dir = 1.0 / dir;
	vec3 tmin_tmp = (box_min - orig) * inv_dir;
	vec3 tmax_tmp = (box_max - orig) * inv_dir;
	vec3 tmin = min(tmin_tmp, tmax_tmp);
	vec3 tmax = max(tmin_tmp, tmax_tmp);
	float t0 = max(tmin.x, max(tmin.y, tmin.z));
	float t1 = min(tmax.x, min(tmax.y, tmax.z));
	return vec2(t0, t1);
}

float getValue(vec3 pos){
  vec3 ras_pos = pos + vec3(120.0,120.0,84.75);
  vec3 xyz_pos = applyMatrix4(ras_pos, inverse(xyz_to_ras_m4));
  xyz_pos = xyz_pos/volume_scale;
  float val = halfFloatBitsToIntValue(texture(volume_data, xyz_pos).r);
  return (val-value_min)/(value_max-value_min);
}

void main(void) {
  vec4 color;
  vec3 ray_dir = normalize(v_w_pos - cameraPosition);

  vec2 t_hit = intersect_box(v_w_pos, ray_dir);
	if (t_hit.x > t_hit.y) {
		discard;
  }

  t_hit.x = max(t_hit.x, 0.0);

  vec3 pos = v_w_pos + t_hit.x * ray_dir;

  float dt = 2.0;
  vec3 lightDirection = vec3(1.0,1.0,1.0);
               
  for (float t = t_hit.x; t < t_hit.y; t += dt) {
    float val = getValue(pos);
    if (val>value_t){
      color.a = 1.0;
      vec3 step = vec3(1.5,1.5,1.5);
      vec3 N;
      float val1, val2;
      val1 = getValue(pos + vec3(-step[0], 0.0, 0.0));
      val2 = getValue(pos + vec3(+step[0], 0.0, 0.0));
      N[0] = val1 - val2;
      val1 = getValue(pos + vec3(0.0, -step[1], 0.0));
      val2 = getValue(pos + vec3(0.0, +step[1], 0.0));
      N[1] = val1 - val2;
      val1 = getValue(pos + vec3(0.0, 0.0, -step[2]));
      val2 = getValue(pos + vec3(0.0, 0.0, +step[2]));
      N[2] = val1 - val2;
      N =normalize(N);
      float diffuse = 0.5 * max(0.0, dot(N, lightDirection)) + 0.2;
      color.rgb = vec3(diffuse);
      break;
    }

		pos += ray_dir * dt;
  }
  
	gl_FragColor = vec4(color.rgb, color.a);
}
`;

const vShader = {
  uniforms: {
    volume_data: { value: new VolumeTexture(new Uint16Array([0]), 1, 1, 1) },
    volume_scale: { value: new Vector3(256, 256, 113) },
    xyz_to_ras_m4: { value: new Matrix4() },
    value_t: { value: 0.5 },
    value_min: { value: 0.0 },
    value_max: { value: 2000.0 }
  },
  vertexShader: vert,
  fragmentShader: frag
};

export { vShader };
