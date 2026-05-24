'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Ticket, Users, CheckCircle2, AlertTriangle, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#84cc16', '#ec4899'];

interface DashboardStats { total: number; open: number; inProgress: number; resolvedToday: number; avgResolutionHours: number; slaBreach: number; activeUsers: number; totalTickets: number; openTickets: number; }

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trendData, setTrendData] = useState<{ date: string; created: number; resolved: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [priorityData, setPriorityData] = useState<{ name: string; count: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, reportsRes] = await Promise.all([api.get('/admin/dashboard'), api.get('/reports/overview')]);
        setStats(statsRes.data);
        setTrendData(reportsRes.data.trend || []);
        setCategoryData(reportsRes.data.topCategories?.map((c: { category: string; _count: number }) => ({ name: c.category.replace(/_/g, ' '), value: c._count })) || []);
        setPriorityData([
          { name: 'Low', count: reportsRes.data.byPriority?.LOW || 0, color: '#10b981' },
          { name: 'Medium', count: reportsRes.data.byPriority?.MEDIUM || 0, color: '#f59e0b' },
          { name: 'High', count: reportsRes.data.byPriority?.HIGH || 0, color: '#f97316' },
          { name: 'Critical', count: reportsRes.data.byPriority?.CRITICAL || 0, color: '#ef4444' },
        ]);
      } catch {} finally { setLoading(false); }
    };
    load();
  }, []);

  const statCards = [
    { label: 'Total Tickets', value: stats?.total, icon: Ticket, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', href: '/admin/tickets' },
    { label: 'Open Tickets', value: stats?.open, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30', href: '/admin/tickets?status=OPEN' },
    { label: 'Resolved Today', value: stats?.resolvedToday, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', href: null },
    { label: 'SLA Breaches', value: stats?.slaBreach, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', href: null },
    { label: 'Active Users', value: stats?.activeUsers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30', href: '/admin/users' },
    { label: 'Avg Resolution', value: stats?.avgResolutionHours ? `${stats.avgResolutionHours}h` : '—', icon: TrendingUp, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/30', href: null },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">IT Support overview and analytics</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/reports" className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-xl text-sm hover:bg-muted transition">
            View Reports <ArrowRight size={14} />
          </Link>
          <Link href="/admin/users" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition">
            Manage Users
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map(s => {
          const card = (
            <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition">
              <div className={cn('p-2.5 rounded-xl w-fit mb-3', s.bg)}>
                <s.icon size={18} className={s.color} />
              </div>
              <p className="text-2xl font-bold">{loading ? '—' : (s.value ?? '—')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          );
          return s.href ? <Link key={s.label} href={s.href}>{card}</Link> : <div key={s.label}>{card}</div>;
        })}
      </div>

      {/* Charts row 1: Trend + Priority */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-4">Ticket Trend (Last 14 Days)</h2>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} name="Created" dot={false} />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No trend data yet</div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-4">By Priority</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priorityData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={50} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {priorityData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2: Category */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-4">Tickets by Category</h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {categoryData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">No category data yet</div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Manage Users', href: '/admin/users', color: 'bg-blue-600' },
              { label: 'All Tickets', href: '/admin/tickets', color: 'bg-orange-600' },
              { label: 'SLA Config', href: '/admin/sla', color: 'bg-purple-600' },
              { label: 'Reports', href: '/admin/reports', color: 'bg-emerald-600' },
              { label: 'Knowledge Base', href: '/knowledge', color: 'bg-sky-600' },
              { label: 'Settings', href: '/admin/settings', color: 'bg-slate-600' },
            ].map(a => (
              <Link key={a.label} href={a.href} className={cn('flex items-center justify-between p-3 rounded-xl text-white text-sm font-medium hover:opacity-90 transition group', a.color)}>
                {a.label}
                <ArrowRight size={14} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
