import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

type Mode = 'password' | 'otp'

export default function Login() {
  const [mode, setMode] = useState<Mode>('otp')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [code, setCode] = useState('')
  const [debugOtp, setDebugOtp] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, refreshUser } = useAuth()
  const navigate = useNavigate()

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/portal')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setDebugOtp('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/otp/request/', { email })
      setOtpSent(true)
      setInfo(
        data.resident_name
          ? `Hi ${data.resident_name}. Enter the code sent to your registered email.`
          : 'Enter the code sent to your registered email.'
      )
      if (data.debug_otp) setDebugOtp(data.debug_otp)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not send OTP')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/otp/verify/', { email, code })
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      await refreshUser()
      navigate('/portal')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2E67B1]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#C9932F]/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#2E67B1] items-center justify-center text-2xl font-bold shadow-xl shadow-blue-900/10 text-white mb-4">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sherpherdsville</h1>
          <p className="text-[#777D86] mt-1">Complaints Management Portal</p>
        </div>

        <div className="glass-card p-8">
          {/* Mode tabs */}
          <div className="flex p-1 rounded-full bg-white/5 border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => { setMode('otp'); setError(''); setInfo('') }}
              className={`flex-1 py-2 text-sm rounded-full transition-all ${
                mode === 'otp' ? 'bg-[#2E67B1] text-white font-medium' : 'text-[#6B717A]'
              }`}
            >
              Email OTP
            </button>
            <button
              type="button"
              onClick={() => { setMode('password'); setError(''); setInfo('') }}
              className={`flex-1 py-2 text-sm rounded-full transition-all ${
                mode === 'password' ? 'bg-[#2E67B1] text-white font-medium' : 'text-[#6B717A]'
              }`}
            >
              Password
            </button>
          </div>

          {mode === 'password' ? (
            <>
              <h2 className="text-lg font-semibold mb-6">Sign in with password</h2>
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full glass-input"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full glass-input"
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={loading} className="w-full btn-primary mt-2">
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-2">Resident login</h2>

              {!otpSent ? (
                <form onSubmit={requestOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full glass-input"
                      placeholder="jane@student.sherpherdsville.com"
                      required
                      autoFocus
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}
                  <button type="submit" disabled={loading} className="w-full btn-primary mt-2">
                    {loading ? 'Checking registry...' : 'Send OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={verifyOtp} className="space-y-4">
                  {info && (
                    <p className="text-sm text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                      {info}
                    </p>
                  )}
                  {debugOtp && (
                    <p className="text-xs text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                      Dev OTP: <strong className="tracking-widest">{debugOtp}</strong>
                    </p>
                  )}
                  <div>
                    <label className="block text-sm text-white/60 mb-1.5">6-digit code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full glass-input tracking-[0.4em] text-center text-lg"
                      placeholder="••••••"
                      required
                      autoFocus
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}
                  <button type="submit" disabled={loading || code.length < 6} className="w-full btn-primary mt-2">
                    {loading ? 'Verifying...' : 'Verify & sign in'}
                  </button>
                  <button
                    type="button"
                    className="w-full text-sm text-[#6B717A] hover:text-[#2E67B1] mt-1"
                    onClick={() => { setOtpSent(false); setCode(''); setError(''); setDebugOtp('') }}
                  >
                    Use a different email
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
