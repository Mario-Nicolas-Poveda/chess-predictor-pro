import type { UserRepository } from '../domain/UserRepository';
import { userNotFound } from './GetUserProfile';

export class ResetProfilePreferences {
  constructor(private users: UserRepository) {}
  async execute(id: string) {
    // '{}' y no los valores por defecto: si estos cambian, quien restableció recibe los nuevos
    if (!(await this.users.setPreferences(id, {}))) throw userNotFound();
  }
}
