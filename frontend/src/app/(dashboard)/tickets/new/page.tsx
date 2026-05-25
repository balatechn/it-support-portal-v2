'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/utils';
import { ArrowLeft, Ticket, Paperclip, X, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const PRIORITIES = [
  { value: 'LOW', label: 'Low', desc: 'Minor issue, no urgency', color: 'text-slate-600' },
  { value: 'MEDIUM', label: 'Medium', desc: 'Affects work but has workaround', color: 'text-blue-600' },
  { value: 'HIGH', label: 'High', desc: 'Significantly impacting work', color: 'text-orange-600' },
  { value: 'CRITICAL', label: 'Critical', desc: 'Complete work stoppage', color: 'text-red-600' },
];

const CATEGORIES = Object.entries(CATEGORY_LABELS);

export default function NewTicketPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'OTHER',
    priority: 'MEDIUM',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    else if (form.title.trim().length < 5) e.title = 'Title must be at least 5 characters';
    if (!form.description.trim()) e.description = 'Description is required';
    else if (form.description.trim().length < 10) e.description = 'Please provide more detail (at least 10 characters)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const added = Array.from(incoming).filter(f => f.size <= 10 * 1024 * 1024);
    if (added.length < incoming.length) toast.error('Files over 10 MB were skipped');
    setFiles(prev => [...prev, ...added].slice(0, 5));
  };

  const removeFile = (idx: number) => setFiles(f => f.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { data: ticket } = await api.post('/tickets', {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        priority: form.priority,
        browserInfo: navigator.userAgent,
      });

      // Upload attachments if any
      if (files.length > 0) {
        const fd = new FormData();
        files.forEach(f => fd.append('files', f));
        await api.post(`/tickets/${ticket.id}/attachments`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).catch(() => {});
      }

      toast.success(`Ticket ${ticket.ticketId} created successfully!`);
      router.push(`/tickets/${ticket.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/tickets" className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Raise a Support Ticket</h1>
          <p className="text-muted-foreground text-sm">Describe your issue and we'll get an engineer on it</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Issue Details</h2>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Cannot connect to VPN from home"
              className={`w-full px-3 py-2.5 bg-muted border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition ${errors.title ? 'border-red-400 focus:ring-red-400' : 'border-border'}`}
              maxLength={200}
            />
            {errors.title && (
              <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} />{errors.title}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe the issue in detail — what happened, when it started, what you've already tried…"
              rows={5}
              className={`w-full px-3 py-2.5 bg-muted border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition resize-none ${errors.description ? 'border-red-400 focus:ring-red-400' : 'border-border'}`}
            />
            {errors.description && (
              <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} />{errors.description}</p>
            )}
            <p className="text-xs text-muted-foreground text-right">{form.description.length} chars</p>
          </div>
        </div>

        {/* Category & Priority */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Classification</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
              >
                {CATEGORIES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Priority</label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority hint */}
          <div className="flex flex-wrap gap-2 pt-1">
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => set('priority', p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  form.priority === p.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground hover:border-primary/40'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Attachments */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Attachments <span className="font-normal normal-case">(optional, max 5 files · 10 MB each)</span></h2>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition"
          >
            <Paperclip size={20} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Drag & drop files here, or <span className="text-primary font-medium">click to browse</span></p>
            <p className="text-xs text-muted-foreground mt-1">Screenshots, logs, error messages…</p>
          </div>
          <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.txt,.log,.docx,.xlsx" className="hidden" onChange={e => handleFiles(e.target.files)} />

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-muted rounded-lg px-3 py-2">
                  <Paperclip size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{f.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                  <button type="button" onClick={() => removeFile(i)} className="p-0.5 hover:text-red-500 transition text-muted-foreground shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <Link href="/tickets" className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-60 transition"
          >
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" /> Submitting…</>
            ) : (
              <><Ticket size={16} /> Submit Ticket</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
