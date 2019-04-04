#version 300 es

uniform mat4 u_Model;
uniform mat4 u_View;
uniform mat4 u_ViewProj;
uniform vec3 u_LightDir;
uniform mat4 u_LightViewProj;

in vec4 vs_Pos;
in vec4 vs_Col;
in vec4 vs_Translate;

out vec4 fs_Col;
out vec4 fs_LocPos;
out vec4 fs_Light;
out vec4 fs_ShadowCoord;

const mat4 biasMatrix = mat4(0.5, 0.0, 0.0, 0.0,
                             0.0, 0.5, 0.0, 0.0,
                             0.0, 0.0, 0.5, 0.0,
                             0.5, 0.5, 0.5, 1.0);

float highwayWidth = 0.006;
float streetWidth = 0.002;

void main()
{
    fs_Col = vs_Col;
    vec2 start = vec2(vs_Translate.xy);
    vec2 end = vec2(vs_Translate.zw);
    vec2 segment = end - start;
    vec2 translate = (end + start) * 0.5;
    float len = length(segment);
    float c = segment.x / len;
    float s = segment.y / len;

    float width = vs_Col.w < 0.5 ? streetWidth : highwayWidth;
    mat3 transform = mat3(len * c, len * s, 0.0,
                          -width * s, width * c, 0.0,
                          translate.x, translate.y, 1.0);
    vec3 pos = transform * vec3(vs_Pos.xy, 1.0);
    fs_LocPos = vec4(pos.xy, 0.0, 1.0);
    fs_Light = vec4(u_LightDir, 0.0);
    vec4 modelposition = u_Model * fs_LocPos;
    gl_Position = u_ViewProj * modelposition;
    fs_ShadowCoord = biasMatrix * u_LightViewProj * modelposition;
}
