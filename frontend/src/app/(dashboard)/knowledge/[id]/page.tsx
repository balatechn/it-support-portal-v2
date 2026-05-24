'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { ArrowLeft, ThumbsUp, ThumbsDown, Eye, Edit2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { CATEGORY_LABELS, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Article { id: string; title: string; content: string; category: string; viewCount: number; helpfulCount: number; notHelpfulCount: number; createdAt: string; updatedAt: string; author: { name: string }; }

export default function KnowledgeArticlePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [article, setArticle] = useState<Article | null>(null);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    api.get(`/knowledge/${id}`).then(({ data }) => setArticle(data)).catch(() => router.push('/knowledge'));
  }, [id]);

  const vote = async (helpful: boolean) => {
    if (voted) return;
    await api.post(`/knowledge/${id}/vote`, { helpful });
    setVoted(true);
    toast.success('Thanks for your feedback!');
    setArticle(prev => prev ? { ...prev, helpfulCount: helpful ? prev.helpfulCount + 1 : prev.helpfulCount, notHelpfulCount: !helpful ? prev.notHelpfulCount + 1 : prev.notHelpfulCount } : prev);
  };

  const deleteArticle = async () => {
    if (!confirm('Delete this article?')) return;
    await api.delete(`/knowledge/${id}`);
    toast.success('Article deleted');
    router.push('/knowledge');
  };

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');

  if (!article) return <div className="p-12 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft size={16} /> Back to Knowledge Base
        </button>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => router.push(`/knowledge/${id}/edit`)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition"><Edit2 size={15} /></button>
            <button onClick={deleteArticle} className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-muted-foreground hover:text-red-600 transition"><Trash2 size={15} /></button>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
        <div className="mb-6">
          <span className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground">{CATEGORY_LABELS[article.category]}</span>
          <h1 className="text-2xl font-bold mt-3 mb-2">{article.title}</h1>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>By {article.author.name}</span>
            <span>Updated {formatDate(article.updatedAt)}</span>
            <span className="flex items-center gap-1"><Eye size={10} /> {article.viewCount} views</span>
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm font-medium mb-3">Was this article helpful?</p>
          <div className="flex items-center gap-3">
            <button onClick={() => vote(true)} disabled={voted} className="flex items-center gap-2 border border-border px-4 py-2 rounded-xl text-sm hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950/20 disabled:opacity-50 transition">
              <ThumbsUp size={15} className="text-emerald-600" /> Yes ({article.helpfulCount})
            </button>
            <button onClick={() => vote(false)} disabled={voted} className="flex items-center gap-2 border border-border px-4 py-2 rounded-xl text-sm hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/20 disabled:opacity-50 transition">
              <ThumbsDown size={15} className="text-red-500" /> No ({article.notHelpfulCount})
            </button>
          </div>
          {voted && <p className="text-sm text-emerald-600 mt-2">Thanks for your feedback!</p>}
        </div>
      </div>
    </div>
  );
}
