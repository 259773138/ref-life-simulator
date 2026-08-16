/**
 * 存档码协议（第十六章）
 * 格式：XXXX-XXXX（8 位），字符集：
 * 23456789ABCDEFGHJKLMNPQRSTUVWXYZ （32 字符，无 0/1/I/L/O）
 * 存档数据保存在 localStorage：ref-life-save-<CODE>
 */
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function genSaveCode(): string {
  let code = '';
  const rand = () => Math.floor(Math.random() * CHARSET.length);
  for (let i = 0; i < 8; i++) code += CHARSET[rand()];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function normalizeCode(input: string): string {
  const clean = input.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (clean.length === 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  return clean;
}

export function isValidCode(input: string): boolean {
  const c = normalizeCode(input);
  if (c.length !== 9 || c[4] !== '-') return false;
  const body = c.replace('-', '');
  return [...body].every(ch => CHARSET.includes(ch));
}

const SAVE_PREFIX = 'ref-life-save-';

export function writeSave(code: string, data: unknown): void {
  try {
    localStorage.setItem(SAVE_PREFIX + code, JSON.stringify(data));
  } catch {
    /* storage 满时静默失败 */
  }
}

export function readSave(code: string): unknown | null {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + normalizeCode(code));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function listSaves(): { code: string; label: string }[] {
  const out: { code: string; label: string }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SAVE_PREFIX)) {
        out.push({ code: key.slice(SAVE_PREFIX.length), label: key.slice(SAVE_PREFIX.length) });
      }
    }
  } catch { /* ignore */ }
  return out;
}

export function deleteSave(code: string): void {
  try {
    localStorage.removeItem(SAVE_PREFIX + normalizeCode(code));
  } catch { /* ignore */ }
}
