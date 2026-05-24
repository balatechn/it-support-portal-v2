'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/utils';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NewArticlePage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', content: '', category: 'OTHER', tags: '' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.title || !form.content) { toast.error('Title and content are required'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/knowledge', { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) });
      toast.success('Article created!');
      router.push(`/knowledge/${data.id}`);
    } catch { toast.error('Failed to create article'); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h1 className="text-xl font-bold">New Knowledge Base Article</h1>

        <div>
          <label className="block text-sm font-medium mb-1.5">Title</label>
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Article title" className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Category</label>
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Content <span className="text-muted-foreground font-normal">(Markdown supported)</span></label>
          <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Write article content in Markdown..." rows={16} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Tags <span className="text-muted-foreground font-normal">(comma separated)</span></label>
          <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="e.g. windows, password, outlook" className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={submit} disabled={saving} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition">
            <Save size={15} /> {saving ? 'Creating...' : 'Create Article'}
          </button>
        </div>
      </div>
    </div>
  );
}
