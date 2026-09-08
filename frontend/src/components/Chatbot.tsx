import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Send, X } from 'lucide-react'
import api from '../lib/api'
import { cn } from '../lib/utils'

interface Message {
  role: 'user' | 'bot'
  text: string
  suggestions?: string[]
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function Chatbot({ open, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: 'Hello. I am Shepherd, your portal assistant. How can I help?',
      suggestions: ['How do I file a complaint?', 'Check my complaints', 'What are the categories?'],
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    const message = text.trim()
    if (!message || loading) return
    setMessages((current) => [...current, { role: 'user', text: message }])
    setInput('')
    setLoading(true)
    try {
      const { data } = await api.post('/chatbot/', { message })
      setMessages((current) => [
        ...current,
        { role: 'bot', text: data.reply, suggestions: data.suggestions },
      ])
    } catch {
      setMessages((current) => [
        ...current,
        { role: 'bot', text: 'I could not respond just now. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && <>
        <motion.button
          type="button"
          aria-label="Close portal assistant"
          className="fixed inset-0 bg-[#1A2433]/35 backdrop-blur-[2px] z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-label="Shepherd portal assistant"
          className="fixed bottom-5 right-5 w-[390px] max-w-[calc(100vw-24px)] h-[560px] max-h-[calc(100vh-40px)] bg-white border border-[#DDE2E9] rounded-2xl z-50 flex flex-col shadow-[0_24px_80px_rgba(26,36,51,0.22)] overflow-hidden"
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 28, scale: 0.97 }}
          transition={{ type: 'spring', damping: 27, stiffness: 320 }}
        >
          <header className="flex items-center justify-between px-5 py-4 border-b border-[#E4E7ED] bg-[#F8FAFC]">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-[#2E67B1] text-white flex items-center justify-center"><Bot size={18} /></span>
              <div><p className="font-semibold text-sm text-[#1A1A1A]">Shepherd</p><p className="text-xs text-[#777D86]">Portal assistant</p></div>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-[#656B74] hover:text-[#1A1A1A] hover:bg-[#EEF1F5]" aria-label="Close"><X size={18} /></button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white" aria-live="polite">
            {messages.map((item, index) => (
              <div key={index} className={cn('flex', item.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed', item.role === 'user' ? 'bg-[#2E67B1] text-white rounded-br-md' : 'bg-[#F1F3F6] text-[#30353B] rounded-bl-md')}>
                  <p className="whitespace-pre-wrap">{item.text}</p>
                  {item.suggestions && item.suggestions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.suggestions.map((suggestion) => (
                        <button key={suggestion} type="button" onClick={() => send(suggestion)} className="text-xs px-2.5 py-1.5 rounded-lg bg-white text-[#2E67B1] hover:bg-[#EDF3FA] border border-[#CCD9E8]">
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && <div className="flex justify-start"><div className="bg-[#F1F3F6] rounded-2xl rounded-bl-md px-4 py-3"><span className="text-sm text-[#656B74]">Shepherd is typing...</span></div></div>}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={(event) => { event.preventDefault(); send(input) }} className="flex gap-2 p-4 border-t border-[#E4E7ED] bg-[#F8FAFC]">
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about the complaints portal" className="flex-1 glass-input text-sm" disabled={loading} aria-label="Message" />
            <button type="submit" disabled={loading || !input.trim()} className="p-3 rounded-xl bg-[#2E67B1] text-white hover:bg-[#244F83] disabled:opacity-40" aria-label="Send message"><Send size={16} /></button>
          </form>
        </motion.section>
      </>}
    </AnimatePresence>
  )
}
