'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { User, Lock, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [changingPw, setChangingPw] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try { await api.patch('/users/me', { name, phone }); await fetchMe(); toast.success('Profile updated'); } catch { toast.error('Failed to update'); } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (pwForm.newPw !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setChangingPw(true);
    try { await api.put('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.newPw }); toast.success('Password changed'); setPwForm({ current: '', newPw: '', confirm: '' }); } catch { toast.error('Invalid current password'); } finally { setChangingPw(false); }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-2xl font-bold">
            {user?.name?.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-lg">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full mt-1 inline-block">{user?.role?.replace('_', ' ')}</span>
          </div>
        </div>

        <h2 className="font-medium flex items-center gap-2"><User size={15} /> Personal Info</h2>

        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input value={user?.email || ''} disabled className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm opacity-60 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900" className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={saveProfile} disabled={saving} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition">
            <Save size={14} /> {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-medium flex items-center gap-2"><Lock size={15} /> Change Password</h2>
        {[
          { label: 'Current Password', key: 'current', value: pwForm.current },
          { label: 'New Password', key: 'newPw', value: pwForm.newPw },
          { label: 'Confirm New Password', key: 'confirm', value: pwForm.confirm },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-sm font-medium mb-1.5">{f.label}</label>
            <input type="password" value={f.value} onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        ))}
        <div className="flex justify-end">
          <button onClick={changePassword} disabled={changingPw || !pwForm.current || !pwForm.newPw} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition">
            {changingPw ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
