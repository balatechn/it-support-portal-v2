'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { cn, STATUS_COLORS, PRIORITY_COLORS, timeAgo } from '@/lib/utils';
import { Ticket, MessageSquare, CheckCircle2, Clock, Plus, ArrowRight, Bot, TrendingUp } from 'lucide-react';

interface Stats { total: number; open: number; inProgress: number; resolved: number; }
interface RecentTicket { id: string; ticketId: string; title: string; status: string; priority: string; createdAt: string; }

export default function UserDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({ total: 0, open: 0, inProgress: 0, resolved: 0 });
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ticketsRes] = await Promise.all([api.get('/tickets?limit=5')]);
        const tickets = ticketsRes.data.tickets;
        setRecentTickets(tickets);
        setStats({
          total: ticketsRes.data.total,
          open: tickets.filter((t: RecentTicket) => t.status === 'OPEN').length,
          inProgress: tickets.filter((t: RecentTicket) => t.status === 'IN_PROGRESS').length,
          resolved: tickets.filter((t: RecentTicket) => ['RESOLVED', 'CLOSED'].includes(t.status)).length,
        });
      } catch {} finally { setLoading(false); }
    };
    load();
  }, []);

  const statCards = [
    { label: 'Total Tickets', value: stats.total, icon: Ticket, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Open', value: stats.open, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
    { label: 'In Progress', value: stats.inProgress, icon: TrendingUp, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Good {getGreeting()}, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="text-muted-foreground mt-0.5">How can we help you today?</p>
        </div>
        <Link href="/chat" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition shadow-sm">
          <Plus size={16} /> New Support Request
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className={cn('p-3 rounded-xl', s.bg)}>
              <s.icon size={20} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold">{loading ? '—' : s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/chat" className="group bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-6 hover:from-blue-500 hover:to-blue-600 transition shadow-lg shadow-blue-600/20">
          <div className="flex items-start justify-between">
            <div>
              <div className="p-2.5 bg-white/20 rounded-xl inline-block mb-3">
                <Bot size={24} />
              </div>
              <h3 className="text-lg font-semibold">AI Support Chat</h3>
              <p className="text-blue-100 text-sm mt-1">Get instant AI-powered help for common IT issues</p>
            </div>
            <ArrowRight size={20} className="opacity-60 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link href="/tickets/new" className="group bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition">
          <div className="flex items-start justify-between">
            <div>
              <div className="p-2.5 bg-muted rounded-xl inline-block mb-3">
                <Ticket size={24} className="text-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Raise a Ticket</h3>
              <p className="text-muted-foreground text-sm mt-1">Create a support ticket for human engineer assistance</p>
            </div>
            <ArrowRight size={20} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Recent tickets */}
      <div className="bg-card border border-border rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">My Recent Tickets</h2>
          <Link href="/tickets" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : recentTickets.length === 0 ? (
          <div className="p-8 text-center">
            <Ticket size={36} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No tickets yet. Start by chatting with our AI assistant!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentTickets.map(t => (
              <Link key={t.id} href={`/tickets/${t.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-muted-foreground font-mono">{t.ticketId}</span>
                  </div>
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(t.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium', PRIORITY_COLORS[t.priority])}>{t.priority}</span>
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium', STATUS_COLORS[t.status])}>{t.status.replace('_', ' ')}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
