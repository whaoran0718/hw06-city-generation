#version 300 es
precision highp float;
precision highp sampler2DShadow;

uniform int u_Mode;
uniform vec3 u_LightDir;
uniform mat4 u_LightViewProj;
uniform sampler2D u_Texture;
uniform sampler2DShadow u_Shadow;

in vec4 fs_Pos;
in vec4 fs_Nor;
in vec4 fs_Light;
in vec4 fs_ShadowCoord;
out vec4 out_Col;

vec3 mapColor(vec4 flag) {
  float factor = max(0.0, fs_Pos.z * 1.2 - 0.2);
  return mix(vec3(10.0, 94.0, 133.0) / 255.0, vec3(238, 235, 230.) / 255.0, factor);
}

vec3 densityColor(vec4 flag) {
  if (flag.y > 0.5) {
    return mix(vec3(181.0, 0.0, 35.0) / 255.0, vec3(1.0), (1.0 - flag.y) * 2.0);
  }
  else {
    return mix(vec3(59.0, 76.0, 192.0) / 255.0, vec3(1.0), flag.y * 2.0);
  }
}

float shadow() {
  vec3 shadowCoord = fs_ShadowCoord.xyz /fs_ShadowCoord.w;
  shadowCoord.z -= 0.0025;
  return texture(u_Shadow, shadowCoord);
}

void main() {
  vec2 uv = fs_Pos.xy + 0.5;
  vec4 flag = texture(u_Texture, uv);
  vec3 col;
  
  if (u_Mode == 0) {
    col = mapColor(flag);
    vec3 diffuseTerm = vec3(1.34, 1.07, 0.99) * min(max(dot(fs_Nor, fs_Light), 0.0) + 0.2, 1.0);
    vec3 indirectTerm = vec3(0.16, 0.20, 0.28) * min(max(fs_Nor.y, 0.0), 1.0);
    float v = shadow();
    diffuseTerm *= pow(vec3(v),vec3(1.0,1.2,1.5));
    vec3 color = pow((diffuseTerm + indirectTerm) *col.rgb, vec3(1.0 / 2.2));
    out_Col = vec4(color, 1.0);
  }
  else if (u_Mode == 1) {
    out_Col = vec4(densityColor(flag), 1.0);
  }
  else if (u_Mode == 2) {
    out_Col = vec4(flag.x > 0.999 ? densityColor(flag) : vec3(0.2, 0.2, 0.2), 1.0);
  }
  else if (u_Mode == 3) {
    out_Col = vec4(vec3(flag.z), 1.0);
  }
}