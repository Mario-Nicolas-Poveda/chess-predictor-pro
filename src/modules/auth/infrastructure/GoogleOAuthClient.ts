import 'server-only';
import { env } from '@/core/shared/env';
import type { GoogleIdentity } from '../domain/GoogleIdentity';

export const googleRedirectUri = () => `${env.APP_URL}/api/v1/auth/oauth/google/callback`;

export class GoogleOAuthClient {
  async exchange(code: string): Promise<GoogleIdentity> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        code, client_id: env.GOOGLE_CLIENT_ID ?? '', client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
        redirect_uri: googleRedirectUri(), grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) throw new Error(`Google token ${tokenRes.status}: ${await tokenRes.text()}`);
    const { access_token } = await tokenRes.json() as { access_token: string };

    const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!infoRes.ok) throw new Error(`Google userinfo ${infoRes.status}`);
    return await infoRes.json() as GoogleIdentity;
  }
}
