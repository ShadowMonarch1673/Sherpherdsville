import PageTransition from '../components/PageTransition'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { Analytics, Complaint, Announcement } from '../types'
import { formatDate, statusColors, cn } from '../lib/utils'

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

export default function Dashboard() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [recent, setRecent] = useState<Complaint[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/analytics/'),
      api.get('/complaints/'),
      api.get('/announcements/'),
    ])
      .then(([a, c, an]) => {
        setAnalytics(a.data)
        setRecent((c.data.results || c.data).slice(0, 5))
        setAnnouncements((an.data.results || an.data).slice(0, 3))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const stats = [
    {
      label: 'Total Complaints',
      value: analytics?.totals.total ?? 0,
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Pending',
      value: analytics?.totals.pending ?? 0,
      icon: Clock,
      color: 'from-amber-500 to-orange-500',
    },
    {
      label: 'In Progress',
      value: analytics?.totals.in_progress ?? 0,
      icon: TrendingUp,
      color: 'from-indigo-500 to-purple-500',
    },
    {
      label: 'Resolved',
      value: analytics?.totals.resolved ?? 0,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-teal-500',
    },
  ]

  return (
    <PageTransition>
    <div className="space-y-8">
      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/50">{stat.label}</p>
                <p className="text-3xl font-bold mt-1 tracking-tight">{stat.value}</p>
              </div>
              <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg', stat.color)}>
                <stat.icon size={18} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts - Admin only */}
        {(user?.is_admin || user?.role === 'ADMIN') && analytics?.by_category && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-6 lg:col-span-2"
            >
              <h3 className="font-semibold mb-4">Complaints by Category</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.by_category.map((c) => ({ name: c.category__name, count: c.count }))}>
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15,20,30,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="glass-card p-6"
            >
              <h3 className="font-semibold mb-4">By Priority</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={analytics.by_priority?.map((p) => ({ name: p.priority, value: p.count })) || []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {(analytics.by_priority || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15,20,30,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          </>
        )}

        {/* Recent complaints */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={cn('glass-card p-6', 'lg:col-span-2')}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Complaints</h3>
            <Link to="/portal/complaints" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {recent.length === 0 ? (
              <p className="text-white/40 text-sm py-8 text-center">No complaints yet</p>
            ) : (
              recent.map((c) => (
                <Link
                  key={c.id}
                  to={`/portal/complaints/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate group-hover:text-blue-300 transition-colors">
                      {c.title}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {c.category_name} · {formatDate(c.created_at)}
                    </p>
                  </div>
                  <span className={cn('text-xs px-2.5 py-1 rounded-lg border', statusColors[c.status])}>
                    {c.status.replace('_', ' ')}
                  </span>
                </Link>
              ))
            )}
          </div>
        </motion.div>

        {/* Announcements */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Announcements</h3>
            <Link to="/portal/announcements" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-white/40 text-sm py-6 text-center">No announcements</p>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-start gap-2">
                    {a.is_pinned && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">Pinned</span>
                    )}
                    <div>
                      <p className="font-medium text-sm">{a.title}</p>
                      <p className="text-xs text-white/40 mt-1 line-clamp-2">{a.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
    </PageTransition>
  )
}