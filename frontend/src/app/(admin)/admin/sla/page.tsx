'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';

interface SLAConfig { id: string; priority: string; firstResponseHours: number; resolutionHours: number; escalationHours: number; }

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function AdminSLAPage() {
  const [configs, setConfigs] = useState<SLAConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SLAConfig | null>(null);
  const [form, setForm] = useState({ firstResponseHours: 24, resolutionHours: 72, escalationHours: 48 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchConfigs(); }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/sla-config'); setConfigs(data); } catch {} finally { setLoading(false); }
  };

  const openEdit = (c: SLAConfig) => { setEditing(c); setForm({ firstResponseHours: c.firstResponseHours, resolutionHours: c.resolutionHours, escalationHours: c.escalationHours }); };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/admin/sla-config/${editing.id}`, form);
      toast.success('SLA config updated');
      setEditing(null);
      fetchConfigs();
    } catch { toast.error('Failed to update SLA'); } finally { setSaving(false); }
  };

  const PRIORITY_COLORS: Record<string, string> = { LOW: 'bg-emerald-100 text-emerald-700', MEDIUM: 'bg-yellow-100 text-yellow-700', HIGH: 'bg-orange-100 text-orange-700', CRITICAL: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">SLA Configuration</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configure service level agreement timings for each priority level</p>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">Loading...</div>
        ) : configs.map(c => (
          <div key={c.id} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`text-sm px-3 py-1 rounded-full font-semibold ${PRIORITY_COLORS[c.priority]}`}>{c.priority}</span>
                <span className="text-sm text-muted-foreground">Priority</span>
              </div>
              <button onClick={() => openEdit(c)} className="p-2 hover:bg-muted rounded-lg transition text-muted-foreground hover:text-foreground"><Edit2 size={15} /></button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-xl">
                <p className="text-2xl font-bold">{c.firstResponseHours}h</p>
                <p className="text-xs text-muted-foreground mt-0.5">First Response</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-xl">
                <p className="text-2xl font-bold">{c.resolutionHours}h</p>
                <p className="text-xs text-muted-foreground mt-0.5">Resolution</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-xl">
                <p className="text-2xl font-bold">{c.escalationHours}h</p>
                <p className="text-xs text-muted-foreground mt-0.5">Escalation</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-lg">Edit SLA — {editing.priority}</h3>
              <button onClick={() => setEditing(null)} className="p-1.5 hover:bg-muted rounded-lg"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              {[
                { key: 'firstResponseHours', label: 'First Response (hours)', desc: 'Time to send first reply' },
                { key: 'resolutionHours', label: 'Resolution Time (hours)', desc: 'Time to fully resolve' },
                { key: 'escalationHours', label: 'Escalation Time (hours)', desc: 'Time before auto-escalation' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium mb-1">{f.label}</label>
                  <p className="text-xs text-muted-foreground mb-1.5">{f.desc}</p>
                  <input
                    type="number" min={1}
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditing(null)} className="flex-1 border border-border py-2.5 rounded-xl text-sm hover:bg-muted transition">Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm hover:bg-primary/90 transition flex items-center justify-center gap-2">
                  <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
