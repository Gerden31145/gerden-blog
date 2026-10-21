precision highp float;

in vec2 vTextureCoord; // 接收一个叫 vTextureCoord 的二维坐标
uniform sampler2D uTexture; // 提供一张叫 uTexture 的图片供我们读取
uniform float uTime;
uniform vec4 uInputSize;
uniform vec4 uInputClamp;
out vec4 finalColor; // 声明最终要输出的颜色

void main() {
  vec2 uv = vTextureCoord;

  float phaseShift = sin(uv.x * 12.0 - uTime * 0.3);

  float offsetX = sin(uv.y * 23.0 + uTime * 0.8 + phaseShift) * 2.0;
  float offsetY = sin(uv.x * 36.0 - uTime * 0.5) * 3.0;

  uv.x += offsetX * uInputSize.z;
  uv.y += offsetY * uInputSize.w; // 统一单位

  uv = clamp(uv, uInputClamp.xy, uInputClamp.zw);

  finalColor = texture(uTexture, uv);
}