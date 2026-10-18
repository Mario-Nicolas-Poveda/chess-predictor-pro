import { z } from 'zod';

// mensajes por defecto de zod en español; los propios ({ error: '…' }) siguen mandando. Lo cargan readJson y params
z.config(z.locales.es());
