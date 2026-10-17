'use client';

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react';
import * as m from 'motion/react-m';
import { useThreeScene } from '@/components/three/useThreeScene';
import './landing.css';

const loadLanding = () => import('./landingScene').then(mod => mod.createLandingScene);

const w = (v: number) => ({ '--w': v }) as CSSProperties;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const F = .035;   // duración del fundido de cada capítulo, en progreso
const inOf = (a: number, p: number) => (a <= 0 ? 1 : sstep(a - F, a, p));
const outOf = (b: number, p: number) => (b >= 1 ? 1 : 1 - sstep(b, b + F, p));

// Capítulos: [entra, sale] en progreso 0..1; el riel y la nav marcan el más visible
const CH = [[0, .075], [.14, .245], [.32, .545], [.6, .725], [.77, .855], [.92, 1]] as const;
const RAIL = [['Inicio', 0], ['Arena', .19], ['IA', .47], ['Predicción', .665], ['Coach', .81], ['Torneos', 1]] as const;
const MOVE_START = .335, MOVE_END = .535, PLY_DUR = (MOVE_END - MOVE_START) / 6;
const BARS = [.41, .27, .19];

export function Landing() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.6, restDelta: 0.0005 });
  const progress = reduce ? scrollYProgress : smooth;
  const { canvasRef, scene, failed } = useThreeScene(loadLanding);
  const [active, setActive] = useState(0);
  const plyRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const barRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => { scene?.setProgress(progress.get()); }, [scene, progress]);
  // sin re-render por frame: la escena, las jugadas y las barras se actualizan desde el motion value
  useMotionValueEvent(progress, 'change', p => {
    scene?.setProgress(p);
    let best = 0, bestA = -1;
    CH.forEach(([a, b], i) => { const al = inOf(a, p) * outOf(b, p); if (al > bestA) { bestA = al; best = i; } });
    setActive(prev => (prev === best ? prev : best));
    plyRefs.current.forEach((el, i) => {
      const t = clamp((p - (MOVE_START + i * PLY_DUR)) / (PLY_DUR * .82));
      el?.classList.toggle('played', t >= .999);
      el?.classList.toggle('now', t > 0 && t < .999);
    });
    const predA = inOf(CH[3][0], p) * outOf(CH[3][1], p);
    barRefs.current.forEach((el, i) => { if (el) el.style.transform = `scaleX(${(BARS[i]! * predA).toFixed(3)})`; });
  });

  const goto = (p: number) => (e: MouseEvent) => {
    if (failed) return;   // página plana: el ancla normal basta
    e.preventDefault();
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    window.scrollTo({ top: p * max, behavior: reduce ? 'auto' : 'smooth' });
  };
  const ply = (i: number, san: string) => <span ref={el => { plyRefs.current[i] = el; }}>{san}</span>;

  return (
    <div className={`landing${failed ? ' static' : ''}`}>
      {/* fondo oscuro estático mientras carga three o si no hay WebGL; el canvas entra con un fundido */}
      <canvas ref={canvasRef} aria-hidden="true" style={{ opacity: scene ? 1 : 0, transition: 'opacity .7s' }} />
      <div className="veil" />

      <header className="nav">
        <a className="brand" href="#inicio" onClick={goto(0)}>Chess Predictor <b>Pro</b></a>
        <ul>
          {RAIL.slice(1).map(([label, p], i) => (
            <li key={label}><a className="link" href={`#${['arena', 'ia', 'prediccion', 'coach', 'torneos'][i]}`} onClick={goto(p)}
              aria-current={active === i + 1 ? 'true' : undefined}>{label === 'IA' ? 'Contra la IA' : label}</a></li>
          ))}
        </ul>
        <Link className="pill" href="/login">Jugar ahora</Link>
      </header>

      <div className="chapters">
        <Chapter id="inicio" range={CH[0]} progress={progress} className="first">
          <p className="eyebrow">Ajedrez en línea <span>con inteligencia artificial</span></p>
          <h1>Ve tu próxima jugada <em>antes</em> de hacerla.</h1>
          <p>Juega contra personas o contra el motor, consulta qué jugada es más probable en cada posición y recibe el análisis de tus partidas.</p>
          <div className="actions">
            <Link className="pill" href="/register">Crear cuenta</Link>
            <a className="pill ghost" href="#arena" onClick={goto(.19)}>Ver el recorrido</a>
          </div>
          <div className="hint"><i />Desliza para recorrer el tablero</div>
        </Chapter>

        <Chapter id="arena" range={CH[1]} progress={progress}>
          <p className="eyebrow">Arena <span>Partidas en tiempo real</span></p>
          <h2>Rivales de tu nivel, en la misma mesa en segundos.</h2>
          <p>El emparejamiento busca a alguien con un ELO cercano al tuyo. Cada movimiento se valida en el servidor y la partida queda guardada en tu historial.</p>
        </Chapter>

        <Chapter id="ia" range={CH[2]} progress={progress}>
          <p className="eyebrow">Contra la IA <span>Apertura Italiana</span></p>
          <h2>El motor responde a cada jugada.</h2>
          <p>Elige la dificultad y juega a tu ritmo. Sigue desplazándote para ver la apertura.</p>
          <div className="moves" aria-label="Jugadas de la apertura">
            <span className="n">1.</span>{ply(0, 'e4')}{ply(1, 'e5')}
            <span className="n">2.</span>{ply(2, 'Cf3')}{ply(3, 'Cc6')}
            <span className="n">3.</span>{ply(4, 'Ac4')}{ply(5, 'Ac5')}
          </div>
        </Chapter>

        <Chapter id="prediccion" range={CH[3]} progress={progress}>
          <p className="eyebrow">Predicción <span>Juegan las blancas</span></p>
          <h2>Las jugadas más probables, sobre el tablero.</h2>
          <div className="cands">
            {[['4. c3', '41 %'], ['4. O-O', '27 %'], ['4. d3', '19 %']].map(([san, pct], i) => (
              <div key={san} className="cand"><span>{san}</span><span className="bar"><i ref={el => { barRefs.current[i] = el; }} style={w(BARS[i]!)} /></span><span className="pct">{pct}</span></div>
            ))}
          </div>
          <p className="note">Porcentajes de ejemplo para esta demo.</p>
        </Chapter>

        <Chapter id="coach" range={CH[4]} progress={progress}>
          <p className="eyebrow">AI Coach <span>Después de la partida</span></p>
          <h2>Un entrenador que revisa tus partidas contigo.</h2>
          <blockquote className="quote">“Con el alfil en c4 sueles retrasar el enroque. Enroca antes de abrir el centro con d4.”</blockquote>
          <p className="note">Ejemplo de análisis generado a partir de tu historial.</p>
        </Chapter>

        <Chapter id="torneos" range={CH[5]} progress={progress}>
          <p className="eyebrow">Torneos <span>Ranking global</span></p>
          <h2>Sube en el ranking, partida a partida.</h2>
          <p>Inscríbete en torneos programados, sigue el cuadro de llaves y compara tu ELO con el de toda la comunidad.</p>
          <ul className="facts">
            <li>Arena</li><li>Matchmaking</li><li>Motor de IA</li><li>AI Coach</li><li>Torneos</li>
          </ul>
          <div className="actions">
            <Link className="pill" href="/register">Crear cuenta</Link>
            <a className="pill ghost" href="#inicio" onClick={goto(0)}>Volver al inicio</a>
          </div>
        </Chapter>
      </div>

      <ol className="rail" aria-label="Secciones">
        {RAIL.map(([label, p], i) => (
          <li key={label}><button type="button" className={active === i ? 'on' : undefined} onClick={goto(p)}>{label}</button></li>
        ))}
      </ol>

      <div className="spacer" />
    </div>
  );
}

// El primero se pinta visible desde el servidor (progreso 0 → opacidad 1): la página está completa aunque el 3D no haya cargado.
function Chapter({ id, range: [a, b], progress, className = '', children }:
  { id: string; range: readonly [number, number]; progress: MotionValue<number>; className?: string; children: ReactNode }) {
  const opacity = useTransform(progress, p => inOf(a, p) * outOf(b, p));
  const y = useTransform(progress, p => (1 - inOf(a, p)) * 18 - (1 - outOf(b, p)) * 14);
  const visibility = useTransform(opacity, o => (o < 0.01 ? 'hidden' : 'visible'));
  return <m.section id={id} className={`chapter ${className}`} style={{ opacity, y, visibility }}>{children}</m.section>;
}
