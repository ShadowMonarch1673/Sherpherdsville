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
  const [identifier, setIdentifier] = useState('')
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
      const { data } = await api.post('/auth/otp/request/', { identifier })
      setOtpSent(true)
      setInfo(
        data.resident_name
          ? `Hi ${data.resident_name} — enter the code sent to your phone.`
          : 'Enter the code sent to your phone.'
      )
      if (data.debug_otp) setDebugOtp(data.debug_otp)
      if (data.telephone) setIdentifier(data.telephone)
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
      const { data } = await api.post('/auth/otp/verify/', { telephone: identifier, code })
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
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-white to-slate-300 items-center justify-center text-2xl font-bold shadow-xl text-[#08090b] mb-4">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sherpherdsville</h1>
          <p className="text-white/50 mt-1">Hostel Management Portal</p>
        </div>

        <div className="glass-card p-8">
          {/* Mode tabs */}
          <div className="flex p-1 rounded-full bg-white/5 border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => { setMode('otp'); setError(''); setInfo('') }}
              className={`flex-1 py-2 text-sm rounded-full transition-all ${
                mode === 'otp' ? 'bg-white text-[#08090b] font-medium' : 'text-white/60'
              }`}
            >
              Phone OTP
            </button>
            <button
              type="button"
              onClick={() => { setMode('password'); setError(''); setInfo('') }}
              className={`flex-1 py-2 text-sm rounded-full transition-all ${
                mode === 'password' ? 'bg-white text-[#08090b] font-medium' : 'text-white/60'
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
              <p className="text-sm text-white/45 mb-6">
                Only a phone number or email already in the hostel resident registry can
                receive a code — there's no separate account to create. Session lasts 3 days.
              </p>

              {!otpSent ? (
                <form onSubmit={requestOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-1.5">Phone number or email</label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full glass-input"
                      placeholder="+254712000001 or jane@student.sherpherdsville.com"
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
                    className="w-full text-sm text-white/45 hover:text-white mt-1"
                    onClick={() => { setOtpSent(false); setCode(''); setError(''); setDebugOtp('') }}
                  >
                    Use a different number
                  </button>
                </form>
              )}
            </>
          )}

          {mode === 'password' && (
            <p className="text-center text-sm text-white/40 mt-6">
              Residents don't sign in with a password — switch to{' '}
              <button
                type="button"
                onClick={() => { setMode('otp'); setError(''); setInfo('') }}
                className="text-white hover:text-slate-200 transition-colors font-medium"
              >
                Phone OTP
              </button>{' '}
              instead.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
