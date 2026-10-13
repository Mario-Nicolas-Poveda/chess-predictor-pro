import * as THREE from 'three';

type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';

// Porta el script de docs/design/landing-reference.html. Devuelve la limpieza para useEffect.
export function initLanding(root: HTMLElement, opts: { displayFont: string }): () => void {
  const signal = new AbortController();
  const on = { signal: signal.signal };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chapters = [...root.querySelectorAll<HTMLElement>('.chapter')];
  const railBtns = [...root.querySelectorAll<HTMLElement>('.rail button')];
  const navLinks = [...root.querySelectorAll<HTMLElement>('.nav a.link')];
  const plySpans = [...root.querySelectorAll<HTMLElement>('[data-ply]')];
  const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const sstep = (a: number, b: number, x: number) => smooth(clamp((x - a) / (b - a)));
  const ease = (t: number) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  root.querySelectorAll<HTMLElement>('[data-goto]').forEach(el => {
    el.addEventListener('click', e => {
      if (root.classList.contains('static')) return;
      e.preventDefault();
      window.scrollTo({ top: parseFloat(el.dataset.goto ?? '0') * maxScroll(), behavior: reduce ? 'auto' : 'smooth' });
    }, on);
  });

  /* ---------- WebGL (si falla, página plana) ---------- */
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: root.querySelector('canvas')!, antialias: true, powerPreference: 'high-performance' });
  } catch {
    root.classList.add('static');
    return () => { signal.abort(); root.classList.remove('static'); };
  }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x100c09);
  scene.fog = new THREE.FogExp2(0x100c09, 0.045);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  /* ---------- madera procedural ---------- */
  function ctx2d(c: HTMLCanvasElement) { return c.getContext('2d')!; }
  function grain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, vertical: boolean, base: string, dark: string, seed: number) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = base; ctx.fillRect(x, y, w, h);
    let s = seed;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const lines = Math.round((vertical ? w : h) / 3.2);
    for (let i = 0; i < lines; i++) {
      const off = (i / lines) * (vertical ? w : h) + rnd() * 3;
      const amp = 1.5 + rnd() * 4, freq = 0.004 + rnd() * 0.01, ph = rnd() * 6.28;
      ctx.strokeStyle = dark; ctx.globalAlpha = 0.04 + rnd() * 0.12; ctx.lineWidth = 0.6 + rnd() * 1.6;
      ctx.beginPath();
      const len = vertical ? h : w;
      for (let t = 0; t <= len; t += 6) {
        const d = off + Math.sin(t * freq + ph) * amp + Math.sin(t * freq * 3.1 + ph) * amp * 0.3;
        if (vertical) ctx.lineTo(x + d, y + t); else ctx.lineTo(x + t, y + d);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.restore();
  }
  function tex(canvas: HTMLCanvasElement, repeat?: number) {
    const t = new THREE.CanvasTexture(canvas);
    t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
    return t;
  }
  function boardCanvas() {
    const c = document.createElement('canvas'); c.width = c.height = 1024;
    const ctx = ctx2d(c); const sq = 128;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const light = (r + f) % 2 === 0;
      grain(ctx, f * sq, r * sq, sq, sq, light, light ? '#d6bd91' : '#5b3a24', light ? '#8a6a3e' : '#24140a', 17 + r * 8 + f);
    }
    ctx.strokeStyle = 'rgba(20,12,6,.35)'; ctx.lineWidth = 1.2;
    for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i * sq, 0); ctx.lineTo(i * sq, 1024); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * sq); ctx.lineTo(1024, i * sq); ctx.stroke(); }
    return c;
  }
  const FRAME = 9.4, BORDER = (FRAME - 8) / 2;
  function frameCanvas() {
    const c = document.createElement('canvas'); c.width = c.height = 1024;
    const ctx = ctx2d(c); const k = 1024 / FRAME, b = BORDER * k, sq = k;
    grain(ctx, 0, 0, 1024, 1024, false, '#2c1b10', '#0d0703', 5);
    ctx.strokeStyle = '#b8874a'; ctx.globalAlpha = .75; ctx.lineWidth = 3;
    ctx.strokeRect(b - 9, b - 9, 1024 - 2 * b + 18, 1024 - 2 * b + 18); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(214,170,110,.82)';
    ctx.font = `500 30px ${opts.displayFont}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const files = 'abcdefgh';
    for (let i = 0; i < 8; i++) {
      const file = files[i]!;
      const cx = b + (i + .5) * sq;
      ctx.fillText(file, cx, 1024 - b / 2 + 2);
      ctx.save(); ctx.translate(cx, b / 2); ctx.rotate(Math.PI); ctx.fillText(file, 0, 0); ctx.restore();
      const cy = b + (7 - i + .5) * sq;
      ctx.fillText(String(i + 1), b / 2, cy);
      ctx.save(); ctx.translate(1024 - b / 2, cy); ctx.rotate(Math.PI); ctx.fillText(String(i + 1), 0, 0); ctx.restore();
    }
    return c;
  }
  function plainWood(base: string, dark: string, seed: number, size = 512) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    grain(ctx2d(c), 0, 0, size, size, false, base, dark, seed); return c;
  }

  /* ---------- tablero, mesa ---------- */
  const frameMat = new THREE.MeshStandardMaterial({ map: tex(plainWood('#2c1b10', '#0d0703', 9)), roughness: .55 });
  const frameTopMat = new THREE.MeshPhysicalMaterial({ map: tex(frameCanvas()), roughness: .45, clearcoat: .5, clearcoatRoughness: .35 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(FRAME, .42, FRAME), [frameMat, frameMat, frameTopMat, frameMat, frameMat, frameMat]);
  frame.position.y = -.21; frame.receiveShadow = true; frame.castShadow = true; scene.add(frame);

  const play = new THREE.Mesh(new THREE.PlaneGeometry(8, 8),
    new THREE.MeshPhysicalMaterial({ map: tex(boardCanvas()), roughness: .42, clearcoat: .55, clearcoatRoughness: .3 }));
  play.rotation.x = -Math.PI / 2; play.position.y = .002; play.receiveShadow = true; scene.add(play);

  const table = new THREE.Mesh(new THREE.CircleGeometry(40, 64),
    new THREE.MeshStandardMaterial({ map: tex(plainWood('#1f140c', '#080402', 3, 512), 6), roughness: .8 }));
  table.rotation.x = -Math.PI / 2; table.position.y = -.42; table.receiveShadow = true; scene.add(table);

  /* ---------- luces ---------- */
  scene.add(new THREE.HemisphereLight(0x6b5642, 0x0a0705, .38));
  const spot = new THREE.SpotLight(0xffc88a, 2.05, 34, .82, .75, 1.4);
  spot.position.set(0, 7.25, 0); spot.target.position.set(0, 0, 0);
  spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -.0004; spot.shadow.normalBias = .02;
  spot.shadow.camera.near = 2; spot.shadow.camera.far = 14;
  scene.add(spot, spot.target);
  const rim = new THREE.DirectionalLight(0x8aa2c8, .42); rim.position.set(-9, 5, -11); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffb070, .22); fill.position.set(9, 3, 9); scene.add(fill);

  /* lámpara colgante */
  const lamp = new THREE.Group();
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0x2a1f16, metalness: .75, roughness: .38, side: THREE.DoubleSide, transparent: true });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(.22, 1.05, .85, 48, 1, true), shadeMat); shade.position.y = 7.75;
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe3b4, transparent: true });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.17, 24, 16), bulbMat); bulb.position.y = 7.4;
  const cordMat = new THREE.MeshBasicMaterial({ color: 0x0c0907, transparent: true });
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, 14, 6), cordMat); cord.position.y = 15.1;
  const glowC = document.createElement('canvas'); glowC.width = glowC.height = 128;
  {
    const g = ctx2d(glowC); const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, 'rgba(255,214,150,.9)'); rg.addColorStop(.25, 'rgba(255,180,100,.28)'); rg.addColorStop(1, 'rgba(255,160,80,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  }
  const glowMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowC), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const glow = new THREE.Sprite(glowMat); glow.scale.set(2.6, 2.6, 1); glow.position.y = 7.3;
  lamp.add(shade, bulb, cord, glow); scene.add(lamp);

  /* polvo en el cono de luz */
  const DUST = 420;
  const dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 4.2;
    dustPos[i * 3] = Math.cos(a) * r; dustPos[i * 3 + 1] = .3 + Math.random() * 6.6; dustPos[i * 3 + 2] = Math.sin(a) * r; dustSeed[i] = Math.random() * 100;
  }
  const dustAttr = new THREE.BufferAttribute(dustPos, 3);
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', dustAttr);
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffd7a0, size: .035, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  /* ---------- piezas ---------- */
  const ivory = new THREE.MeshPhysicalMaterial({ color: 0xeee2c8, roughness: .32, clearcoat: .5, clearcoatRoughness: .25 });
  const ebony = new THREE.MeshPhysicalMaterial({ color: 0x1c1512, roughness: .28, clearcoat: .75, clearcoatRoughness: .18 });
  type Pt = [number, number];
  const BASE: Pt[] = [[0, 0], [.36, 0], [.36, .055], [.335, .085], [.3, .105], [.3, .13], [.25, .15]];
  function arc(cy: number, R: number, a0: number, a1: number, n = 10): Pt[] {
    const out: Pt[] = [];
    for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; out.push([Math.max(0, R * Math.cos(a)), cy + R * Math.sin(a)]); }
    return out;
  }
  const lathe = (pts: Pt[]) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 48);
  const geo: Record<PieceType, THREE.LatheGeometry> = {
    p: lathe([...BASE, [.18, .2], [.12, .33], [.1, .4], [.17, .42], [.17, .45], [.075, .47], ...arc(.56, .11, -45, 90)]),
    r: lathe([...BASE, [.23, .2], [.2, .5], [.27, .56], [.27, .66], [0, .66]]),
    n: lathe([...BASE, [.22, .2], [.2, .3], [.25, .34], [0, .34]]),
    b: lathe([...BASE, [.2, .2], [.12, .48], [.18, .5], [.18, .53], [.1, .555], [.15, .62], [.16, .68], [.12, .76], [.05, .82], [0, .84]]),
    q: lathe([...BASE, [.22, .2], [.13, .6], [.21, .63], [.21, .66], [.13, .68], [.2, .83], [.23, .87], [.14, .87], [.09, .9], [0, .92]]),
    k: lathe([...BASE, [.23, .2], [.14, .62], [.22, .65], [.22, .68], [.14, .7], [.2, .86], [.21, .89], [.15, .9], [.07, .96], [0, .97]]),
  };
  const merlon = new THREE.BoxGeometry(.11, .1, .13);
  const ball = new THREE.SphereGeometry(1, 16, 12);
  const crossV = new THREE.BoxGeometry(.055, .22, .055), crossH = new THREE.BoxGeometry(.17, .055, .055);
  const headPts: Pt[] = [[-.21, .3], [.17, .3], [.14, .48], [.3, .6], [.37, .69], [.33, .76], [.13, .8], [.07, .93], [0, .86], [-.08, .91], [-.13, .78], [-.23, .6], [-.25, .44]];
  const headShape = new THREE.Shape(headPts.map(p => new THREE.Vector2(p[0], p[1])));
  const headGeo = new THREE.ExtrudeGeometry(headShape, { depth: .16, bevelEnabled: true, bevelThickness: .04, bevelSize: .03, bevelSegments: 3, curveSegments: 8 });
  headGeo.translate(0, 0, -.08);

  function mk(g: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, s = 1) {
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.scale.setScalar(s); m.castShadow = true; m.receiveShadow = true; return m;
  }
  function makePiece(type: PieceType, white: boolean) {
    const mat = white ? ivory : ebony, g = new THREE.Group();
    g.add(mk(geo[type], mat));
    if (type === 'r') for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const m = mk(merlon, mat, Math.cos(a) * .215, .71, Math.sin(a) * .215); m.rotation.y = -a; g.add(m); }
    if (type === 'n') { g.add(mk(headGeo, mat)); g.rotation.y = white ? Math.PI / 2 : -Math.PI / 2; }
    if (type === 'b') g.add(mk(ball, mat, 0, .87, 0, .04));
    if (type === 'q') { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.add(mk(ball, mat, Math.cos(a) * .2, .885, Math.sin(a) * .2, .036)); } g.add(mk(ball, mat, 0, .97, 0, .055)); }
    if (type === 'k') { g.add(mk(crossV, mat, 0, 1.08, 0)); g.add(mk(crossH, mat, 0, 1.1, 0)); }
    return g;
  }
  const sq = (name: string) => new THREE.Vector3(name.charCodeAt(0) - 97 - 3.5, 0, 3.5 - (parseInt(name[1]!, 10) - 1));

  const pieces: Record<string, THREE.Group> = {};
  const back: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let f = 0; f < 8; f++) {
    const file = String.fromCharCode(97 + f);
    const row: [string, PieceType, boolean][] = [[file + '1', back[f]!, true], [file + '2', 'p', true], [file + '7', 'p', false], [file + '8', back[f]!, false]];
    row.forEach(([s, t, w]) => { const g = makePiece(t, w); g.position.copy(sq(s)); scene.add(g); pieces[s] = g; });
  }

  /* Apertura Italiana, jugada con el scroll */
  const PLIES: [string, string][] = [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4'], ['f8', 'c5']];
  const MOVE_START = .335, MOVE_END = .535;
  const plyDur = (MOVE_END - MOVE_START) / PLIES.length;
  const plyT = (i: number, p: number) => clamp((p - (MOVE_START + i * plyDur)) / (plyDur * .82));
  function updateMoves(p: number) {
    PLIES.forEach(([from, to], i) => {
      const t = ease(plyT(i, p)), g = pieces[from]!;
      const a = sq(from), b = sq(to);
      g.position.set(a.x + (b.x - a.x) * t, Math.sin(Math.PI * t) * (g === pieces.g1 || g === pieces.b8 ? .9 : .55), a.z + (b.z - a.z) * t);
    });
    PLIES.forEach((_, i) => {
      const t = plyT(i, p), s = plySpans[i];
      if (!s) return;
      const played = t >= .999;
      s.classList.toggle('played', played);
      s.classList.toggle('now', t > 0 && !played);
    });
  }

  /* predicción: flechas + casillas de la última jugada */
  const overlay = new THREE.Group(); scene.add(overlay);
  const overlayMats: THREE.MeshBasicMaterial[] = [];
  function flatMat(color: number, max: number) {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    m.userData.max = max; overlayMats.push(m); return m;
  }
  function arrow(from: string, to: string, max: number) {
    const A = sq(from), B = sq(to); const dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz); const ux = dx / L, uz = dz / L, px = -uz, pz = ux;
    const w = .14, hw = .4, hl = .36, s0 = .26, e = L - .1;
    const P = (a: number, b: number) => new THREE.Vector2(A.x + ux * a + px * b, -(A.z + uz * a + pz * b));
    const shape = new THREE.Shape([P(s0, -w / 2), P(e - hl, -w / 2), P(e - hl, -hw / 2), P(e, 0), P(e - hl, hw / 2), P(e - hl, w / 2), P(s0, w / 2)]);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), flatMat(0xe0a65c, max));
    m.rotation.x = -Math.PI / 2; m.position.y = .014; overlay.add(m);
  }
  function mark(name: string, color: number, max: number) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.98, .98), flatMat(color, max)); m.rotation.x = -Math.PI / 2;
    const v = sq(name); m.position.set(v.x, .008, v.z); overlay.add(m);
  }
  mark('f8', 0xd29c55, .22); mark('c5', 0xd29c55, .3);
  arrow('c2', 'c3', .92); arrow('e1', 'g1', .62); arrow('d2', 'd3', .46);

  const coachMat = new THREE.MeshBasicMaterial({ color: 0xe0a65c, transparent: true, opacity: 0, depthWrite: false });
  const coachRing = new THREE.Mesh(new THREE.RingGeometry(.4, .47, 64), coachMat);
  coachRing.rotation.x = -Math.PI / 2;
  { const v = sq('c4'); coachRing.position.set(v.x, .012, v.z); }
  scene.add(coachRing);

  /* ---------- vuelo de la cámara ---------- */
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const KEYS = [
    { p: 0, pos: V(7.6, 5.4, 12.2), tgt: V(0, .3, 0) },
    { p: .19, pos: V(-6.9, 1.05, 5.2), tgt: V(2, .3, 2.4) },
    { p: .31, pos: V(-1.6, 1.6, 7.4), tgt: V(0, .3, 1) },
    { p: .47, pos: V(4.4, 5.6, 7.8), tgt: V(.1, 0, .2) },
    { p: .665, pos: V(0, 15.6, .7), tgt: V(0, 0, .15) },
    { p: .81, pos: V(-3.1, 1.55, 3.5), tgt: V(-1.5, .55, .5) },
    { p: 1, pos: V(-9.4, 8.8, -6.4), tgt: V(0, 0, 0) },
  ];
  const posCurve = new THREE.CatmullRomCurve3(KEYS.map(k => k.pos), false, 'centripetal');
  const tgtCurve = new THREE.CatmullRomCurve3(KEYS.map(k => k.tgt), false, 'centripetal');
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
  function placeCamera(p: number, time: number) {
    let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1]!.p) i++;
    const a = KEYS[i]!, b = KEYS[i + 1]!;
    let t = clamp((p - a.p) / (b.p - a.p)); t = t * .3 + smooth(t) * .7;
    const u = (i + t) / (KEYS.length - 1);
    posCurve.getPoint(u, camPos); tgtCurve.getPoint(u, camTgt);
    if (!reduce) { camPos.x += Math.sin(time * .00031) * .06; camPos.y += Math.sin(time * .00047) * .04; }
    camera.position.copy(camPos); camera.lookAt(camTgt);
  }

  /* ---------- capítulos y riel ---------- */
  const ranges = chapters.map(c => [parseFloat(c.dataset.in ?? '0'), parseFloat(c.dataset.out ?? '1')] as const);
  const bars = [...(chapters[3]?.querySelectorAll<HTMLElement>('.bar i') ?? [])];
  const barW = bars.map(el => parseFloat(el.style.getPropertyValue('--w')) || 0);
  const F = .035;
  let lastActive = -1;
  function updateChapters(p: number) {
    let best = 0, bestA = -1, predA = 0;
    chapters.forEach((c, i) => {
      const [a, b] = ranges[i]!;
      const inA = a <= 0 ? 1 : sstep(a - F, a, p);
      const outA = b >= 1 ? 1 : 1 - sstep(b, b + F, p);
      const al = inA * outA;
      c.style.opacity = al.toFixed(3);
      c.style.transform = `translateY(${((1 - inA) * 18 - (1 - outA) * 14).toFixed(1)}px)`;
      const vis = al > .01;
      c.style.visibility = vis ? 'visible' : 'hidden';
      c.setAttribute('aria-hidden', vis ? 'false' : 'true');
      if (i === 3) predA = al;
      if (al > bestA) { bestA = al; best = i; }
    });
    bars.forEach((el, i) => { el.style.transform = `scaleX(${(barW[i]! * predA).toFixed(3)})`; });
    if (best !== lastActive) {
      lastActive = best;
      railBtns.forEach((b, i) => b.classList.toggle('on', i === best));
      navLinks.forEach((l, i) => l.setAttribute('aria-current', i + 1 === best ? 'true' : 'false'));
    }
  }

  /* ---------- bucle ---------- */
  let target = 0, current = 0, rafId = 0;
  const readScroll = () => { target = clamp(scrollY / maxScroll()); };
  addEventListener('scroll', readScroll, { passive: true, signal: signal.signal });

  function resize() {
    const W = innerWidth, H = innerHeight, portrait = W / H < .9;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.fov = portrait ? 54 : 36;
    if (portrait) camera.setViewOffset(W, H, 0, H * .16, W, H); else camera.setViewOffset(W, H, -W * .16, 0, W, H);
    camera.updateProjectionMatrix();
    readScroll();
  }
  addEventListener('resize', resize, on); resize();

  function frameLoop(time: number) {
    current = reduce ? target : current + (target - current) * .075;
    if (Math.abs(target - current) < .00005) current = target;
    const p = current;
    placeCamera(p, time);
    updateMoves(p);
    updateChapters(p);

    const ov = sstep(.565, .62, p) * (1 - sstep(.735, .785, p));
    overlayMats.forEach(m => { m.opacity = (m.userData.max as number) * ov; });
    overlay.visible = ov > .001;
    coachMat.opacity = .85 * sstep(.75, .79, p) * (1 - sstep(.85, .89, p)) * (reduce ? 1 : (.75 + .25 * Math.sin(time * .003)));
    const lampA = 1 - sstep(.52, .585, p) * (1 - sstep(.73, .79, p));
    shadeMat.opacity = bulbMat.opacity = cordMat.opacity = glowMat.opacity = lampA;
    lamp.visible = lampA > .01;

    if (!reduce) {
      for (let i = 0; i < DUST; i++) {
        const seed = dustSeed[i]!;
        dustPos[i * 3 + 1]! += .0016 + Math.sin(time * .0005 + seed) * .0008;
        dustPos[i * 3]! += Math.sin(time * .0003 + seed) * .0012;
        if (dustPos[i * 3 + 1]! > 6.9) dustPos[i * 3 + 1] = .3;
      }
      dustAttr.needsUpdate = true;
    }
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frameLoop);
  }
  rafId = requestAnimationFrame(frameLoop);

  return () => {
    cancelAnimationFrame(rafId);
    signal.abort();
    scene.traverse(o => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach(mt => { (mt as THREE.MeshStandardMaterial | undefined)?.map?.dispose(); mt?.dispose(); });
    });
    renderer.dispose();
  };
}
