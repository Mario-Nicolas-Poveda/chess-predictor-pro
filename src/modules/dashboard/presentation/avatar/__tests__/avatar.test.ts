import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/apiClient';
import { fileProblem, sizeProblem, uploadFailure } from '../avatarApi';
import { centered, moveBy, sourceRect, zoomTo } from '../crop';

const D = 280;

describe('recorte', () => {
  it('arrastrar hasta el límite no deja huecos dentro del círculo', () => {
    const c = moveBy(moveBy(centered(1200, 800, D), 9999, 9999, D), 0, 0, D);
    expect(c.ox).toBe(0); expect(c.oy).toBe(0);
    const far = moveBy(c, -9999, -9999, D), s = D / 800;
    expect(far.ox).toBeCloseTo(D - 1200 * s); expect(far.oy).toBeCloseTo(0);
  });

  it('el zoom mantiene fijo el centro del círculo', () => {
    const c = centered(1000, 1000, D);
    const before = sourceRect(c, D), after = sourceRect(zoomTo(c, 2, D), D);
    expect(after.sx + after.size / 2).toBeCloseTo(before.sx + before.size / 2);
    expect(after.size).toBeCloseTo(before.size / 2);
  });

  it('sourceRect cae dentro de la imagen original', () => {
    let c = zoomTo(centered(640, 1280, D), 3, D);
    c = moveBy(c, -5000, 5000, D);
    const r = sourceRect(c, D);
    expect(r.sx).toBeGreaterThanOrEqual(0); expect(r.sy).toBeGreaterThanOrEqual(-1e-9);
    expect(r.sx + r.size).toBeLessThanOrEqual(640 + 1e-9); expect(r.sy + r.size).toBeLessThanOrEqual(1280 + 1e-9);
  });
});

describe('validación y errores de la foto', () => {
  it('un GIF da el mensaje de tipo y 6 MB el de tamaño', () => {
    expect(fileProblem({ type: 'image/gif', size: 1000 })).toBe('Ese archivo no es una imagen JPG, PNG o WebP.');
    expect(fileProblem({ type: 'image/png', size: 7.4 * 1024 * 1024 })).toBe('Esa imagen pesa 7,4 MB. El máximo es 5 MB.');
    expect(fileProblem({ type: 'image/webp', size: 1000 })).toBeNull();
  });

  it('menos de 128 × 128 es muy pequeña', () => {
    expect(sizeProblem(90, 90)).toBe('La imagen es muy pequeña (90 × 90 px). El mínimo es 128 × 128.');
    expect(sizeProblem(128, 400)).toBeNull();
  });

  it('413, 415, 429, 401 y red', () => {
    expect(uploadFailure(new ApiError(413, 'FILE_TOO_LARGE', 'x'))).toEqual({ text: 'El servidor rechazó la foto por su tamaño.', code: 'HTTP 413' });
    expect(uploadFailure(new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'x'))).toMatchObject({ code: 'HTTP 415' });
    expect(uploadFailure(new ApiError(429, 'RATE_LIMITED', 'x', undefined, { retryAfterS: 130 }))).toEqual({ text: 'Cambiaste la foto muchas veces. Prueba en 3 min.' });
    expect(uploadFailure(new ApiError(401, 'UNAUTHORIZED', 'x'))).toEqual({ login: true });
    expect(uploadFailure(new TypeError('Failed to fetch'))).toEqual({ text: 'No hay conexión. Tu foto no se subió; inténtalo de nuevo.' });
  });
});
