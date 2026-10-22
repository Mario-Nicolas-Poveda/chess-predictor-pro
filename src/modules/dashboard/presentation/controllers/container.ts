import 'server-only';
import { LIMITS, rateLimit } from '@/core/shared/http/rateLimit';
import { GetUserProfile } from '../../application/GetUserProfile';
import { RemoveAvatar } from '../../application/RemoveAvatar';
import { ResetProfilePreferences } from '../../application/ResetProfilePreferences';
import { SaveProfilePreferences } from '../../application/SaveProfilePreferences';
import { SetAvatar } from '../../application/SetAvatar';
import { UpdateUserProfile } from '../../application/UpdateUserProfile';
import { SupabaseAvatarStorage } from '../../infrastructure/SupabaseAvatarStorage';
import { SupabaseUserRepository } from '../../infrastructure/SupabaseUserRepository';

const users = new SupabaseUserRepository();
const avatars = new SupabaseAvatarStorage();
export const getUserProfile = new GetUserProfile(users);
export const updateUserProfile = new UpdateUserProfile(users, avatars);
export const setAvatar = new SetAvatar(users, avatars, key => rateLimit(key, LIMITS.avatar));
export const removeAvatar = new RemoveAvatar(users, avatars);
export const savePreferences = new SaveProfilePreferences(users);
export const resetPreferences = new ResetProfilePreferences(users);
