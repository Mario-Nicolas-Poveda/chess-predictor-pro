/**
 * Cerrar sesión sin congelarse: POST /auth/logout con tope de 5 s y, pase lo que pase, navegación COMPLETA a /login
 * (no router.push): se descargan la escena 3D, los timbres, las consultas en curso y la caché del router.
 */
let leaving = false;

const go = (url: string) => window.location.replace(url);

export async function logout(navigate: (url: string) => void = go): Promise<void> {
  if (leaving) return;   // doble clic o un 401 a la vez: una sola salida
  leaving = true;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: ctrl.signal });
  } catch { /* sin red o tardó: igual salimos */ }
  clearTimeout(t);
  navigate('/login');
}

/** Un 401 en una página con sesión: una sola salida, no una por cada consulta. */
export function onUnauthorized(navigate: (url: string) => void = go): void {
  if (leaving) return;
  leaving = true;
  navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
}

/** Solo para tests. */
export const __resetLogout = () => { leaving = false; };
