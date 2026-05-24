'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { Server, Plus, Search, Link as LinkIcon, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';

type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED' | 'LOST';
type AssetType = 'LAPTOP' | 'DESKTOP' | 'MONITOR' | 'PRINTER' | 'PHONE' | 'TABLET' | 'SERVER' | 'NETWORK' | 'PERIPHERAL' | 'OTHER';

interface Asset { id: string; name: string; type: AssetType; status: AssetStatus; serialNumber?: string; ipAddress?: string; macAddress?: string; location?: string; purchaseDate?: string; assignedTo?: { name: string; email: string } | null; }

const STATUS_COLORS: Record<AssetStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  INACTIVE: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  MAINTENANCE: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  RETIRED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  LOST: 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function AssetsPage() {
  const { user } = useAuthStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const totalPages = Math.ceil(total / 25);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ENGINEER'].includes(user?.role || '');

  useEffect(() => { fetchAssets(); }, [page, search, statusFilter]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/assets?${params}`);
      setAssets(data.assets || data);
      setTotal(data.total || data.length);
    } catch {} finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Asset Inventory</h1>
          <p className="text-muted-foreground text-sm">{total} assets registered</p>
        </div>
        {isAdmin && (
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition">
            <Plus size={16} /> Add Asset
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 bg-card border border-border rounded-xl p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search assets..." className="w-full pl-8 pr-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">All Status</option>
          {(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED', 'LOST'] as AssetStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading assets...</div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center">
            <Server size={40} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No assets found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    {['Name', 'Type', 'Serial No.', 'IP Address', 'Location', 'Assigned To', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assets.map(a => (
                    <tr key={a.id} className="hover:bg-muted/50 transition">
                      <td className="px-4 py-3 font-medium">{a.name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{a.type}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.serialNumber || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.ipAddress || '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{a.location || '—'}</td>
                      <td className="px-4 py-3 text-xs">{a.assignedTo?.name || <span className="text-muted-foreground">Unassigned</span>}</td>
                      <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[a.status])}>{a.status}</span></td>
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
