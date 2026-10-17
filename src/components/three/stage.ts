import * as THREE from 'three';
import { disposeTree } from './kit';
import { Tweens } from './tween';
import type { Quality } from './quality';

export type StageOptions = { quality: Quality; reducedMotion: boolean; fov?: number; continuous?: boolean; lights?: boolean };
export type FrameFn = (now: number, dt: number) => boolean | void;   // true = "sigo animando, pide otro frame"

// Renderer + escena + cámara + luces. Dibuja solo cuando algo se mueve y se pausa fuera de pantalla o con la pestaña oculta.
export function createStage(canvas: HTMLCanvasElement, o: StageOptions) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: o.quality === 'high', alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(o.quality === 'high' ? 2 : 1.25, window.devicePixelRatio || 1));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = o.quality === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(o.fov ?? 32, 1, .1, 100);
  const hemi = new THREE.HemisphereLight(0xfff6e8, 0xb9a48a, .85);
  const key = new THREE.DirectionalLight(0xfff0dc, 1.35);
  key.position.set(4, 10, 6); key.castShadow = true;
  const sm = o.quality === 'high' ? 1024 : 512;
  key.shadow.mapSize.set(sm, sm);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
  key.shadow.bias = -.0005; key.shadow.normalBias = .02;
  const fill = new THREE.DirectionalLight(0xdfe6ff, .25); fill.position.set(-6, 4, -5);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: .16 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.36; ground.receiveShadow = true;
  if (o.lights !== false) scene.add(hemi, key, fill, ground);   // lights: false = la escena pone su propia luz (landing)

  const tweens = new Tweens(o.reducedMotion);
  const frames = new Set<FrameFn>();
  let continuous = !!o.continuous && !o.reducedMotion;
  let raf = 0, last = 0, visible = true;

  const loop = (now: number) => {
    raf = 0;
    if (!visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(64, now - last) : 16; last = now;
    let busy = tweens.update(now);
    frames.forEach(fn => { if (fn(now, dt)) busy = true; });
    renderer.render(scene, camera);
    if (continuous || busy) raf = requestAnimationFrame(loop); else last = 0;
  };
  const invalidate = () => { if (!raf) raf = requestAnimationFrame(loop); };
  tweens.onStart = invalidate;

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); invalidate();
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; if (visible) invalidate(); });
  io.observe(canvas);
  const onVis = () => { if (!document.hidden) invalidate(); };
  document.addEventListener('visibilitychange', onVis);

  return {
    THREE, renderer, scene, camera, hemi, key, tweens, invalidate,
    setContinuous(on: boolean) { continuous = on && !o.reducedMotion; invalidate(); },
    onFrame(fn: FrameFn) { frames.add(fn); invalidate(); return () => { frames.delete(fn); }; },
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      tweens.clear(); frames.clear(); disposeTree(scene); disposeTree(ground); key.shadow.dispose();
      renderer.dispose();
      // Solo si el canvas ya salió del DOM: si React vuelve a montar el efecto sobre el mismo canvas
      // (StrictMode, Fast Refresh), un contexto perdido haría fallar al nuevo renderer ("reading 'precision'").
      if (!canvas.isConnected) renderer.forceContextLoss();
    },
  };
}
export type Stage = ReturnType<typeof createStage>;
