'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { Bell, Check, CheckCheck, Ticket, MessageSquare, AlertTriangle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface Notification { id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string; }

const NOTIF_ICON: Record<string, React.ReactNode> = {
  TICKET_CREATED: <Ticket size={16} className="text-blue-600" />,
  TICKET_ASSIGNED: <Ticket size={16} className="text-orange-600" />,
  TICKET_RESOLVED: <CheckCheck size={16} className="text-emerald-600" />,
  NEW_MESSAGE: <MessageSquare size={16} className="text-purple-600" />,
  SLA_BREACH: <AlertTriangle size={16} className="text-red-600" />,
  ESCALATION: <AlertTriangle size={16} className="text-orange-600" />,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications?limit=50').then(({ data }) => setNotifications(data.notifications || data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const markAll = async () => {
    await api.patch('/notifications/mark-all-read');
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('All marked as read');
  };

  const markOne = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unread > 0 && <p className="text-sm text-muted-foreground">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="flex items-center gap-2 text-sm text-primary hover:underline">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={36} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No notifications yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map(n => (
              <div key={n.id} onClick={() => !n.isRead && markOne(n.id)} className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-muted/50 transition ${!n.isRead ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''}`}>
                <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${!n.isRead ? 'bg-blue-100 dark:bg-blue-950/30' : 'bg-muted'}`}>
                  {NOTIF_ICON[n.type] || <Info size={16} className="text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${!n.isRead ? '' : 'text-muted-foreground'}`}>{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
