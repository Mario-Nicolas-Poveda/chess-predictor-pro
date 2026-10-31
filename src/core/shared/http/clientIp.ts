// Vercel sobrescribe x-forwarded-for con la IP real: el cliente no puede falsificarla
export const clientIp = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'sin-ip';
