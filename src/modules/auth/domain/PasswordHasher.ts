export interface PasswordHasher { hash(p: string): Promise<string>; compare(p: string, h: string): Promise<boolean>; }
