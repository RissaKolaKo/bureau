import { DocRecord, Module } from '../types';
import { formatDate, deleteFromHistory, clearHistory } from '../utils/storage';

interface Props {
  history: DocRecord[];
  onRefresh: () => void;
  activeModule?: Module;
}

const moduleEmoji: Record<Module, string> = {
  dashboard: '🏠',
  'public-writer': '✍️',
  'cv-generator': '📄',
  'cin-scanner': '🪪',
  'french-letters': '📝',
  'admin-procedures': '🏛️',
  'user-management': '👥',
  'registration-manager': '📬',
  'invoice-generator': '🧾',
  'homepage-control': '🏠',
  'general-settings': '⚙️',
};

const moduleBadge: Record<Module, string> = {
  dashboard: 'badge-blue',
  'public-writer': 'badge-blue',
  'cv-generator': 'badge-green',
  'cin-scanner': 'badge-amber',
  'french-letters': 'badge-blue',
  'admin-procedures': 'badge-red',
  'user-management': 'badge-blue',
  'registration-manager': 'badge-amber',
  'invoice-generator': 'badge-green',
  'homepage-control': 'badge-blue',
  'general-settings': 'badge-blue',
};

export default function HistoryPanel({ history, onRefresh, activeModule }: Props) {
  const filtered = activeModule && activeModule !== 'dashboard'
    ? history.filter(d => d.module === activeModule)
    : history;

  function handleDelete(id: string) {
    deleteFromHistory(id);
    onRefresh();
  }

  function handleClear() {
    if (confirm('هل تريد حذف كل السجلات؟ — Supprimer tout l\'historique ?')) {
      clearHistory();
      onRefresh();
    }
  }

  if (filtered.length === 0) return null;

  return (
    <div className="card" style={{ margin: '0 40px 32px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f2744', display: 'flex', alignItems: 'center', gap: 8 }}>
          📋 سجل الوثائق — Historique ({filtered.length})
        </div>
        {filtered.length > 0 && (
          <button onClick={handleClear} style={{ border: 'none', background: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            🗑 مسح الكل
          </button>
        )}
      </div>
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        <table className="history-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'right' }}>الوحدة</th>
              <th style={{ textAlign: 'right' }}>العنوان</th>
              <th style={{ textAlign: 'right' }}>النوع</th>
              <th style={{ textAlign: 'right' }}>التاريخ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(doc => (
              <tr key={doc.id}>
                <td>
                  <span style={{ fontSize: 16 }}>{moduleEmoji[doc.module]}</span>
                </td>
                <td style={{ fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.title}
                </td>
                <td>
                  <span className={`badge ${moduleBadge[doc.module]}`}>{doc.type}</span>
                </td>
                <td style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#64748b' }}>
                  {formatDate(doc.createdAt)}
                </td>
                <td>
                  <button onClick={() => handleDelete(doc.id)}
                    style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
