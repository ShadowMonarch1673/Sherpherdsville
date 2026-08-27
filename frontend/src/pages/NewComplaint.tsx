import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, Upload, X } from 'lucide-react'
import api from '../lib/api'
import type { Category } from '../types'

const QUICK_TEMPLATES = [
  { label: 'No water', title: 'No water supply', description: 'There is no running water in my room/block.', priority: 'URGENT', categoryHint: 'Plumbing' },
  { label: 'Power out', title: 'Power outage in room', description: 'Electrical power is out in my room.', priority: 'URGENT', categoryHint: 'Electrical' },
  { label: 'Lockout', title: 'Access card / lockout', description: 'Unable to access my room or building with my card.', priority: 'HIGH', categoryHint: 'Security' },
  { label: 'Leak', title: 'Water leak', description: 'There is a water leak that needs attention.', priority: 'HIGH', categoryHint: 'Plumbing' },
  { label: 'Wi-Fi', title: 'Wi-Fi not working', description: 'Internet connection is down or very slow in my room.', priority: 'MEDIUM', categoryHint: 'Internet' },
]


export default function NewComplaint() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'MEDIUM',
    room_number: '',
  })
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [triage, setTriage] = useState<{
    suggested_category_id: number | null
    suggested_category_name: string | null
    suggested_priority: string
    reason: string
    confidence: string
  } | null>(null)
  const [triaging, setTriaging] = useState(false)

  useEffect(() => {
    api.get('/categories/').then((res) => setCategories(res.data.results || res.data))
    api.get('/me/').then((res) => {
      if (res.data.room_number) {
        setForm((f) => ({ ...f, room_number: res.data.room_number }))
      }
    })
  }, [])

  const onFiles = (selected: FileList | null) => {
    if (!selected) return
    const arr = Array.from(selected).slice(0, 5 - files.length)
    setFiles((prev) => [...prev, ...arr])
    arr.forEach((f) => {
      const url = URL.createObjectURL(f)
      setPreviews((p) => [...p, url])
    })
  }

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[idx])
      return prev.filter((_, i) => i !== idx)
    })
  }

  const applyTemplate = (t: typeof QUICK_TEMPLATES[0]) => {
    const cat = categories.find(
      (c) => c.name.toLowerCase().includes(t.categoryHint.toLowerCase().split(' ')[0])
    )
    setForm((f) => ({
      ...f,
      title: t.title,
      description: t.description,
      priority: t.priority,
      category: cat ? String(cat.id) : f.category,
    }))
  }

  const runTriage = async () => {
    if (!form.title.trim()) return
    setTriaging(true)
    try {
      const { data } = await api.post('/triage/', {
        title: form.title,
        description: form.description,
      })
      setTriage(data)
    } catch {
      setTriage(null)
    } finally {
      setTriaging(false)
    }
  }

  const applyTriage = () => {
    if (!triage) return
    setForm((f) => ({
      ...f,
      category: triage.suggested_category_id ? String(triage.suggested_category_id) : f.category,
      priority: triage.suggested_priority || f.priority,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/complaints/', {
        ...form,
        category: Number(form.category),
      })

      // Upload attachments if any
      for (const file of files) {
        const fd = new FormData()
        fd.append('image', file)
        await api.post(`/complaints/${data.id}/attachments/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      navigate(`/portal/complaints/${data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to create complaint')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <h1 className="text-2xl font-bold tracking-tight mb-2">File a New Complaint</h1>
      <p className="text-sm text-white/45 mb-4">Quick report or write your own</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {QUICK_TEMPLATES.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => applyTemplate(t)}
            className="btn-ghost text-xs py-1.5 px-3"
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-5">
        <div>
          <label className="block text-sm text-white/60 mb-1.5">Title</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full glass-input"
            placeholder="Brief summary of the issue"
            required
            maxLength={150}
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1.5">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full glass-input"
            required
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full glass-input"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Room number</label>
            <input
              value={form.room_number}
              onChange={(e) => setForm({ ...form, room_number: e.target.value })}
              className="w-full glass-input"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full glass-input min-h-[140px] resize-y"
            placeholder="Describe the issue in detail..."
            required
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button type="button" onClick={runTriage} disabled={triaging || !form.title} className="btn-ghost text-sm">
            <Sparkles size={14} /> {triaging ? 'Analyzing...' : 'Suggest category & priority'}
          </button>
          {triage && (
            <div className="flex-1 min-w-[200px] text-xs p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white/80">
                <strong>{triage.suggested_category_name || '—'}</strong>
                {' · '}
                {triage.suggested_priority}
                <span className="text-white/40"> ({triage.confidence})</span>
              </p>
              <p className="text-white/40 mt-1">{triage.reason}</p>
              <button type="button" onClick={applyTriage} className="mt-2 text-white underline text-xs">
                Apply suggestion
              </button>
            </div>
          )}
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm text-white/60 mb-1.5">Photos (optional, max 5)</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border border-dashed border-white/15 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500/40 hover:bg-white/[0.03] transition-all"
          >
            <Upload size={24} className="mx-auto text-white/40 mb-2" />
            <p className="text-sm text-white/50">Click or drop images here</p>
            <p className="text-xs text-white/30 mt-1">PNG, JPG up to 5MB each</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </div>
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-3">
              {previews.map((src, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white/80 hover:bg-rose-500/80"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}
