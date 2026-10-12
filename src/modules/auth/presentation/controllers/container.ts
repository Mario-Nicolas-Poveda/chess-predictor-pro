import 'server-only';
import { LoginUser } from '../../application/LoginUser';
import { RegisterUser } from '../../application/RegisterUser';
import { BcryptPasswordHasher } from '../../infrastructure/BcryptPasswordHasher';
import { SupabaseAuthUserRepository } from '../../infrastructure/SupabaseAuthUserRepository';

const users = new SupabaseAuthUserRepository();
const hasher = new BcryptPasswordHasher();
export const registerUser = new RegisterUser(users, hasher);
export const loginUser = new LoginUser(users, hasher);
