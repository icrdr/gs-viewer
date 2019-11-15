import { Matrix4, Vector3 } from "three/build/three.module.js";
import { VolumeTexture } from "../classes/VolumeTexture";

const vert = `
uniform vec3 eye_pos;
uniform vec3 volume_scale;

varying vec3 vray_dir;
varying vec3 transformed_eye;
varying vec3 vpos;

void main() {
  // Translate the cube to center it at the origin.
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 

  // Compute eye position and ray directions in the unit cube space
	transformed_eye = eye_pos / volume_scale;
  vray_dir = position - eye_pos;
  vpos = position;
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
uniform float value_max;

varying vec3 vray_dir;
varying vec3 transformed_eye;
varying vec3 vpos;

vec2 intersect_box(vec3 orig, vec3 dir) {
	const vec3 box_min = vec3(0);
	const vec3 box_max = vec3(1);
	vec3 inv_dir = 1.0 / dir;
	vec3 tmin_tmp = (box_min - orig) * inv_dir;
	vec3 tmax_tmp = (box_max - orig) * inv_dir;
	vec3 tmin = min(tmin_tmp, tmax_tmp);
	vec3 tmax = max(tmin_tmp, tmax_tmp);
	float t0 = max(tmin.x, max(tmin.y, tmin.z));
	float t1 = min(tmax.x, min(tmax.y, tmax.z));
	return vec2(t0, t1);
}

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

vec3 applyMatrix4(vec3 v3, mat4 m){
  return (m*vec4(v3,1.0)).xyz;
}


void main(void) {

  // Step 1: Normalize the view ray
  vec3 ray_dir = normalize(vray_dir);

  float dt = 200.0;

  vec4 color = vec4(0.0);
  vec3 pos_RAS = vpos;

	for (int t = 0; t < 1; t++) {
		// Step 4.1: Sample the volume, and color it by the transfer function.
		// Note that here we don't use the opacity from the transfer function,
    // and just use the sample value as the opacity
    
    vec3 pos_XYZ = applyMatrix4(pos_RAS, xyz_to_ras_m4);

    float val = halfFloatBitsToIntValue(texture(volume_data, pos_XYZ).r);
    val = (val-value_min)/(value_max-value_min);
		vec4 val_color = vec4(val);

		// Step 4.2: Accumulate the color and opacity using the front-to-back
		// compositing equation
		// color.rgb += (1.0 - color.a) * val_color.a * val_color.rgb;
		color.a += val;

		// Optimization: break out of the loop when the color is near opaque
		if (color.a >= 0.95) {
			break;
    }
    
		pos_RAS += ray_dir * dt;
  }
  vec3 pos_XYZ = applyMatrix4(pos_RAS, xyz_to_ras_m4);
  float val = halfFloatBitsToIntValue(texture(volume_data, pos_RAS).r);
  val = (val-value_min)/(value_max-value_min);

	gl_FragColor = vec4(vec3(val), 1.0);
}
`;

const vShader = {
  uniforms: {
    volume_data: { value: new VolumeTexture(new Uint16Array([0]), 1, 1, 1) },
    volume_scale: { value: new Vector3(256, 256, 125) },
    xyz_to_ras_m4: { value: new Matrix4() },
    eye_pos: { value: new Vector3(0, 0, 500) },
    value_min: { value: 0.0 },
    value_max: { value: 500.0 }
  },
  vertexShader: vert,
  fragmentShader: frag
};

export { vShader };
