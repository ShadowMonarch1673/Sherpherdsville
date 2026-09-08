import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export interface TourStep {
  target: string
  title: string
  text: string
}

interface Props {
  open: boolean
  steps: TourStep[]
  onClose: () => void
}

interface HighlightRect {
  top: number
  left: number
  width: number
  height: number
  bottom: number
}

export default function GuidedTour({ open, steps, onClose }: Props) {
  const [index, setIndex] = useState(0)
  const [highlight, setHighlight] = useState<HighlightRect | null>(null)

  useEffect(() => {
    if (open) setIndex(0)
  }, [open])

  useEffect(() => {
    if (!open || !steps[index]) return
    const update = () => {
      const target = document.querySelector<HTMLElement>(steps[index].target)
      if (!target) {
        setHighlight(null)
        return
      }
      const rect = target.getBoundingClientRect()
      setHighlight({
        top: Math.max(8, rect.top - 6),
        left: Math.max(8, rect.left - 6),
        width: rect.width + 12,
        height: rect.height + 12,
        bottom: rect.bottom + 6,
      })
    }

    const target = document.querySelector<HTMLElement>(steps[index].target)
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const timer = window.setTimeout(update, 320)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [index, open, steps])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  if (!open || !steps[index]) return null

  const step = steps[index]
  const lastStep = index === steps.length - 1
  const tooltipTop = highlight
    ? highlight.bottom + 230 < window.innerHeight
      ? highlight.bottom + 14
      : Math.max(14, highlight.top - 214)
    : Math.max(20, window.innerHeight / 2 - 100)
  const tooltipLeft = highlight
    ? Math.max(14, Math.min(Math.max(14, highlight.left), window.innerWidth - 354))
    : Math.max(14, window.innerWidth / 2 - 170)

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none" role="dialog" aria-modal="true" aria-label="Portal tutorial">
      {highlight && (
        <div
          className="fixed rounded-xl border-2 border-[#2E67B1] shadow-[0_0_0_9999px_rgba(22,31,43,0.58)] transition-all duration-300"
          style={{ top: highlight.top, left: highlight.left, width: highlight.width, height: highlight.height }}
        />
      )}
      {!highlight && <div className="fixed inset-0 bg-[#161F2B]/60" />}

      <section
        className="fixed w-[340px] max-w-[calc(100vw-28px)] bg-white border border-[#DDE2E9] rounded-2xl p-5 shadow-[0_22px_70px_rgba(18,28,40,0.28)] pointer-events-auto"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <div className="flex items-start justify-between gap-4">
          <span className="text-xs font-bold tracking-wider text-[#2E67B1] uppercase">Step {index + 1} of {steps.length}</span>
          <button type="button" onClick={onClose} className="text-[#777D86] hover:text-[#1A1A1A]" aria-label="Close tutorial"><X size={17} /></button>
        </div>
        <h2 className="mt-3 text-lg font-semibold text-[#1A1A1A]">{step.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#656B74]">{step.text}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="text-sm font-medium text-[#777D86] hover:text-[#1A1A1A]">Skip</button>
          <div className="flex gap-2">
            <button type="button" onClick={() => setIndex((current) => Math.max(0, current - 1))} disabled={index === 0} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#DDE2E9] text-sm font-medium text-[#4F5660] disabled:opacity-40"><ChevronLeft size={15} /> Previous</button>
            <button type="button" onClick={() => lastStep ? onClose() : setIndex((current) => current + 1)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#0F654A] text-white text-sm font-semibold hover:bg-[#0B553E]">
              {lastStep ? 'Finish' : 'Next'} {!lastStep && <ChevronRight size={15} />}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
