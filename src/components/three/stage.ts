import * as THREE from 'three';
import { disposeTree, lux } from './kit';
import { Tweens } from './tween';
import { contextQuality, isSoftwareGL, type Quality } from './quality';
import { SceneAborted, SoftwareWebGL, nextFrame, yieldToMain } from './yield';

export type StageOptions = { quality: Quality; reducedMotion: boolean; signal: AbortSignal; fov?: number; continuous?: boolean; lights?: boolean };
export type FrameFn = (now: number, dt: number) => boolean | void;   // true = "sigo animando, pide otro frame"

/**
 * Renderer + escena + cámara + luces, creado por pasos que ceden el hilo (ninguno bloquea mucho).
 * Dibuja solo cuando algo se mueve y se pausa fuera de pantalla o con la pestaña oculta.
 * La escena llama `step()` entre sus pasos pesados y `finish()` al final (compila shaders y pinta el primer frame).
 */
export async function createStage(canvas: HTMLCanvasElement, o: StageOptions) {
  // 1 · renderer. Con WebGL por software (sin GPU) solo la primera compilación de shaders bloquea ~650 ms y cada frame
  // es una tarea larga: no se crea la escena y la pantalla muestra su alternativa 2D, el modo ligero de verdad.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: o.quality === 'high', alpha: true, powerPreference: 'high-performance' });
  const gl = renderer.getContext();
  if (isSoftwareGL(gl)) { console.info('[3d] WebGL sin GPU: se usa la alternativa 2D'); renderer.dispose(); throw new SoftwareWebGL(); }
  const quality = contextQuality(gl);
  // baja: resolución 1 y sin sombras en tiempo real (las piezas llevan sombra de contacto)
  renderer.setPixelRatio(quality === 'high' ? Math.min(2, window.devicePixelRatio || 1) : 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = quality === 'high';
  renderer.shadowMap.type = THREE.PCFShadowMap;   // PCFSoft casi no se distingue aquí y su shader compila bastante más lento
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(o.fov ?? 32, 1, .1, 100);

  let disposed = false;
  const step = async () => {
    await yieldToMain();
    if (o.signal.aborted) { dispose(); throw new SceneAborted(); }
  };
  await step();

  // 2 · luces, suelo y sombras según la calidad
  const hemi = new THREE.HemisphereLight(0xfff6e8, 0xb9a48a, lux(.85));
  const key = new THREE.DirectionalLight(0xfff0dc, lux(1.35));
  key.position.set(4, 10, 6); key.castShadow = quality === 'high';
  const sm = quality === 'high' ? 1024 : 512;
  key.shadow.mapSize.set(sm, sm);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
  key.shadow.bias = -.0005; key.shadow.normalBias = .02;
  const fill = new THREE.DirectionalLight(0xdfe6ff, lux(.25)); fill.position.set(-6, 4, -5);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: .16 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.36; ground.receiveShadow = true;
  if (o.lights !== false) scene.add(hemi, key, fill);   // lights: false = la escena pone su propia luz (landing)
  if (o.lights !== false && quality === 'high') scene.add(ground);   // el suelo solo recoge sombras: en baja sobra (un programa menos que compilar)

  const tweens = new Tweens(o.reducedMotion);
  const frames = new Set<FrameFn>();
  let continuous = !!o.continuous && !o.reducedMotion;
  let raf = 0, last = 0, visible = true, ready = false;
  // calidad baja: máximo 30 fps; cada frame cuesta más
  const minGap = quality === 'low' ? 33 : 0;

  const loop = (now: number) => {
    raf = 0;
    if (!visible || document.hidden || !ready) { last = 0; return; }
    if (minGap && last && now - last < minGap) { raf = requestAnimationFrame(loop); return; }
    const dt = last ? Math.min(64, now - last) : 16; last = now;
    let busy = tweens.update(now);
    frames.forEach(fn => { if (fn(now, dt)) busy = true; });
    renderer.render(scene, camera);
    if (continuous || busy) raf = requestAnimationFrame(loop); else last = 0;
  };
  const invalidate = () => { if (!raf && !disposed) raf = requestAnimationFrame(loop); };
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

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    tweens.clear(); frames.clear(); disposeTree(scene); disposeTree(ground); key.shadow.dispose();
    renderer.dispose();
    // Solo si el canvas ya salió del DOM: si React vuelve a montar el efecto sobre el mismo canvas
    // (StrictMode, Fast Refresh), un contexto perdido haría fallar al nuevo renderer ("reading 'precision'").
    if (!canvas.isConnected) renderer.forceContextLoss();
  }

  await step();

  return {
    THREE, renderer, scene, camera, hemi, key, tweens, invalidate, quality, step, dispose,
    setContinuous(on: boolean) { continuous = on && !o.reducedMotion; invalidate(); },
    onFrame(fn: FrameFn) { frames.add(fn); invalidate(); return () => { frames.delete(fn); }; },
    /** 5 · compila los shaders en su propia tarea; 6 · primer frame. Antes de esto el bucle no dibuja. */
    async finish() {
      await step();
      // compileAsync (KHR_parallel_shader_compile) compila sin bloquear el hilo: en frío eran cientos de ms de una vez
      await renderer.compileAsync(scene, camera);
      await nextFrame();
      if (o.signal.aborted) { dispose(); throw new SceneAborted(); }
      ready = true;
      invalidate();
    },
  };
}
export type Stage = Awaited<ReturnType<typeof createStage>>;
