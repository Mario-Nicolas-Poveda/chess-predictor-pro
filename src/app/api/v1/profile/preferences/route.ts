import { withAuth } from '@/core/shared/auth/withAuth';
import { readJson } from '@/core/shared/http/readJson';
import { noContent, ok } from '@/core/shared/http/responses';
import { ProfilePreferencesSchema } from '@/modules/dashboard/infrastructure/dto/preferencesSchemas';
import { getUserProfile, resetPreferences, savePreferences } from '@/modules/dashboard/presentation/controllers/container';

// el perfil ya trae las preferencias completadas con los valores por defecto
export const GET = withAuth(async (_req, s) =>
  ok({ preferences: (await getUserProfile.execute(s.userId)).preferences }, { headers: { 'Cache-Control': 'no-store' } }));

export const PUT = withAuth(async (req, s) =>
  ok({ preferences: await savePreferences.execute(s.userId, await readJson(req, ProfilePreferencesSchema)) }));

export const DELETE = withAuth(async (_req, s) => {
  await resetPreferences.execute(s.userId);   // idempotente: 204 aunque no hubiera nada guardado
  return noContent();
});
