import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    telephone: '',
    room_number: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/portal')
    } catch (err: any) {
      const data = err.response?.data
      if (typeof data === 'object') {
        const msg = Object.values(data).flat().join(' ')
        setError(msg || 'Registration failed')
      } else {
        setError('Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#08090b]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-white to-slate-300 items-center justify-center text-2xl font-bold shadow-xl shadow-white/10 mb-4 text-[#08090b]">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create Account</h1>
          <p className="text-slate-400 mt-1">Join Sherpherdsville Hostel Portal</p>
        </div>

        <div className="glass-card p-8 bg-[#101316]/85 backdrop-blur-xl border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">First name</label>
                <input name="first_name" value={form.first_name} onChange={handleChange} className="w-full glass-input !text-white !placeholder-slate-400" required />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Last name</label>
                <input name="last_name" value={form.last_name} onChange={handleChange} className="w-full glass-input !text-white !placeholder-slate-400" required />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Username</label>
              <input name="username" value={form.username} onChange={handleChange} className="w-full glass-input !text-white !placeholder-slate-400" required />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full glass-input !text-white !placeholder-slate-400" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Phone number</label>
                <input name="telephone" value={form.telephone} onChange={handleChange} className="w-full glass-input !text-white !placeholder-slate-400" placeholder="+254..." required />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Room number</label>
                <input name="room_number" value={form.room_number} onChange={handleChange} className="w-full glass-input !text-white !placeholder-slate-400" required />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} className="w-full glass-input !text-white !placeholder-slate-400" required minLength={8} />
            </div>

            {error && (
              <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="w-full btn-primary mt-2">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-white hover:text-slate-200 transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
