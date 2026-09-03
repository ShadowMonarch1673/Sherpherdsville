import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Download, FileText, AlertTriangle } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { Complaint } from '../types'
import { formatDate, statusColors, priorityColors, cn } from '../lib/utils'
import EmptyState from '../components/EmptyState'
import PageTransition from '../components/PageTransition'

export default function Complaints() {
  const { user } = useAuth()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [bulkStatus, setBulkStatus] = useState('IN_PROGRESS')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)

  const load = () => {
    const params = user?.is_specialist && !user?.is_admin ? '?queue=open' : ''
    api.get(`/complaints/${params}`)
      .then((res) => setComplaints(res.data.results || res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = complaints.filter((c) => {
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || c.status === statusFilter
    const matchOverdue = !showOverdueOnly || (c as any).is_overdue
    return matchSearch && matchStatus && matchOverdue
  })

  const toggle = (id: number) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([])
    else setSelected(filtered.map((c) => c.id))
  }

  const bulkUpdate = async () => {
    if (!selected.length) return
    setBulkBusy(true)
    try {
      await api.post('/complaints/bulk/', { ids: selected, status: bulkStatus })
      setSelected([])
      load()
    } finally {
      setBulkBusy(false)
    }
  }

  const exportCsv = () => {
    const headers = ['ID', 'Title', 'Category', 'Status', 'Priority', 'Room', 'Resident', 'Created', 'Overdue']
    const rows = filtered.map((c) => [
      c.id,
      `"${c.title.replace(/"/g, '""')}"`,
      c.category_name,
      c.status,
      c.priority,
      c.room_number,
      c.resident,
      c.created_at.slice(0, 10),
      (c as any).is_overdue ? 'YES' : 'NO',
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sherpherdsville-complaints-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  const isAdmin = !!(user?.is_admin || user?.role === 'ADMIN')
  const isStaff = !!(user?.is_staff_operator || isAdmin || user?.is_specialist)

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Complaints</h1>
            <p className="text-white/50 text-sm mt-1">{filtered.length} shown</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            {isStaff && (
              <>
                {isAdmin && (
                  <button onClick={exportCsv} className="btn-ghost flex items-center gap-2 text-sm">
                    <Download size={16} /> Export
                  </button>
                )}
                <button
                  onClick={() => setShowOverdueOnly(!showOverdueOnly)}
                  className={cn(
                    'btn-ghost flex items-center gap-2 text-sm',
                    showOverdueOnly && 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  )}
                >
                  <AlertTriangle size={16} /> Overdue
                </button>
              </>
            )}
            <div className="relative flex-1 sm:w-52">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full glass-input pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="glass-input"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {isAdmin && selected.length > 0 && (
          <div className="glass-card p-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-white/60">{selected.length} selected</span>
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="glass-input text-sm">
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <button onClick={bulkUpdate} disabled={bulkBusy} className="btn-primary text-sm">
              {bulkBusy ? 'Updating...' : 'Apply to selected'}
            </button>
            <button onClick={() => setSelected([])} className="btn-ghost text-sm">Clear</button>
          </div>
        )}

        <div className="space-y-3">
          {isAdmin && filtered.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-white/40 px-1">
              <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} />
              Select all
            </label>
          )}
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-stretch gap-2"
            >
              {isAdmin && (
                <div className="flex items-center px-1">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                </div>
              )}
              <Link
                to={`/portal/complaints/${c.id}`}
                className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.08] transition-all group flex-1"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold group-hover:text-white transition-colors truncate">
                      {c.title}
                    </h3>
                    <span className={cn('text-xs px-2 py-0.5 rounded-md', priorityColors[c.priority])}>
                      {c.priority}
                    </span>
                    {(c as any).is_overdue && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                        <AlertTriangle size={10} /> Overdue
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/50 line-clamp-1">{c.description}</p>
                  <p className="text-xs text-white/30 mt-2">
                    {c.category_name} · Room {c.room_number} · {formatDate(c.created_at)}
                  </p>
                </div>
                <span className={cn('text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap', statusColors[c.status])}>
                  {c.status.replace('_', ' ')}
                </span>
              </Link>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <EmptyState
              icon={FileText}
              title="No complaints found"
              description="Try adjusting filters, or file a new complaint."
              action={
                <Link to="/portal/complaints/new" className="btn-primary text-sm">
                  File a complaint
                </Link>
              }
            />
          )}
        </div>
      </div>
    </PageTransition>
  )
}
