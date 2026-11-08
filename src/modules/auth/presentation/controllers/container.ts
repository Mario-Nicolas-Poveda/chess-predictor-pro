import 'server-only';
import { LIMITS, rateLimit } from '@/core/shared/http/rateLimit';
import { LoginUser } from '../../application/LoginUser';
import { LoginWithGoogle } from '../../application/LoginWithGoogle';
import { RegisterUser } from '../../application/RegisterUser';
import { BcryptPasswordHasher } from '../../infrastructure/BcryptPasswordHasher';
import { GoogleOAuthClient } from '../../infrastructure/GoogleOAuthClient';
import { SupabaseAuthUserRepository } from '../../infrastructure/SupabaseAuthUserRepository';
import { SupabaseGuestRepository } from '../../infrastructure/SupabaseGuestRepository';
import { CreateGuest, DropGuest, GetMe, UpgradeGuest } from '../../application/GuestUseCases';

const users = new SupabaseAuthUserRepository();
const hasher = new BcryptPasswordHasher();
export const registerUser = new RegisterUser(users, hasher, key => rateLimit(key, LIMITS.register));
export const loginUser = new LoginUser(users, hasher, key => rateLimit(key, LIMITS.loginIp), key => rateLimit(key, LIMITS.loginEmail));
export const loginWithGoogle = new LoginWithGoogle(users);
export const googleOAuthClient = new GoogleOAuthClient();

const guests = new SupabaseGuestRepository();
export const createGuest = new CreateGuest(guests, key => rateLimit(key, LIMITS.guestCreate));
export const upgradeGuest = new UpgradeGuest(guests, hasher);
export const dropGuest = new DropGuest(guests);
export const getMe = new GetMe(guests);
