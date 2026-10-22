<template>
  <div ref="container" class="logo-container relative w-full aspect-7/2">
    <div
      v-if="showFallback"
      class="absolute inset-4 flex items-center justify-center text-text-primary"
    >
      <span class="logo-fallback">GERDEN</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Application, Text, GlProgram, defaultFilterVert, Filter } from 'pixi.js';
import fragment from '~/shaders/liquid-logo.frag?raw';

const container = ref<HTMLDivElement | null>(null);
// 正常加载只保留占位，失败后才显示备用文字。
const showFallback = ref(false);
let app: Application | null = null;
let filter: Filter | null = null;
const isInitialized = ref(false);
const isUnmounted = ref(false);
let resizeObserver: ResizeObserver | null = null;
let intersectionObserver: IntersectionObserver | null = null;
let isInViewport = false;
let motionQuery: MediaQueryList | null = null;

const syncPlayback = () => {
  if (!app || !isInitialized.value || isUnmounted.value) return;

  const shouldPlay =
    isInViewport &&
    document.visibilityState === 'visible' &&
    !motionQuery?.matches;

  if (shouldPlay) {
    app.start();
  } else {
    app.stop();
  }
};

// 只在初始化已经结束（成功或失败）后调用，避免销毁仍在初始化的实例。
const releaseResources = () => {
  intersectionObserver?.disconnect();
  intersectionObserver = null;
  resizeObserver?.disconnect();
  resizeObserver = null;
  document.removeEventListener('visibilitychange', syncPlayback);
  motionQuery?.removeEventListener('change', syncPlayback);
  motionQuery = null;
  isInViewport = false;

  const instance = app;
  app = null;
  isInitialized.value = false;

  try {
    if (instance?.renderer) {
      instance.destroy({ removeView: true }, { children: true });
    } else {
      // WebGL 不可用时 init 会失败，尚无 renderer，不能调用 app.destroy()。
      instance?.stage.destroy({ children: true });
    }
  } finally {
    filter?.destroy();
    filter = null;
  }
};

onMounted(async () => {
  await nextTick();
  if (isUnmounted.value) return;

  try {
    const host = container.value;
    if (!host) throw new Error('容器初始化错误');

    const instance = new Application();
    app = instance;

    await instance.init({
      width: host.clientWidth,
      height: host.clientHeight,
      backgroundAlpha: 0,
      resolution: window.devicePixelRatio * 2,
      autoDensity: true,
      autoStart: false,
      // 此滤镜只有 GLSL 实现；不自动切换到不支持它的渲染器。
      preference: ['webgl'],
    });

    isInitialized.value = true;
    if (isUnmounted.value) {
      releaseResources();
      return;
    }

    const canvas = instance.canvas;
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.visibility = 'hidden';
    host.appendChild(canvas);

    const glProgram = GlProgram.from({
      vertex: defaultFilterVert,
      fragment,
    });

    filter = new Filter({
      glProgram,
      resolution: 'inherit',
      padding: 12,
      resources: {
        timeUniforms: {
          uTime: { value: 0, type: 'f32' },
        },
      },
    });

    // filter.enabled = false

    const title = new Text({
      text: 'GERDEN',
      style: {
        fill: '#2d3c4e',
        fontWeight: 'bolder',
        fontSize: 160,
        fontFamily: 'Times New Roman',
      },
      anchor: { x: 0.5, y: 0.5 },
      filters: [filter],
    });

    instance.stage.addChild(title);
    const originalWidth = title.width;
    const originalHeight = title.height;

    const updateLayout = () => {
      if (!app || isUnmounted.value) return;

      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width <= 0 || height <= 0) return;

      if (instance.screen.width !== width || instance.screen.height !== height) {
        instance.renderer.resize(width, height);
      }

      const availableWidth = Math.max(1, width - 32);
      const availableHeight = Math.max(1, height - 32);
      const scale = Math.min(
        availableWidth / originalWidth,
        availableHeight / originalHeight,
        1,
      );

      title.scale.set(scale);
      title.position.set(width / 2, height / 2);
      instance.render();
      // 首次绘制完成后才展示画布，也兼容容器初始尺寸为零的情况。
      canvas.style.visibility = 'visible';
    };

    updateLayout();
    resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(host);

    instance.ticker.add((ticker) => {
      if (!filter) return;
      filter.resources.timeUniforms.uniforms.uTime += ticker.deltaMS / 1000;
    });

    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', syncPlayback);
    syncPlayback();

    intersectionObserver = new IntersectionObserver((entries) => {
      if (isUnmounted.value) return;
      for (const entry of entries) {
        isInViewport = entry.isIntersecting;
      }
      syncPlayback();
    });
    intersectionObserver.observe(host);
    document.addEventListener('visibilitychange', syncPlayback);
  } catch (error) {
    try {
      releaseResources();
    } finally {
      if (!isUnmounted.value) {
        showFallback.value = true;
        console.warn('[LiquidLogo] 动画初始化失败，显示静态文字。', error);
      }
    }
  }
});

onUnmounted(() => {
  isUnmounted.value = true;
  if (isInitialized.value) {
    releaseResources();
  }
  // 初始化尚未结束时，由 await 后的分支或 catch 负责清理。
});
</script>

<style scoped>
.logo-container {
  container-type: inline-size;
}

.logo-fallback {
  font-family: 'Times New Roman', serif;
  font-size: clamp(1rem, 18cqw, 10rem);
  font-weight: 700;
  line-height: 1;
}
</style>
