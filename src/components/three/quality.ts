export type Quality = 'high' | 'low';

/** Antes de crear el renderer: solo con datos del dispositivo (sirve para decidir cuándo arrancar). */
export function deviceQuality(): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || matchMedia('(pointer: coarse)').matches;
  return weak ? 'low' : 'high';
}

const SOFTWARE_RE = /swiftshader|llvmpipe|software|basic render/i;

/** WebGL por software (SwiftShader, llvmpipe…): cualquier usuario sin GPU, no solo Lighthouse. */
export function isSoftwareGL(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  return SOFTWARE_RE.test(name);
}

// Crear un contexto WebGL por software bloquea ~500 ms: la prueba se hace en un Worker (OffscreenCanvas), fuera del hilo principal.
// Solo cuenta como "sin GPU" si el renderer lo dice. Sin contexto en el Worker (Brave, navegadores sin WebGL en
// OffscreenCanvas) no se concluye nada: se sigue con el camino normal.
const PROBE = `const g=new OffscreenCanvas(1,1).getContext('webgl');let n='';
if(g){const e=g.getExtension('WEBGL_debug_renderer_info');n=String(g.getParameter(e?e.UNMASKED_RENDERER_WEBGL:g.RENDERER));
const l=g.getExtension('WEBGL_lose_context');if(l)l.loseContext()}postMessage(n)`;
let probe: Promise<boolean> | null = null;

/** true solo si el renderer es por software. Se calcula una vez por sesión; si no se puede saber, false. */
export function noHardwareGL(): Promise<boolean> {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return Promise.resolve(false);
  return (probe ??= new Promise<boolean>(resolve => {
    const url = URL.createObjectURL(new Blob([PROBE], { type: 'text/javascript' }));
    const w = new Worker(url);
    const done = (v: boolean) => { clearTimeout(t); w.terminate(); URL.revokeObjectURL(url); resolve(v); };
    const t = setTimeout(() => done(false), 4000);   // si el Worker no contesta, se intenta con WebGL normal
    w.onmessage = e => {
      const soft = SOFTWARE_RE.test(String(e.data));
      if (soft) console.info('[3d] WebGL sin GPU (%s): se usa la alternativa 2D', e.data);
      done(soft);
    };
    w.onerror = () => done(false);
  }));
}

/** Con el contexto ya creado: WebGL por software también es 'low'. */
export function contextQuality(gl: WebGLRenderingContext | WebGL2RenderingContext): Quality {
  if (deviceQuality() === 'low') return 'low';
  return isSoftwareGL(gl) ? 'low' : 'high';
}
