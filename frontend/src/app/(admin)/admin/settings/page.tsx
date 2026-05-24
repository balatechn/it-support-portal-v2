'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Save, Globe, Mail, Shield, Bell } from 'lucide-react';

interface Settings { siteName: string; supportEmail: string; maxFileSize: number; maintenanceMode: boolean; emailNotifications: boolean; autoAssign: boolean; }

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    siteName: 'IT Support Portal',
    supportEmail: 'support@company.com',
    maxFileSize: 10,
    maintenanceMode: false,
    emailNotifications: true,
    autoAssign: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/settings').then(({ data }) => setSettings(s => ({ ...s, ...data }))).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try { await api.put('/admin/settings', settings); toast.success('Settings saved'); } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">System Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configure global application settings</p>
      </div>

      {/* General */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Globe size={16} /> General</h2>
        <div>
          <label className="block text-sm font-medium mb-1.5">Portal Name</label>
          <input value={settings.siteName} onChange={e => setSettings(s => ({ ...s, siteName: e.target.value }))} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Support Email</label>
          <input type="email" value={settings.supportEmail} onChange={e => setSettings(s => ({ ...s, supportEmail: e.target.value }))} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Max File Upload Size (MB)</label>
          <input type="number" min={1} max={50} value={settings.maxFileSize} onChange={e => setSettings(s => ({ ...s, maxFileSize: parseInt(e.target.value) || 10 }))} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Bell size={16} /> Notifications & Automation</h2>
        {[
          { key: 'emailNotifications', label: 'Email Notifications', desc: 'Send email alerts for ticket updates' },
          { key: 'autoAssign', label: 'Auto-Assign Tickets', desc: 'Automatically assign new tickets to available engineers' },
          { key: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Disable portal access for non-admin users' },
        ].map(f => (
          <div key={f.key} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, [f.key]: !s[f.key as keyof Settings] }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${settings[f.key as keyof Settings] ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[f.key as keyof Settings] ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition">
          <Save size={15} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
