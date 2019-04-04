#version 300 es
precision highp float;
precision highp sampler2DShadow;

uniform vec3 u_LightDir;
uniform mat4 u_LightViewProj;
uniform sampler2DShadow u_Shadow;

in vec4 fs_Col;
in vec4 fs_LocPos;
in vec4 fs_Light;
in vec4 fs_ShadowCoord;
out vec4 out_Col;

float shadow() {
  vec3 shadowCoord = fs_ShadowCoord.xyz /fs_ShadowCoord.w;
  shadowCoord.z -= 0.003;
  return texture(u_Shadow, shadowCoord);
}

void main()
{
    vec4 col = vec4(fs_Col.w > 0.5 ? vec3(0.45) : vec3(0.56), 1.0);
    col = fs_LocPos.x < -0.5 || fs_LocPos.x > 0.5 || fs_LocPos.y < -0.5 || fs_LocPos.y > 0.5 ?
            vec4(0.0) : col;

    vec3 diffuseTerm = vec3(1.34, 1.07, 0.99) * min(max(fs_Light.y, 0.0) + 0.2, 1.0);
    vec3 indirectTerm = vec3(0.16, 0.20, 0.28) * min(max(fs_Light.y, 0.0) + 0.2, 1.0);
    float v = shadow();
    diffuseTerm *= pow(vec3(v),vec3(1.0,1.2,1.5));
    vec3 color = pow((diffuseTerm + indirectTerm) *col.rgb, vec3(1.0 / 2.2));
    out_Col = vec4(color, col.a);
}
