import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Pin } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { Announcement } from '../types'
import { formatDate } from '../lib/utils'

export default function Announcements() {
  const { user } = useAuth()
  const [list, setList] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', is_pinned: false })
  const [saving, setSaving] = useState(false)

  const load = () => {
    api.get('/announcements/')
      .then((res) => setList(res.data.results || res.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/announcements/', form)
      setForm({ title: '', content: '', is_pinned: false })
      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="text-white/50 text-sm mt-1">Hostel-wide notices</p>
        </div>
        {(user?.is_admin || user?.role === 'ADMIN') && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? 'Cancel' : 'New Announcement'}
          </button>
        )}
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={create}
          className="glass-card p-6 space-y-4"
        >
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title"
            className="w-full glass-input"
            required
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Content"
            className="w-full glass-input min-h-[120px]"
            required
          />
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.is_pinned}
              onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
              className="rounded"
            />
            Pin this announcement
          </label>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Publishing...' : 'Publish'}
          </button>
        </motion.form>
      )}

      <div className="space-y-4">
        {list.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-6"
          >
            <div className="flex items-start gap-3">
              {a.is_pinned && (
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                  <Pin size={14} />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{a.title}</h3>
                <p className="text-sm text-white/40 mt-1">
                  {a.created_by_name} · {formatDate(a.created_at)}
                </p>
                <p className="mt-3 text-white/80 leading-relaxed whitespace-pre-wrap">{a.content}</p>
              </div>
            </div>
          </motion.div>
        ))}
        {list.length === 0 && (
          <div className="glass-card p-12 text-center text-white/40">
            No announcements yet
          </div>
        )}
      </div>
    </div>
  )
}
