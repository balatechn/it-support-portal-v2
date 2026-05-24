'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { cn, STATUS_COLORS, PRIORITY_COLORS, CATEGORY_LABELS, timeAgo } from '@/lib/utils';
import { Ticket, Clock, CheckCircle2, AlertTriangle, ArrowRight, User } from 'lucide-react';

interface Stats { total: number; open: number; inProgress: number; escalated: number; resolvedToday: number; avgResolutionHours: number; }
interface QueueTicket { id: string; ticketId: string; title: string; status: string; priority: string; category: string; createdAt: string; slaDeadline?: string; slaBreach: boolean; createdBy: { name: string }; }

export default function EngineerDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [queue, setQueue] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, ticketsRes] = await Promise.all([
          api.get('/reports/engineer-stats'),
          api.get('/tickets?assignedToMe=true&status=OPEN,IN_PROGRESS,ESCALATED&limit=10'),
        ]);
        setStats(statsRes.data);
        setQueue(ticketsRes.data.tickets || []);
      } catch {} finally { setLoading(false); }
    };
    load();
  }, []);

  const statCards = [
    { label: 'Total Assigned', value: stats?.total ?? '—', icon: Ticket, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Open', value: stats?.open ?? '—', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
    { label: 'In Progress', value: stats?.inProgress ?? '—', icon: Ticket, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
    { label: 'Escalated', value: stats?.escalated ?? '—', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
    { label: 'Resolved Today', value: stats?.resolvedToday ?? '—', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Avg Resolution', value: stats?.avgResolutionHours ? `${stats.avgResolutionHours}h` : '—', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Engineer Dashboard</h1>
          <p className="text-muted-foreground text-sm">Manage and resolve IT support tickets</p>
        </div>
        <Link href="/engineer/tickets" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition">
          View All Tickets <ArrowRight size={16} />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className={cn('p-2.5 rounded-xl w-fit mb-3', s.bg)}>
              <s.icon size={18} className={s.color} />
            </div>
            <p className="text-2xl font-bold">{loading ? '—' : s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* My queue */}
      <div className="bg-card border border-border rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">My Active Queue</h2>
          <Link href="/engineer/tickets?assignedToMe=true" className="text-sm text-primary hover:underline flex items-center gap-1">
            Full queue <ArrowRight size={14} />
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : queue.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-3" />
            <p className="text-muted-foreground">Queue is clear! Great work.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {queue.map(t => (
              <div key={t.id} onClick={() => router.push(`/tickets/${t.id}`)} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 cursor-pointer transition">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">{t.ticketId}</span>
                    {t.slaBreach && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">SLA!</span>}
                  </div>
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <User size={10} /> {t.createdBy.name} • {CATEGORY_LABELS[t.category]} • {timeAgo(t.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium', PRIORITY_COLORS[t.priority])}>{t.priority}</span>
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium', STATUS_COLORS[t.status])}>{t.status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
