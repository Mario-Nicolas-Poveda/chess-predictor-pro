// para ilike: sin esto "de_mo" encuentra "demo"
export const escapeLike = (v: string) => v.replace(/[\\%_]/g, m => '\\' + m);
