import 'server-only';
import { GetUserProfile } from '../../application/GetUserProfile';
import { ResetProfilePreferences } from '../../application/ResetProfilePreferences';
import { SaveProfilePreferences } from '../../application/SaveProfilePreferences';
import { UpdateUserProfile } from '../../application/UpdateUserProfile';
import { SupabaseUserRepository } from '../../infrastructure/SupabaseUserRepository';

const users = new SupabaseUserRepository();
export const getUserProfile = new GetUserProfile(users);
export const updateUserProfile = new UpdateUserProfile(users);
export const savePreferences = new SaveProfilePreferences(users);
export const resetPreferences = new ResetProfilePreferences(users);
