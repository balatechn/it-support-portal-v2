'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn, STATUS_COLORS, PRIORITY_COLORS, CATEGORY_LABELS, formatDate, timeAgo } from '@/lib/utils';
import { Send, Loader2, Bot, User, AlertTriangle, CheckCircle2, RotateCcw, Paperclip, MessageSquare, Clock, Tag, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import ReactMarkdown from 'react-markdown';

interface Message { id: string; content: string; type: string; sender?: { id: string; name: string; avatarUrl?: string; role: string } | null; createdAt: string; }
interface Ticket { id: string; ticketId: string; title: string; description: string; status: string; priority: string; category: string; createdAt: string; resolvedAt?: string; slaDeadline?: string; slaBreach: boolean; aiResolved: boolean; deviceName?: string; ipAddress?: string; browserInfo?: string; createdBy: { id: string; name: string; email: string; department?: { name: string } }; assignedTo?: { id: string; name: string; email: string } | null; messages: Message[]; }

export default function TicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    fetchTicket();
    const token = localStorage.getItem('accessToken');
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', { auth: { token } });
    socketRef.current = socket;
    socket.emit('ticket:join', id);
    socket.on('message:new', (data: { message: Message }) => setTicket(prev => prev ? { ...prev, messages: [...prev.messages, data.message] } : prev));
    socket.on('ticket:updated', () => fetchTicket());
    return () => { socket.emit('ticket:leave', id); socket.disconnect(); };
  }, [id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [ticket?.messages]);

  const fetchTicket = async () => {
    try { const { data } = await api.get(`/tickets/${id}`); setTicket(data); } catch { router.push('/tickets'); }
  };

  const sendMsg = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/chat/tickets/${id}/messages`, { content: message });
      setMessage('');
      await fetchTicket();
    } catch { toast.error('Failed to send message'); } finally { setSending(false); }
  };

  const fetchAISuggestion = async () => {
    setLoadingAI(true);
    try { const { data } = await api.post(`/chat/tickets/${id}/ai-suggestion`); setAiSuggestion(data.suggestion); } catch {} finally { setLoadingAI(false); }
  };

  const closeTicket = async () => {
    await api.post(`/tickets/${id}/close`);
    toast.success('Ticket closed'); fetchTicket();
  };

  const reopenTicket = async () => {
    await api.post(`/tickets/${id}/reopen`);
    toast.success('Ticket reopened'); fetchTicket();
  };

  if (!ticket) return <div className="p-12 text-center text-muted-foreground"><Loader2 className="animate-spin mx-auto mb-3" />Loading ticket...</div>;

  const isEngineerOrAdmin = ['ENGINEER', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{ticket.ticketId}</span>
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', STATUS_COLORS[ticket.status])}>{ticket.status.replace('_', ' ')}</span>
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', PRIORITY_COLORS[ticket.priority])}>{ticket.priority}</span>
              {ticket.slaBreach && <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-700">SLA BREACH</span>}
            </div>
            <h1 className="text-xl font-bold">{ticket.title}</h1>
            <p className="text-muted-foreground text-sm mt-1">{ticket.description}</p>
          </div>
          <div className="flex gap-2">
            {isEngineerOrAdmin && !['CLOSED', 'RESOLVED'].includes(ticket.status) && (
              <button onClick={closeTicket} className="flex items-center gap-1.5 text-sm bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition">
                <CheckCircle2 size={14} /> Resolve
              </button>
            )}
            {['RESOLVED', 'CLOSED'].includes(ticket.status) && (
              <button onClick={reopenTicket} className="flex items-center gap-1.5 text-sm border border-border px-3 py-2 rounded-lg hover:bg-muted transition">
                <RotateCcw size={14} /> Reopen
              </button>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
          <div><p className="text-xs text-muted-foreground">Category</p><p className="text-sm font-medium">{CATEGORY_LABELS[ticket.category]}</p></div>
          <div><p className="text-xs text-muted-foreground">Created by</p><p className="text-sm font-medium">{ticket.createdBy.name}</p></div>
          <div><p className="text-xs text-muted-foreground">Assigned to</p><p className="text-sm font-medium">{ticket.assignedTo?.name || 'Unassigned'}</p></div>
          <div><p className="text-xs text-muted-foreground">Created</p><p className="text-sm font-medium">{timeAgo(ticket.createdAt)}</p></div>
          {ticket.slaDeadline && <div><p className="text-xs text-muted-foreground">SLA Deadline</p><p className={cn('text-sm font-medium', ticket.slaBreach && 'text-red-600')}>{formatDate(ticket.slaDeadline)}</p></div>}
          {ticket.deviceName && <div><p className="text-xs text-muted-foreground">Device</p><p className="text-sm font-medium">{ticket.deviceName}</p></div>}
        </div>
      </div>

      {/* Chat section */}
      <div className="bg-card border border-border rounded-2xl flex flex-col" style={{ height: '500px' }}>
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><MessageSquare size={16} /> Conversation</h2>
          {isEngineerOrAdmin && (
            <button onClick={fetchAISuggestion} disabled={loadingAI} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition">
              {loadingAI ? <Loader2 size={12} className="animate-spin" /> : <Cpu size={12} />} AI Suggest
            </button>
          )}
        </div>

        {aiSuggestion && (
          <div className="mx-4 mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm">
            <div className="flex items-start gap-2">
              <Bot size={14} className="text-blue-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">AI Suggested Reply:</p>
                <p className="text-foreground">{aiSuggestion}</p>
              </div>
              <button onClick={() => setMessage(aiSuggestion)} className="text-xs text-blue-600 hover:underline shrink-0">Use this</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {ticket.messages.map(msg => {
            const isUser = msg.sender?.id === user?.id;
            const isBot = msg.type === 'BOT';
            const isSystem = msg.type === 'SYSTEM';
            return (
              <div key={msg.id} className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
                {!isUser && (
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold',
                    isBot ? 'bg-blue-600' : isSystem ? 'bg-orange-500' : 'bg-emerald-600'
                  )}>
                    {isBot ? <Bot size={14} /> : isSystem ? <AlertTriangle size={12} /> : msg.sender?.name?.charAt(0)}
                  </div>
                )}
                {isUser && (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0 text-primary-foreground text-xs font-semibold">
                    {user?.name?.charAt(0)}
                  </div>
                )}
                <div className={cn('max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                  isUser ? 'bg-primary text-primary-foreground rounded-br-sm' :
                  isSystem ? 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-bl-sm' :
                  'bg-muted rounded-bl-sm'
                )}>
                  {!isUser && !isSystem && <p className="text-xs font-medium mb-0.5 opacity-70">{msg.sender?.name || 'AI Assistant'}</p>}
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0.5">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  <p className={cn('text-[10px] mt-1', isUser ? 'text-right text-primary-foreground/60' : 'text-muted-foreground')}>{timeAgo(msg.createdAt)}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {!['CLOSED'].includes(ticket.status) && (
          <div className="p-4 border-t border-border flex gap-3">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
              placeholder="Type your message..."
              rows={1}
              className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button onClick={sendMsg} disabled={!message.trim() || sending} className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-40 transition">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
