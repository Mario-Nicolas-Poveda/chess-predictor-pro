import { Section } from '@/components/ui/Section';

const TICKS = [1500, 1400, 1300, 1200];
const y = (elo: number) => 30 + (1500 - elo) * (240 / 300);

// Estados vacíos de la gráfica de Elo y del historial; se llenan desde el Sprint 3.
export function EmptyHistory() {
  return (
    <div className="mt-14 space-y-14">
      <Section title="Evolución de Elo" aside="Últimos 30 días">
        <svg viewBox="0 0 1200 300" className="w-full" role="img" aria-label="Gráfica de Elo vacía">
          {TICKS.map(t => (
            <g key={t}>
              <line x1="56" x2="1200" y1={y(t)} y2={y(t)} className="stroke-rule" strokeWidth="1" />
              <text x="0" y={y(t) + 4} className="fill-ink-faint font-mono text-[13px]">{t}</text>
            </g>
          ))}
          <line x1="56" x2="1200" y1={y(1200)} y2={y(1200)} className="stroke-ink-faint" strokeWidth="1.5" strokeDasharray="4 6" />
        </svg>
        <p className="mt-4 font-display text-xl italic text-ink-soft">Tu curva empieza con tu primera partida.</p>
      </Section>

      <Section title="Últimas partidas" aside={
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-2"><i className="h-0.5 w-4 bg-wine" />Victoria</span>
          <span className="flex items-center gap-2"><i className="h-0.5 w-4 bg-sand" />Derrota</span>
        </span>
      }>
        <div className="flex gap-2" aria-hidden="true">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="h-14 flex-1 rounded-[2px] border border-dashed border-sand" />
          ))}
        </div>
        <div className="mt-3 flex justify-between font-mono text-xs text-ink-faint">
          <span>Más antigua</span><span>Racha actual · —</span>
        </div>
      </Section>
    </div>
  );
}
