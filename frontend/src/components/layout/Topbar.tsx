'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import {
  Monitor, Bell, Search, Sun, Moon, Menu, X, LogOut, User,
  Settings, ChevronDown, Wifi
} from 'lucide-react';
import { useTheme } from 'next-themes';
import api from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Notification { id: string; title: string; message: string; isRead: boolean; createdAt: string; ticketId?: string; }

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications.slice(0, 8));
      setUnreadCount(data.unreadCount);
    } catch {}
  };

  const markAllRead = async () => {
    await api.patch('/notifications/mark-all-read');
    setNotifications(n => n.map(x => ({ ...x, isRead: true })));
    setUnreadCount(0);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    toast.success('Signed out successfully');
  };

  const roleBadge: Record<string, string> = {
    USER: 'bg-slate-100 text-slate-700',
    ENGINEER: 'bg-emerald-100 text-emerald-700',
    ADMIN: 'bg-blue-100 text-blue-700',
    SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-card border-b border-border flex items-center px-4 gap-4 shadow-sm">
      {/* Mobile menu button */}
      <button onClick={onMenuClick} className="lg:hidden text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted transition">
        <Menu size={20} />
      </button>

      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-foreground min-w-[180px]">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
          <Monitor size={16} className="text-white" />
        </div>
        <span className="hidden sm:block text-sm font-semibold">IT Support Portal</span>
      </Link>

      {/* Search bar */}
      <div className="flex-1 max-w-xl hidden md:block">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && search) router.push(`/tickets?search=${encodeURIComponent(search)}`); }}
            placeholder="Search tickets, users, assets..."
            className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifs(!showNotifs); setShowUser(false); }}
            className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">No notifications</div>
                ) : notifications.map(n => (
                  <div key={n.id} className={cn('px-4 py-3 hover:bg-muted cursor-pointer transition border-b border-border/50 last:border-0', !n.isRead && 'bg-primary/5')}>
                    <div className="flex items-start gap-2">
                      {!n.isRead && <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-border">
                <Link href="/notifications" className="text-xs text-primary hover:underline" onClick={() => setShowNotifs(false)}>View all notifications</Link>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => { setShowUser(!showUser); setShowNotifs(false); }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-muted transition"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium leading-tight">{user?.name}</p>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', roleBadge[user?.role || 'USER'])}>
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
            <ChevronDown size={14} className="text-muted-foreground hidden md:block" />
          </button>
          {showUser && (
            <div className="absolute right-0 top-12 w-52 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <Link href="/profile" onClick={() => setShowUser(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition">
                  <User size={14} /> My Profile
                </Link>
                <Link href="/settings" onClick={() => setShowUser(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition">
                  <Settings size={14} /> Settings
                </Link>
              </div>
              <div className="border-t border-border py-1">
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 w-full transition">
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
