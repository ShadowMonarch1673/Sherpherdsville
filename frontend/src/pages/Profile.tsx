import { useState, useRef } from 'react'
import { Camera, KeyRound, Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import PageTransition from '../components/PageTransition'

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    telephone: user?.telephone || '',
    room_number: user?.room_number || '',
    notify_in_app: user?.notify_in_app ?? true,
    notify_email_status: user?.notify_email_status ?? true,
    notify_email_announcements: user?.notify_email_announcements ?? true,
  })
  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')
  const [uploading, setUploading] = useState(false)

  const avatarUrl = user?.profile_picture
    ? (user.profile_picture.startsWith('http') ? user.profile_picture : user.profile_picture)
    : null

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      await api.patch('/me/', {
        first_name: form.first_name,
        last_name: form.last_name,
        telephone: form.telephone,
        room_number: form.room_number,
        notify_in_app: form.notify_in_app,
        notify_email_status: form.notify_email_status,
        notify_email_announcements: form.notify_email_announcements,
      })
      await refreshUser()
      setMsg('Profile updated')
    } catch {
      setMsg('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const uploadPhoto = async (file: File) => {
    setUploading(true)
    setMsg('')
    try {
      const fd = new FormData()
      fd.append('profile_picture', file)
      await api.patch('/me/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      await refreshUser()
      setMsg('Photo updated')
    } catch {
      setMsg('Photo upload failed')
    } finally {
      setUploading(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdMsg('')
    if (pwd.new_password !== pwd.confirm) {
      setPwdMsg('Passwords do not match')
      return
    }
    setPwdSaving(true)
    try {
      await api.post('/me/password/', {
        current_password: pwd.current_password,
        new_password: pwd.new_password,
      })
      setPwd({ current_password: '', new_password: '', confirm: '' })
      setPwdMsg('Password updated')
      await refreshUser()
    } catch (err: any) {
      const d = err.response?.data
      setPwdMsg(
        d?.current_password?.[0] ||
          d?.new_password?.[0] ||
          d?.detail ||
          'Could not update password'
      )
    } finally {
      setPwdSaving(false)
    }
  }

  return (
    <PageTransition>
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Your Profile</h1>

        {/* Avatar */}
        <div className="glass-card p-6 flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative group shrink-0"
            disabled={uploading}
          >
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.first_name?.[0] || user?.username?.[0] || 'U'
              )}
            </div>
            <span className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera size={20} />
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
            />
          </button>
          <div>
            <p className="font-semibold text-lg">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-sm text-white/40">
              @{user?.username} · {user?.role}
              {user?.category_specialization_name ? ` · ${user.category_specialization_name}` : ''}
            </p>
            <p className="text-xs text-white/30 mt-1">
              {uploading ? 'Uploading…' : 'Click photo to change'}
            </p>
          </div>
        </div>

        {/* Profile form */}
        <form onSubmit={saveProfile} className="glass-card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">First name</label>
              <input
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full glass-input"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Last name</label>
              <input
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full glass-input"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Email</label>
            <input value={user?.email || ''} disabled className="w-full glass-input opacity-50" />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Phone</label>
            <input
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              className="w-full glass-input"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Room number</label>
            <input
              value={form.room_number}
              onChange={(e) => setForm({ ...form, room_number: e.target.value })}
              className="w-full glass-input"
            />
          </div>

          {/* Notification prefs */}
          <div className="pt-2 border-t border-white/10">
            <p className="text-sm font-medium flex items-center gap-2 mb-3">
              <Bell size={16} /> Notifications
            </p>
            {[
              ['notify_in_app', 'In-app notifications'],
              ['notify_email_status', 'Email on status changes'],
              ['notify_email_announcements', 'Email for announcements'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between py-2 text-sm text-white/70">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="rounded"
                />
              </label>
            ))}
          </div>

          {msg && (
            <p className={`text-sm ${msg.includes('Fail') ? 'text-rose-400' : 'text-emerald-400'}`}>
              {msg}
            </p>
          )}
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        {/* Password */}
        <form onSubmit={changePassword} className="glass-card p-6 space-y-4">
          <p className="text-sm font-medium flex items-center gap-2">
            <KeyRound size={16} /> Security
          </p>
          {!user?.has_usable_password && (
            <p className="text-xs text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              OTP-only account — set a password below to also sign in with username.
            </p>
          )}
          {user?.has_usable_password && (
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Current password</label>
              <input
                type="password"
                value={pwd.current_password}
                onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })}
                className="w-full glass-input"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-white/60 mb-1.5">New password</label>
            <input
              type="password"
              value={pwd.new_password}
              onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })}
              className="w-full glass-input"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={pwd.confirm}
              onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
              className="w-full glass-input"
              minLength={8}
              required
            />
          </div>
          {pwdMsg && (
            <p className={`text-sm ${pwdMsg.includes('updated') ? 'text-emerald-400' : 'text-rose-400'}`}>
              {pwdMsg}
            </p>
          )}
          <button type="submit" disabled={pwdSaving} className="btn-primary w-full">
            {pwdSaving ? 'Updating…' : user?.has_usable_password ? 'Change password' : 'Set password'}
          </button>
        </form>
      </div>
    </PageTransition>
  )
}
