'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import Link from 'next/link';
import { cormorant } from '@/lib/fonts';
import { initLanding } from './initLanding';
import './landing.css';

const w = (v: number) => ({ '--w': v }) as CSSProperties;

export function Landing() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    return initLanding(rootRef.current, { displayFont: cormorant.style.fontFamily });
  }, []);

  return (
    <div className="landing" ref={rootRef}>
      <canvas aria-hidden="true" />
      <div className="veil" />

      <header className="nav">
        <a className="brand" href="#" data-goto="0">Chess Predictor <b>Pro</b></a>
        <ul>
          <li><a className="link" href="#arena" data-goto="0.19">Arena</a></li>
          <li><a className="link" href="#ia" data-goto="0.47">Contra la IA</a></li>
          <li><a className="link" href="#prediccion" data-goto="0.665">Predicción</a></li>
          <li><a className="link" href="#coach" data-goto="0.81">Coach</a></li>
          <li><a className="link" href="#torneos" data-goto="1">Torneos</a></li>
        </ul>
        <Link className="pill" href="/login">Jugar ahora</Link>
      </header>

      <div className="chapters">
        <section className="chapter first" id="inicio" data-in="0" data-out="0.075">
          <p className="eyebrow">Ajedrez en línea <span>con inteligencia artificial</span></p>
          <h1>Ve tu próxima jugada <em>antes</em> de hacerla.</h1>
          <p>Juega contra personas o contra el motor, consulta qué jugada es más probable en cada posición y recibe el análisis de tus partidas.</p>
          <div className="actions">
            <Link className="pill" href="/register">Crear cuenta</Link>
            <a className="pill ghost" href="#arena" data-goto="0.19">Ver el recorrido</a>
          </div>
          <div className="hint"><i />Desliza para recorrer el tablero</div>
        </section>

        <section className="chapter" id="arena" data-in="0.14" data-out="0.245">
          <p className="eyebrow">Arena <span>Partidas en tiempo real</span></p>
          <h2>Rivales de tu nivel, en la misma mesa en segundos.</h2>
          <p>El emparejamiento busca a alguien con un ELO cercano al tuyo. Cada movimiento se valida en el servidor y la partida queda guardada en tu historial.</p>
        </section>

        <section className="chapter" id="ia" data-in="0.32" data-out="0.545">
          <p className="eyebrow">Contra la IA <span>Apertura Italiana</span></p>
          <h2>El motor responde a cada jugada.</h2>
          <p>Elige la dificultad y juega a tu ritmo. Sigue desplazándote para ver la apertura.</p>
          <div className="moves" aria-label="Jugadas de la apertura">
            <span className="n">1.</span><span data-ply="0">e4</span><span data-ply="1">e5</span>
            <span className="n">2.</span><span data-ply="2">Cf3</span><span data-ply="3">Cc6</span>
            <span className="n">3.</span><span data-ply="4">Ac4</span><span data-ply="5">Ac5</span>
          </div>
        </section>

        <section className="chapter" id="prediccion" data-in="0.6" data-out="0.725">
          <p className="eyebrow">Predicción <span>Juegan las blancas</span></p>
          <h2>Las jugadas más probables, sobre el tablero.</h2>
          <div className="cands">
            <div className="cand"><span>4. c3</span><span className="bar"><i style={w(0.41)} /></span><span className="pct">41 %</span></div>
            <div className="cand"><span>4. O-O</span><span className="bar"><i style={w(0.27)} /></span><span className="pct">27 %</span></div>
            <div className="cand"><span>4. d3</span><span className="bar"><i style={w(0.19)} /></span><span className="pct">19 %</span></div>
          </div>
          <p className="note">Porcentajes de ejemplo para esta demo.</p>
        </section>

        <section className="chapter" id="coach" data-in="0.77" data-out="0.855">
          <p className="eyebrow">AI Coach <span>Después de la partida</span></p>
          <h2>Un entrenador que revisa tus partidas contigo.</h2>
          <blockquote className="quote">“Con el alfil en c4 sueles retrasar el enroque. Enroca antes de abrir el centro con d4.”</blockquote>
          <p className="note">Ejemplo de análisis generado a partir de tu historial.</p>
        </section>

        <section className="chapter" id="torneos" data-in="0.92" data-out="1">
          <p className="eyebrow">Torneos <span>Ranking global</span></p>
          <h2>Sube en el ranking, partida a partida.</h2>
          <p>Inscríbete en torneos programados, sigue el cuadro de llaves y compara tu ELO con el de toda la comunidad.</p>
          <ul className="facts">
            <li>Arena</li><li>Matchmaking</li><li>Motor de IA</li><li>AI Coach</li><li>Torneos</li>
          </ul>
          <div className="actions">
            <Link className="pill" href="/register">Crear cuenta</Link>
            <a className="pill ghost" href="#inicio" data-goto="0">Volver al inicio</a>
          </div>
        </section>
      </div>

      <ol className="rail" aria-label="Secciones">
        <li><button type="button" data-goto="0">Inicio</button></li>
        <li><button type="button" data-goto="0.19">Arena</button></li>
        <li><button type="button" data-goto="0.47">IA</button></li>
        <li><button type="button" data-goto="0.665">Predicción</button></li>
        <li><button type="button" data-goto="0.81">Coach</button></li>
        <li><button type="button" data-goto="1">Torneos</button></li>
      </ol>

      <div className="spacer" />
    </div>
  );
}
