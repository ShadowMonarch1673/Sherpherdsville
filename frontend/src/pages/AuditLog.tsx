import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ScrollText } from 'lucide-react'
import api from '../lib/api'
import type { AuditLog } from '../types'
import { formatDateTime } from '../lib/utils'
import PageTransition from '../components/PageTransition'
import EmptyState from '../components/EmptyState'

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/audit-logs/')
      .then((r) => setLogs(r.data.results || r.data))
      .catch(() => setError('Admin access required'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-white/50 text-sm mt-1">Immutable trail of important actions</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : error ? (
          <EmptyState icon={ScrollText} title="Access denied" description={error} />
        ) : logs.length === 0 ? (
          <EmptyState icon={ScrollText} title="No audit entries yet" description="Actions will appear here as the system is used." />
        ) : (
          <div className="space-y-2">
            {logs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.4) }}
                className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm"
              >
                <span className="text-xs text-white/35 whitespace-nowrap">{formatDateTime(log.created_at)}</span>
                <span className="px-2 py-0.5 rounded-md bg-white/5 text-xs font-medium">{log.action}</span>
                <span className="text-white/70 flex-1">
                  {log.actor_name} · {log.object_type}
                  {log.object_id != null && ` #${log.object_id}`}
                  {log.detail && ` — ${log.detail}`}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
