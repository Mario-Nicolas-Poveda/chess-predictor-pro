import 'server-only';
import { GetUserProfile } from '../../application/GetUserProfile';
import { UpdateUserProfile } from '../../application/UpdateUserProfile';
import { SupabaseUserRepository } from '../../infrastructure/SupabaseUserRepository';

const users = new SupabaseUserRepository();
export const getUserProfile = new GetUserProfile(users);
export const updateUserProfile = new UpdateUserProfile(users);
