#version 300 es
precision highp float;

uniform mat4 u_Model;
uniform mat4 u_LightViewProj;
uniform sampler2D u_Texture;

in vec4 vs_Pos;
out vec4 fs_Pos;

float seaDepth = 0.03;

void main() {
    vec2 uv = vs_Pos.xy + 0.5;
    vec4 flag = texture(u_Texture, uv);
    vec4 pos = vec4(vs_Pos.xyz, 1.0);
    float factor = smoothstep(0.0, 0.1, 1.0 - flag.w);
    pos.z -= seaDepth * factor;
    fs_Pos.z = 1.0 - factor;
    vec4 modelposition = u_Model * pos;
    gl_Position = u_LightViewProj * modelposition;
}