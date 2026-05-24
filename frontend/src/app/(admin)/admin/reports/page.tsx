'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminReportsPage() {
  const [overview, setOverview] = useState<{ trend: { date: string; created: number; resolved: number }[]; topCategories: { category: string; _count: number }[]; engineerPerf: { name: string; resolved: number; avgHours: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get('/reports/overview').then(({ data }) => setOverview(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const exportCSV = async () => {
    setExporting(true);
    try {
      const { data } = await api.get('/reports/export?format=csv', { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = `tickets_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch { toast.error('Export failed'); } finally { setExporting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm">Ticket performance and team metrics</p>
        </div>
        <button onClick={exportCSV} disabled={exporting} className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-xl text-sm hover:bg-muted transition">
          <Download size={15} /> {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">Loading reports...</div>
      ) : (
        <div className="space-y-5">
          {/* Trend */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Ticket Trend (Last 30 Days)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={overview?.trend || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} name="Created" dot={false} />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Category breakdown */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold mb-4">Top Categories</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={overview?.topCategories?.map(c => ({ name: c.category.replace('_', ' '), count: c._count })) || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Tickets" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Engineer performance */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold mb-4">Engineer Performance</h2>
              {overview?.engineerPerf && overview.engineerPerf.length > 0 ? (
                <div className="space-y-3">
                  {overview.engineerPerf.map((e, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-sm">{e.name.charAt(0)}</div>
                        <span className="text-sm font-medium">{e.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span><strong className="text-foreground">{e.resolved}</strong> resolved</span>
                        <span><strong className="text-foreground">{e.avgHours}h</strong> avg</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No engineer data yet</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
