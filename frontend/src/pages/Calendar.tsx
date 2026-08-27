import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar as CalIcon, MapPin, Plus } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { ScheduledWork } from '../types'
import { formatDateTime } from '../lib/utils'
import PageTransition from '../components/PageTransition'
import EmptyState from '../components/EmptyState'

export default function CalendarPage() {
  const { user } = useAuth()
  const [works, setWorks] = useState<ScheduledWork[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    affected_blocks: '',
    start_at: '',
    end_at: '',
  })

  const load = () => {
    api.get('/scheduled-works/')
      .then((r) => setWorks(r.data.results || r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/scheduled-works/', form)
    setShowForm(false)
    setForm({ title: '', description: '', affected_blocks: '', start_at: '', end_at: '' })
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Maintenance Calendar</h1>
            <p className="text-white/50 text-sm mt-1">Planned works and outages</p>
          </div>
          {(user?.is_admin || user?.role === 'ADMIN') && (
            <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
              <Plus size={16} /> Schedule work
            </button>
          )}
        </div>

        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={create}
            className="glass-card p-6 space-y-4"
          >
            <input className="w-full glass-input" placeholder="Title" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <textarea className="w-full glass-input min-h-[80px]" placeholder="Description" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input className="w-full glass-input" placeholder="Affected blocks (e.g. Block A, All)" value={form.affected_blocks}
              onChange={(e) => setForm({ ...form, affected_blocks: e.target.value })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/50">Starts</label>
                <input type="datetime-local" className="w-full glass-input" value={form.start_at}
                  onChange={(e) => setForm({ ...form, start_at: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs text-white/50">Ends</label>
                <input type="datetime-local" className="w-full glass-input" value={form.end_at}
                  onChange={(e) => setForm({ ...form, end_at: e.target.value })} required />
              </div>
            </div>
            <button type="submit" className="btn-primary">Publish</button>
          </motion.form>
        )}

        <div className="space-y-3">
          {works.map((w, i) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <CalIcon size={20} className="text-white/60" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{w.title}</h3>
                  {w.description && <p className="text-sm text-white/50 mt-1">{w.description}</p>}
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-white/40">
                    <span>{formatDateTime(w.start_at)} → {formatDateTime(w.end_at)}</span>
                    {w.affected_blocks && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} /> {w.affected_blocks}
                      </span>
                    )}
                    {w.category_name && <span className="px-2 py-0.5 rounded-md bg-white/5">{w.category_name}</span>}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {works.length === 0 && (
            <EmptyState
              icon={CalIcon}
              title="No scheduled works"
              description="When maintenance is planned, it will appear here for all residents."
            />
          )}
        </div>
      </div>
    </PageTransition>
  )
}
