'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { cn, STATUS_COLORS, PRIORITY_COLORS, CATEGORY_LABELS, timeAgo } from '@/lib/utils';
import { Plus, Search, Filter, Ticket as TicketIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface Ticket { id: string; ticketId: string; title: string; status: string; priority: string; category: string; createdAt: string; assignedTo?: { name: string } | null; _count: { messages: number }; }

const STATUSES = ['OPEN', 'IN_PROGRESS', 'PENDING_USER', 'ESCALATED', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function TicketsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const totalPages = Math.ceil(total / 20);

  useEffect(() => { fetchTickets(); }, [page, statusFilter, priorityFilter, search]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (search) params.set('search', search);
      const { data } = await api.get(`/tickets?${params}`);
      setTickets(data.tickets);
      setTotal(data.total);
    } catch {} finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Tickets</h1>
          <p className="text-muted-foreground text-sm">{total} total tickets</p>
        </div>
        <Link href="/chat" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition">
          <Plus size={16} /> New Request
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-card border border-border rounded-xl p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search tickets..." className="w-full pl-8 pr-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); }} className="bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All Priority</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center">
            <TicketIcon size={40} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No tickets found.</p>
            <Link href="/chat" className="mt-3 inline-block text-primary text-sm hover:underline">Start with AI chat</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    {['Ticket ID', 'Title', 'Category', 'Priority', 'Status', 'Assigned To', 'Created', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tickets.map(t => (
                    <tr key={t.id} onClick={() => router.push(`/tickets/${t.id}`)} className="hover:bg-muted/50 cursor-pointer transition">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.ticketId}</td>
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{t.title}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{CATEGORY_LABELS[t.category]}</td>
                      <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', PRIORITY_COLORS[t.priority])}>{t.priority}</span></td>
                      <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[t.status])}>{t.status.replace('_', ' ')}</span></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{t.assignedTo?.name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{timeAgo(t.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{t._count.messages > 0 && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t._count.messages} msgs</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-muted disabled:opacity-40 transition"><ChevronLeft size={16} /></button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-muted disabled:opacity-40 transition"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
