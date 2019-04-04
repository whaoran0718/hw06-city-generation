#version 300 es
precision highp float;

uniform mat4 u_Model;
uniform mat4 u_View;
uniform mat4 u_ViewProj;
uniform vec3 u_LightDir;
uniform mat4 u_LightViewProj;
uniform sampler2D u_Texture;

in vec4 vs_Pos;
out vec4 fs_Pos;
out vec4 fs_Nor;
out vec4 fs_Light;
out vec4 fs_ShadowCoord;

const mat4 biasMatrix = mat4(0.5, 0.0, 0.0, 0.0,
                             0.0, 0.5, 0.0, 0.0,
                             0.0, 0.0, 0.5, 0.0,
                             0.5, 0.5, 0.5, 1.0);
float seaDepth = 0.03;

float deformFactor(vec3 p) {
  vec2 uv = p.xy + 0.5;
  vec4 flag = texture(u_Texture, uv);
  return smoothstep(0.0, 0.1, 1.0 - flag.w);
}

vec4 calcNormal() {
  float delta = 0.025;
  vec3 posX1Y0 = vs_Pos.xyz + vec3(delta, 0., 0.);
  vec3 posX_1Y0 = vs_Pos.xyz + vec3(-delta, 0., 0.);
  vec3 posX0Y1 = vs_Pos.xyz + vec3(0., delta, 0.);
  vec3 posX0Y_1 = vs_Pos.xyz + vec3(0., -delta, 0.);

  float x1y0 = deformFactor(posX1Y0);
  float x_1y0 = deformFactor(posX_1Y0);
  float x0y1 = deformFactor(posX0Y1);
  float x0y_1 = deformFactor(posX0Y_1);

  vec3 gradX = vec3(2.0 * delta, 0., -seaDepth * (x1y0 - x_1y0));
  vec3 gradY = vec3(0., 2.0 * delta, -seaDepth * (x0y1 - x0y_1));
  vec3 nor = normalize(transpose(inverse(mat3(u_Model))) * cross(gradX, gradY));

  return vec4(nor, 0.0);
}

void main() {
  fs_Pos = vs_Pos;
  vec2 uv = vs_Pos.xy + 0.5;
  vec4 flag = texture(u_Texture, uv);
  vec4 pos = vs_Pos;
  float factor = smoothstep(0.0, 0.1, 1.0 - flag.w);
  pos.z -= seaDepth * factor;
  fs_Pos.z = 1.0 - factor;
  fs_Nor = calcNormal();
  fs_Light = vec4(u_LightDir, 0.0);
  vec4 modelposition = u_Model * pos;
  gl_Position = u_ViewProj * modelposition;
  fs_ShadowCoord = biasMatrix * u_LightViewProj * modelposition;
}
