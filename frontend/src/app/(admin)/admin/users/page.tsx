'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Search, Plus, Edit2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';

type Role = 'USER' | 'ENGINEER' | 'ADMIN' | 'SUPER_ADMIN';
interface UserItem { id: string; name: string; email: string; role: Role; isActive: boolean; department?: { name: string } | null; createdAt: string; _count: { createdTickets: number }; }

const ROLE_COLORS: Record<Role, string> = {
  USER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  ENGINEER: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  SUPER_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editRole, setEditRole] = useState<Role>('USER');
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const totalPages = Math.ceil(total / 25);
  useEffect(() => { fetchUsers(); }, [page, search, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.users);
      setTotal(data.total);
    } catch {} finally { setLoading(false); }
  };

  const openEdit = (u: UserItem) => { setEditUser(u); setEditRole(u.role); setEditActive(u.isActive); };

  const saveUser = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await api.patch(`/admin/users/${editUser.id}`, { role: editRole, isActive: editActive });
      toast.success('User updated');
      setEditUser(null);
      fetchUsers();
    } catch { toast.error('Failed to update'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm">{total} total users</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 bg-card border border-border rounded-xl p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search users..." className="w-full pl-8 pr-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className="bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">All Roles</option>
          <option value="USER">User</option>
          <option value="ENGINEER">Engineer</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                {['Name', 'Email', 'Role', 'Department', 'Tickets', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Loading...</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-muted/50 transition">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[u.role])}>{u.role.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{u.department?.name || '—'}</td>
                  <td className="px-4 py-3 text-xs">{u._count.createdTickets}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', u.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300')}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-muted rounded-lg transition text-muted-foreground hover:text-foreground">
                      <Edit2 size={14} />
                    </button>
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
      </div>

      {/* Edit modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Edit User</h3>
              <button onClick={() => setEditUser(null)} className="p-1.5 hover:bg-muted rounded-lg"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">{editUser.name}</p>
                <p className="text-sm text-muted-foreground">{editUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Role</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value as Role)} className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="USER">User</option>
                  <option value="ENGINEER">Engineer</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="isActive" checked={editActive} onChange={e => setEditActive(e.target.checked)} className="w-4 h-4 rounded" />
                <label htmlFor="isActive" className="text-sm">Active account</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditUser(null)} className="flex-1 border border-border py-2.5 rounded-xl text-sm hover:bg-muted transition">Cancel</button>
                <button onClick={saveUser} disabled={saving} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm hover:bg-primary/90 transition">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
