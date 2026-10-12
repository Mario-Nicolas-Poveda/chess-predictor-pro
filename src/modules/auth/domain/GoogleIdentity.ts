// lo que devuelve el endpoint userinfo de Google
export interface GoogleIdentity {
  sub: string; email: string; email_verified: boolean; name?: string; picture?: string;
}
