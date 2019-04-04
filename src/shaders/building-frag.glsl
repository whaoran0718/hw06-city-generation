#version 300 es
precision highp float;
precision highp sampler2DShadow;

uniform mat4 u_Model;
uniform mat4 u_ViewProj;
uniform vec3 u_LightDir;
uniform mat4 u_LightViewProj;
uniform sampler2DShadow u_Shadow;

in vec4 fs_Pos;
in vec4 fs_Nor;
in vec2 fs_UV;
in vec3 fs_Style;
in vec4 fs_Light;
in vec4 fs_ShadowCoord;

out vec4 out_Col;

vec3 residence(vec2 uv, float flag) {
    if (flag > 0.5) {
        return vec3(0.88, 0.38, 0.32);
    }

    float width = 0.85;
    float height = 1.2;
    float winWidth = 0.55;
    float winHeight = 0.75;
    float x = uv.x - width * floor(uv.x / width);
    float y = uv.y - height * floor(uv.y / height);

    if (x > (width - winWidth) * 0.5 && x < (width + winWidth) * 0.5 &&
        y > (height - winHeight) * 0.5 && y < (height + winHeight) * 0.5)
    {
        return vec3(0.36, 0.36, 0.37);
    }
    else {
        return vec3(0.88, 0.77, 0.66);
    }
}

vec3 office(vec2 uv, float flag) {
    if (flag > 0.5) {
        return vec3(0.68, 0.68, 0.72);
    }

    float width = 0.5;
    float height = 1.0;
    float winWidth = 0.46;
    float winHeight = 0.80;
    float x = uv.x - width * floor(uv.x / width);
    float y = uv.y - height * floor(uv.y / height);

    if (x > (width - winWidth) * 0.5 && x < (width + winWidth) * 0.5 &&
        y > (height - winHeight) * 0.5 && y < (height + winHeight) * 0.5)
    {
        return vec3(0.24, 0.27, 0.33);
    }
    else {
        return vec3(0.68, 0.68, 0.72);
    }
}

vec3 skyscrapers(vec2 uv, float flag) {
    if (flag > 0.5) {
        return vec3(0.38, 0.40, 0.47);
    }

    float width = 0.4;
    float height = 0.8;
    float winWidth = 0.38;
    float winHeight = 0.76;
    float x = uv.x - width * floor(uv.x / width);
    float y = uv.y - height * floor(uv.y / height);

    if (/*x > (width - winWidth) * 0.5 && x < (width + winWidth) * 0.5 &&*/
        y > (height - winHeight) * 0.5 && y < (height + winHeight) * 0.5)
    {
        return vec3(0.08, 0.10, 0.18);
    }
    else {
        return vec3(0.38, 0.40, 0.47);
    }
}

float shadow() {
  vec3 shadowCoord = fs_ShadowCoord.xyz /fs_ShadowCoord.w;
  shadowCoord.z -= 0.0025;
  return texture(u_Shadow, shadowCoord);
}

void main() {
    vec3 col;
    vec2 uv = fs_UV * 1024.0;
    if (fs_Style.x < 0.5) {
        col = residence(uv, fs_Style.z);
    }
    else if (fs_Style.x < 1.5) {
        col = office(uv, fs_Style.z);
    }
    else {
        col = skyscrapers(uv, fs_Style.z);
    }

    vec3 diffuseTerm = vec3(1.34, 1.07, 0.99) * min(max(dot(fs_Nor, fs_Light), 0.0) + 0.2, 1.0);
    vec3 indirectTerm = vec3(0.16, 0.20, 0.28) * min(max(fs_Nor.y, 0.0) + 0.2, 1.0);
    float v = shadow();
    diffuseTerm *= pow(vec3(v),vec3(1.0,1.2,1.5));
    vec3 color = pow((diffuseTerm + indirectTerm) *col.rgb, vec3(1.0 / 2.2));
    out_Col = vec4(color, 1.0);
}