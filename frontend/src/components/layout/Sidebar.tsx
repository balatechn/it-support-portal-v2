'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Ticket, MessageSquare, BookOpen, Server,
  BarChart3, Users, Settings, X, Cpu, AlertTriangle,
  Wrench, FileText, ShieldCheck
} from 'lucide-react';

interface NavItem { label: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }>; badge?: string; }

const userNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'AI Support Chat', href: '/chat', icon: MessageSquare },
  { label: 'My Tickets', href: '/tickets', icon: Ticket },
  { label: 'Knowledge Base', href: '/knowledge', icon: BookOpen },
];

const engineerNav: NavItem[] = [
  { label: 'Dashboard', href: '/engineer/dashboard', icon: LayoutDashboard },
  { label: 'All Tickets', href: '/engineer/tickets', icon: Ticket },
  { label: 'My Queue', href: '/engineer/tickets?assignedToMe=true', icon: Wrench },
  { label: 'Knowledge Base', href: '/knowledge', icon: BookOpen },
  { label: 'Assets', href: '/assets', icon: Server },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'All Tickets', href: '/admin/tickets', icon: Ticket },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Engineers', href: '/admin/engineers', icon: ShieldCheck },
  { label: 'Assets', href: '/assets', icon: Server },
  { label: 'Knowledge Base', href: '/knowledge', icon: BookOpen },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { label: 'SLA Config', href: '/admin/sla', icon: AlertTriangle },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuthStore();
  const pathname = usePathname();

  const navItems = user?.role === 'USER' ? userNav : ['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '') ? adminNav : engineerNav;

  return (
    <>
      {/* Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-16 bottom-0 left-0 w-64 bg-sidebar border-r border-sidebar-border z-40 flex flex-col transition-transform duration-300 overflow-y-auto',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Mobile close */}
        <div className="flex items-center justify-between p-4 lg:hidden border-b border-sidebar-border">
          <span className="text-sidebar-foreground font-semibold text-sm">Navigation</span>
          <button onClick={onClose} className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin/dashboard' && item.href !== '/engineer/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/5'
                )}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom user info */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sidebar-foreground text-sm font-medium truncate">{user?.name}</p>
              <p className="text-sidebar-foreground/50 text-xs truncate">{user?.department?.name || user?.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
