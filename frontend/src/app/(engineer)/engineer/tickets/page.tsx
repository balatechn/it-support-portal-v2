'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { cn, STATUS_COLORS, PRIORITY_COLORS, CATEGORY_LABELS, timeAgo } from '@/lib/utils';
import { Search, ChevronLeft, ChevronRight, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface Ticket { id: string; ticketId: string; title: string; status: string; priority: string; category: string; createdAt: string; slaBreach: boolean; createdBy: { name: string }; assignedTo?: { name: string } | null; }

const STATUSES = ['OPEN', 'IN_PROGRESS', 'PENDING_USER', 'ESCALATED', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function EngineerTicketsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assignedToMe, setAssignedToMe] = useState(searchParams.get('assignedToMe') === 'true');

  const totalPages = Math.ceil(total / 25);

  useEffect(() => { fetchTickets(); }, [page, statusFilter, priorityFilter, search, assignedToMe]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (search) params.set('search', search);
      if (assignedToMe) params.set('assignedToMe', 'true');
      const { data } = await api.get(`/engineer/tickets?${params}`);
      setTickets(data.tickets);
      setTotal(data.total);
    } catch {} finally { setLoading(false); }
  };

  const claimTicket = async (e: React.MouseEvent, ticketId: string) => {
    e.stopPropagation();
    try { await api.post(`/engineer/tickets/${ticketId}/claim`); toast.success('Ticket claimed'); fetchTickets(); } catch { toast.error('Failed to claim'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">{assignedToMe ? 'My Queue' : 'All Tickets'}</h1>
          <p className="text-muted-foreground text-sm">{total} tickets</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setAssignedToMe(false); setPage(1); }} className={cn('px-3 py-2 rounded-lg text-sm font-medium transition', !assignedToMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80')}>All Tickets</button>
          <button onClick={() => { setAssignedToMe(true); setPage(1); }} className={cn('px-3 py-2 rounded-lg text-sm font-medium transition', assignedToMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80')}>My Queue</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 bg-card border border-border rounded-xl p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search tickets..." className="w-full pl-8 pr-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); }} className="bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">All Priority</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading...</div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No tickets found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    {['ID', 'Title', 'Requested by', 'Category', 'Priority', 'Status', 'Assigned', 'Created', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tickets.map(t => (
                    <tr key={t.id} onClick={() => router.push(`/tickets/${t.id}`)} className="hover:bg-muted/50 cursor-pointer transition">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {t.ticketId}
                        {t.slaBreach && <span className="ml-1 text-red-600 font-bold">!</span>}
                      </td>
                      <td className="px-4 py-3 font-medium max-w-[160px] truncate">{t.title}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{t.createdBy.name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{CATEGORY_LABELS[t.category]}</td>
                      <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', PRIORITY_COLORS[t.priority])}>{t.priority}</span></td>
                      <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[t.status])}>{t.status.replace('_', ' ')}</span></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{t.assignedTo?.name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{timeAgo(t.createdAt)}</td>
                      <td className="px-4 py-3">
                        {!t.assignedTo && t.status === 'OPEN' && (
                          <button onClick={e => claimTicket(e, t.id)} className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-lg hover:bg-primary/90 transition">Claim</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-muted disabled:opacity-40"><ChevronLeft size={16} /></button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-muted disabled:opacity-40"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
