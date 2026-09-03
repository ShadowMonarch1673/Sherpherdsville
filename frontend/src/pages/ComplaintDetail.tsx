import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, Star, Image as ImageIcon } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { Complaint, Comment } from '../types'
import { formatDateTime, statusColors, priorityColors, cn } from '../lib/utils'

export default function ComplaintDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState(5)
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const [reopenNote, setReopenNote] = useState('')
  const [reopening, setReopening] = useState(false)
  const [resolutionFile, setResolutionFile] = useState<File | null>(null)

  const load = async () => {
    const [c, cm] = await Promise.all([
      api.get(`/complaints/${id}/`),
      api.get(`/complaints/${id}/comments/`),
    ])
    setComplaint(c.data)
    setStatus(c.data.status)
    setPriority(c.data.priority)
    setNotes(c.data.resolution_notes || '')
    setComments(cm.data.results || cm.data)
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [id])

  const reopenComplaint = async () => {
    setReopening(true)
    try {
      await api.post(`/complaints/${id}/reopen/`, { note: reopenNote })
      setReopenNote('')
      await load()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Could not re-open')
    } finally {
      setReopening(false)
    }
  }

  const updateStatus = async () => {
    setSaving(true)
    try {
      if (resolutionFile) {
        const fd = new FormData()
        fd.append('status', status)
        fd.append('priority', priority)
        fd.append('resolution_notes', notes)
        fd.append('resolution_image', resolutionFile)
        await api.patch(`/complaints/${id}/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        await api.patch(`/complaints/${id}/`, {
          status,
          priority,
          resolution_notes: notes,
        })
      }
      setResolutionFile(null)
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    await api.post(`/complaints/${id}/comments/`, { text: newComment })
    setNewComment('')
    await load()
  }

  const submitReview = async () => {
    await api.post(`/complaints/${id}/review/`, { rating, feedback })
    await load()
  }

  if (loading || !complaint) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isAdmin = !!(user?.is_admin || user?.role === 'ADMIN')
  const isStaff = !!(user?.is_staff_operator || isAdmin || user?.is_specialist)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="glass-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold">{complaint.title}</h1>
            <p className="text-sm text-white/40 mt-1">
              {complaint.category_name} · Room {complaint.room_number} · {formatDateTime(complaint.created_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <span className={cn('text-xs px-3 py-1.5 rounded-lg border', statusColors[complaint.status])}>
              {complaint.status.replace('_', ' ')}
            </span>
            <span className={cn('text-xs px-3 py-1.5 rounded-lg', priorityColors[complaint.priority])}>
              {complaint.priority}
            </span>
          </div>
        </div>
        <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{complaint.description}</p>

        {complaint.attachments && complaint.attachments.length > 0 && (
          <div className="mt-5">
            <p className="text-sm text-white/50 mb-2 flex items-center gap-1.5">
              <ImageIcon size={14} /> Attachments
            </p>
            <div className="flex flex-wrap gap-3">
              {complaint.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.image}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-24 h-24 rounded-xl overflow-hidden border border-white/10 hover:border-blue-500/40 transition-colors"
                >
                  <img src={att.image} alt="Attachment" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}

        {complaint.resolution_notes && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-sm font-medium text-emerald-300 mb-1">Resolution Notes</p>
            <p className="text-sm text-white/70 whitespace-pre-wrap">{complaint.resolution_notes}</p>
          </div>
        )}
        {complaint.resolution_image && (
          <div className="mt-4">
            <p className="text-sm text-white/50 mb-2">Resolution proof</p>
            <a href={complaint.resolution_image} target="_blank" rel="noreferrer">
              <img
                src={complaint.resolution_image}
                alt="Resolution proof"
                className="max-h-48 rounded-xl border border-white/10 object-cover"
              />
            </a>
          </div>
        )}
      </div>

      {/* Admin controls */}
      {isStaff && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-semibold">Admin Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full glass-input">
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full glass-input">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Resolution Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full glass-input min-h-[80px]" />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Proof photo (when resolving)</label>
            <input
              type="file"
              accept="image/*"
              className="w-full text-sm text-white/60"
              onChange={(e) => setResolutionFile(e.target.files?.[0] || null)}
            />
          </div>
          <button onClick={updateStatus} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Update Complaint'}
          </button>
        </div>
      )}

      {/* Status history */}
      {complaint.status_history?.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Status History</h3>
          <div className="space-y-3">
            {complaint.status_history.map((h) => (
              <div key={h.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                <div>
                  <p>
                    <span className="text-white/50">{h.old_status}</span>
                    {' → '}
                    <span className="font-medium">{h.new_status}</span>
                    {h.changed_by_name && <span className="text-white/40"> by {h.changed_by_name}</span>}
                  </p>
                  {h.note && <p className="text-white/40 mt-0.5">{h.note}</p>}
                  <p className="text-xs text-white/30 mt-0.5">{formatDateTime(h.changed_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Discussion ({comments.length})</h3>
        <div className="space-y-4 mb-6">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-medium shrink-0">
                {c.author?.[0] || 'U'}
              </div>
              <div>
                <p className="text-sm font-medium">{c.author}</p>
                <p className="text-sm text-white/70 mt-0.5">{c.text}</p>
                <p className="text-xs text-white/30 mt-1">{formatDateTime(c.created_at)}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && <p className="text-white/40 text-sm">No comments yet</p>}
        </div>
        <form onSubmit={postComment} className="flex gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 glass-input"
          />
          <button type="submit" className="btn-primary px-4">
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* Re-open */}
      {!isStaff && (complaint.status === 'RESOLVED' || complaint.status === 'REJECTED') && (
        <div className="glass-card p-6 space-y-3">
          <h3 className="font-semibold">Still not fixed?</h3>
          <p className="text-sm text-white/45">
            Re-open this ticket (used {complaint.reopen_count || 0}/3 times).
          </p>
          <textarea
            value={reopenNote}
            onChange={(e) => setReopenNote(e.target.value)}
            placeholder="What is still wrong?"
            className="w-full glass-input min-h-[70px]"
          />
          <button
            onClick={reopenComplaint}
            disabled={reopening || (complaint.reopen_count || 0) >= 3}
            className="btn-primary"
          >
            {reopening ? 'Re-opening…' : 'Re-open this complaint'}
          </button>
        </div>
      )}

      {/* Review (resident, resolved only) */}
      {!isStaff && complaint.status === 'RESOLVED' && !complaint.has_review && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-semibold">Rate this resolution</h3>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} className="p-1">
                <Star size={22} className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-white/20'} />
              </button>
            ))}
          </div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Optional feedback..."
            className="w-full glass-input min-h-[80px]"
          />
          <button onClick={submitReview} className="btn-primary">Submit Review</button>
        </div>
      )}
    </motion.div>
  )
}
