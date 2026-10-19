import type { ZodError } from 'zod';
import type { ErrorFields } from './AppError';

// { campo: [mensajes] } desde los issues de zod, incluidos los campos que sobran. '_' = el cuerpo entero
export function zodFields(e: ZodError): ErrorFields {
  const out: ErrorFields = {};
  const add = (key: string, msg: string) => { (out[key] ??= []).push(msg); };
  for (const issue of e.issues) {
    const path = issue.path.map(String);
    if (issue.code === 'unrecognized_keys') issue.keys.forEach((k) => add([...path, k].join('.'), 'Campo no permitido'));
    else add(path.length ? path.join('.') : '_', issue.message);
  }
  return out;
}
