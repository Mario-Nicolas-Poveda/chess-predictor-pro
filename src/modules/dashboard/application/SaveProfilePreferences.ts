import type { UserRepository } from '../domain/UserRepository';
import type { ProfilePreferences } from '../infrastructure/dto/preferencesSchemas';
import { userNotFound } from './GetUserProfile';

// Recibe el objeto completo ya validado (PUT, no PATCH): no hay parciales que fusionar
export class SaveProfilePreferences {
  constructor(private users: UserRepository) {}
  async execute(id: string, prefs: ProfilePreferences) {
    if (!(await this.users.setPreferences(id, prefs))) throw userNotFound();
    return prefs;
  }
}
