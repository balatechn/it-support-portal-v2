'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Search, Plus, BookOpen, ThumbsUp, ThumbsDown, ArrowRight, Tag } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { CATEGORY_LABELS } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';

interface Article { id: string; title: string; content: string; category: string; viewCount: number; helpfulCount: number; notHelpfulCount: number; createdAt: string; author: { name: string }; }

export default function KnowledgeBasePage() {
  const { user } = useAuthStore();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => { fetchArticles(); }, [search, categoryFilter]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);
      const { data } = await api.get(`/knowledge?${params}`);
      setArticles(data.articles || data);
    } catch {} finally { setLoading(false); }
  };

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');
  const categories = Array.from(new Set(articles.map(a => a.category)));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground text-sm">Self-service IT support articles</p>
        </div>
        {isAdmin && (
          <Link href="/knowledge/new" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition">
            <Plus size={16} /> New Article
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3 bg-card border border-border rounded-xl p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles..." className="w-full pl-8 pr-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">Loading articles...</div>
      ) : articles.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <BookOpen size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No articles found.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {articles.map(a => (
            <Link key={a.id} href={`/knowledge/${a.id}`} className="group bg-card border border-border rounded-2xl p-5 hover:border-primary/50 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground flex items-center gap-1">
                  <Tag size={10} /> {CATEGORY_LABELS[a.category] || a.category}
                </span>
                <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0 mt-0.5" />
              </div>
              <h3 className="font-semibold mb-2 line-clamp-2">{a.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-3">{a.content.replace(/#|*|`/g, '').substring(0, 120)}...</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                <span>by {a.author.name} • {timeAgo(a.createdAt)}</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><ThumbsUp size={10} /> {a.helpfulCount}</span>
                  <span className="flex items-center gap-1"><BookOpen size={10} /> {a.viewCount}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
