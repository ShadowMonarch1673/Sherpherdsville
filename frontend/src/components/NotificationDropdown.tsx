import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import type { Notification } from '../types'
import { formatDateTime, cn } from '../lib/utils'

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifications.filter((n) => !n.is_read).length

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/notifications/')
      setNotifications(data.results || data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/`, { is_read: true })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch (e) {
      console.error(e)
    }
  }

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    await Promise.all(unreadIds.map((id) => api.patch(`/notifications/${id}/`, { is_read: true })))
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen(!open)
          if (!open) load()
        }}
        className="relative p-2.5 rounded-xl glass hover:bg-white/10 transition-colors"
      >
        <Bell size={18} className="text-white/70" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-blue-500 rounded-full text-[10px] font-semibold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 max-h-[400px] glass-strong rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="font-semibold text-sm">Notifications</p>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-[320px]">
              {loading && notifications.length === 0 ? (
                <div className="p-6 text-center text-white/40 text-sm">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-white/40 text-sm">
                  No notifications yet
                </div>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer',
                      !n.is_read && 'bg-blue-500/5'
                    )}
                    onClick={() => {
                      if (!n.is_read) markRead(n.id)
                    }}
                  >
                    <div className="flex gap-3">
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      )}
                      <div className={cn(!n.is_read ? '' : 'ml-5')}>
                        <p className="text-sm text-white/90 leading-snug">{n.message}</p>
                        <p className="text-xs text-white/30 mt-1">{formatDateTime(n.created_at)}</p>
                        {n.complaint_id && (
                          <Link
                            to={`/portal/complaints/${n.complaint_id}`}
                            onClick={() => setOpen(false)}
                            className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
                          >
                            View complaint →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
