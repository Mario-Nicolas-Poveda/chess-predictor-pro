import 'server-only';
import { LIMITS, rateLimit } from '@/core/shared/http/rateLimit';
import { LoginUser } from '../../application/LoginUser';
import { LoginWithGoogle } from '../../application/LoginWithGoogle';
import { RegisterUser } from '../../application/RegisterUser';
import { BcryptPasswordHasher } from '../../infrastructure/BcryptPasswordHasher';
import { GoogleOAuthClient } from '../../infrastructure/GoogleOAuthClient';
import { SupabaseAuthUserRepository } from '../../infrastructure/SupabaseAuthUserRepository';

const users = new SupabaseAuthUserRepository();
const hasher = new BcryptPasswordHasher();
export const registerUser = new RegisterUser(users, hasher, key => rateLimit(key, LIMITS.register));
export const loginUser = new LoginUser(users, hasher, key => rateLimit(key, LIMITS.loginIp), key => rateLimit(key, LIMITS.loginEmail));
export const loginWithGoogle = new LoginWithGoogle(users);
export const googleOAuthClient = new GoogleOAuthClient();
