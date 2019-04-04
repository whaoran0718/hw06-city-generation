#version 300 es
precision highp float;

uniform mat4 u_Model;
uniform mat4 u_View;
uniform mat4 u_ViewProj;
uniform vec3 u_LightDir;
uniform mat4 u_LightViewProj;

in vec4 vs_Pos;
in vec4 vs_Nor;
in vec2 vs_UV;
out vec4 fs_Pos;
out vec4 fs_Nor;
out vec2 fs_UV;
out vec3 fs_Style;
out vec4 fs_Light;
out vec4 fs_ShadowCoord;

const mat4 biasMatrix = mat4(0.5, 0.0, 0.0, 0.0,
                             0.0, 0.5, 0.0, 0.0,
                             0.0, 0.0, 0.5, 0.0,
                             0.5, 0.5, 0.5, 1.0);

void main() {
    vec4 modelposition = u_Model * vec4(vs_Pos.xyz, 1.0);
    vec4 position = u_ViewProj * modelposition;
    fs_Pos = position;
    fs_Nor = normalize(u_Model * vec4(vs_Nor.xyz,0.0));
    fs_UV = vs_UV;
    fs_Style = vec3(vs_Pos.w, vs_Nor.w, vs_Nor.z > 0.99 ? 1.0 : 0.0);
    fs_Light = vec4(u_LightDir, 0.0);
    gl_Position = position;
    fs_ShadowCoord = biasMatrix * u_LightViewProj * modelposition;
}