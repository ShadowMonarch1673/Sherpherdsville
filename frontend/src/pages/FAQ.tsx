import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ChevronDown, Search } from 'lucide-react'
import api from '../lib/api'
import type { FAQArticle } from '../types'
import PageTransition from '../components/PageTransition'
import EmptyState from '../components/EmptyState'

export default function FAQPage() {
  const [articles, setArticles] = useState<FAQArticle[]>([])
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = q ? `?q=${encodeURIComponent(q)}` : ''
    api.get(`/faq/${params}`)
      .then((r) => setArticles(r.data.results || r.data))
      .finally(() => setLoading(false))
  }, [q])

  return (
    <PageTransition>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resident Handbook</h1>
          <p className="text-white/50 text-sm mt-1">FAQs and policies — also searchable via Shepherd</p>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search handbook..."
            className="w-full glass-input pl-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <EmptyState icon={BookOpen} title="No articles found" description="Try a different search term." />
        ) : (
          <div className="space-y-2">
            {articles.map((a) => (
              <div key={a.id} className="glass-card overflow-hidden">
                <button
                  onClick={() => setOpenId(openId === a.id ? null : a.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.03] transition-colors"
                >
                  <div>
                    {a.category && (
                      <span className="text-[10px] uppercase tracking-wider text-white/35">{a.category}</span>
                    )}
                    <p className="font-medium">{a.question}</p>
                  </div>
                  <ChevronDown
                    size={18}
                    className={cn_rotate(openId === a.id)}
                  />
                </button>
                <AnimatePresence>
                  {openId === a.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
                        {a.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}

function cn_rotate(open: boolean) {
  return `text-white/40 transition-transform ${open ? 'rotate-180' : ''}`
}
