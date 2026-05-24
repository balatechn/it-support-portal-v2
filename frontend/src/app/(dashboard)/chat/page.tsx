'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { cn, CATEGORY_LABELS } from '@/lib/utils';
import { Bot, Send, User, Loader2, AlertTriangle, CheckCircle2, Ticket, Sparkles, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

interface Message { id: string; role: 'user' | 'bot' | 'system'; content: string; timestamp: Date; }

export default function AIChatPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1', role: 'bot', timestamp: new Date(),
      content: `Hello ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm your AI IT Support Assistant.\n\nI can help you with:\n- **Windows issues** & errors\n- **Printer** problems\n- **Network/WiFi** connectivity\n- **Email** & Outlook issues\n- **VPN** connection\n- **Password** resets\n- **Software** installation\n- **Performance** issues\n\nDescribe your IT issue and I'll guide you through the solution. If I can't resolve it, I'll escalate to a human engineer.\n\n**What's your issue today?**`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [aiMeta, setAiMeta] = useState<{ priority?: string; category?: string; ticketTitle?: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date() };
    const history = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user' as 'user' | 'assistant', content: m.content }));
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/chat/ai', { message: userMsg.content, history });
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'bot', content: data.message, timestamp: new Date() };
      setMessages(prev => [...prev, botMsg]);
      if (data.suggestedPriority || data.suggestedCategory) {
        setAiMeta({ priority: data.suggestedPriority, category: data.suggestedCategory, ticketTitle: data.ticketTitle });
      }
      if (data.shouldEscalate) {
        setTimeout(() => {
          const sysMsg: Message = { id: (Date.now() + 2).toString(), role: 'system', content: '⚠️ The AI has detected that this issue may need human assistance. Would you like to create a ticket and escalate to an IT engineer?', timestamp: new Date() };
          setMessages(prev => [...prev, sysMsg]);
        }, 800);
      }
    } catch {
      const errMsg: Message = { id: (Date.now() + 1).toString(), role: 'system', content: 'AI is temporarily unavailable. Please create a ticket to reach a human engineer.', timestamp: new Date() };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) { toast.error('No issue description found'); return; }
    setEscalating(true);
    try {
      const { data } = await api.post('/tickets', {
        title: aiMeta?.ticketTitle || lastUserMsg.content.substring(0, 60),
        description: messages.filter(m => m.role !== 'system').slice(-6).map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n\n'),
        priority: aiMeta?.priority || 'MEDIUM',
        category: aiMeta?.category || 'OTHER',
        browserInfo: navigator.userAgent,
      });
      toast.success(`Ticket ${data.ticketId} created! Escalating to engineer...`);
      router.push(`/tickets/${data.id}`);
    } catch { toast.error('Failed to create ticket'); } finally { setEscalating(false); }
  };

  const resetChat = () => {
    setMessages([{ id: '1', role: 'bot', timestamp: new Date(), content: 'Chat reset. How can I help you today?' }]);
    setAiMeta(null);
    setInput('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const quickIssues = ['My laptop is running slow', 'Cannot connect to WiFi', 'Printer not working', 'Forgot my password', 'VPN not connecting', 'Outlook not opening'];

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-h-[800px]">
      {/* Header */}
      <div className="flex items-center justify-between bg-card border border-border rounded-t-2xl px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-semibold">IT Support AI Assistant</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground">Online • Powered by AI</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {aiMeta && (
            <button onClick={createTicket} disabled={escalating} className="flex items-center gap-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition font-medium">
              {escalating ? <Loader2 size={14} className="animate-spin" /> : <Ticket size={14} />} Escalate
            </button>
          )}
          <button onClick={resetChat} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition" title="Reset chat">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-muted/30 border-x border-border px-4 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            {msg.role !== 'user' && (
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1', msg.role === 'bot' ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white')}>
                {msg.role === 'bot' ? <Bot size={16} /> : <AlertTriangle size={14} />}
              </div>
            )}
            {msg.role === 'user' && (
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0 mt-1 text-primary-foreground text-sm font-semibold">
                {user?.name?.charAt(0)}
              </div>
            )}
            <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm',
              msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' :
              msg.role === 'system' ? 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 text-foreground rounded-bl-sm' :
              'bg-card border border-border text-foreground rounded-bl-sm'
            )}>
              {msg.role === 'bot' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : msg.role === 'system' ? (
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p>{msg.content}</p>
                    <button onClick={createTicket} disabled={escalating} className="mt-2 flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-orange-600 transition">
                      {escalating ? <Loader2 size={12} className="animate-spin" /> : <Ticket size={12} />} Create Ticket & Escalate
                    </button>
                  </div>
                </div>
              ) : msg.content}
              <p className={cn('text-[10px] mt-1.5', msg.role === 'user' ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground')}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick issues */}
      {messages.length === 1 && (
        <div className="bg-card border-x border-border px-4 py-3">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Sparkles size={12} /> Quick select your issue:</p>
          <div className="flex flex-wrap gap-2">
            {quickIssues.map(q => (
              <button key={q} onClick={() => { setInput(q); textareaRef.current?.focus(); }} className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full transition border border-border">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-card border border-border rounded-b-2xl p-4">
        {aiMeta && (
          <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
            <Sparkles size={12} className="text-primary" />
            <span>AI detected: <strong className="text-foreground">{CATEGORY_LABELS[aiMeta.category || 'OTHER']}</strong> • Priority: <strong className="text-foreground">{aiMeta.priority}</strong></span>
          </div>
        )}
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describe your IT issue... (Enter to send, Shift+Enter for newline)"
            rows={2}
            className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-40 transition"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">AI-powered support. For urgent issues, create a ticket to reach a human engineer.</p>
      </div>
    </div>
  );
}
