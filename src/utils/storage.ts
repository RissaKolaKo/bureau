import { DocRecord, Module } from '../types';

const HISTORY_KEY = 'office_history';

export function getHistory(): DocRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveToHistory(record: Omit<DocRecord, 'id' | 'createdAt'>): DocRecord {
  const history = getHistory();
  const newRecord: DocRecord = {
    ...record,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  history.unshift(newRecord);
  // Keep last 200 records
  const trimmed = history.slice(0, 200);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  return newRecord;
}

export function deleteFromHistory(id: string): void {
  const history = getHistory().filter(r => r.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

export function getHistoryByModule(module: Module): DocRecord[] {
  return getHistory().filter(r => r.module === module);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-MA', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
