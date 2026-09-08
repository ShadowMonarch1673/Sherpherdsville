import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight, Bell, CheckCircle2, Clock3, FileCheck2, FileText,
  MailCheck, Menu, MessageSquareText, ShieldCheck, Wrench, X,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const workflow = [
  { number: '01', icon: MessageSquareText, title: 'Report the issue', text: 'Describe what happened and attach supporting photos when needed.' },
  { number: '02', icon: Wrench, title: 'Follow the response', text: 'See when the complaint is received, assigned, and being worked on.' },
  { number: '03', icon: FileCheck2, title: 'Confirm resolution', text: 'Review the outcome and reopen the complaint if the problem remains.' },
]

const features = [
  { icon: MailCheck, title: 'Email OTP access', text: 'Residents sign in securely using their registered email address.' },
  { icon: Bell, title: 'Useful notifications', text: 'Receive clear updates when the status of a complaint changes.' },
  { icon: ShieldCheck, title: 'Accountable handling', text: 'Every action is recorded so complaints do not disappear or get overlooked.' },
]

export default function LandingPage() {
  const [mobileNav, setMobileNav] = useState(false)

  return (
    <div className="portal-home">
      <header className="portal-home-nav">
        <Link to="/" className="portal-home-brand" aria-label="Sherpherdsville home">
          <span className="portal-home-logo">S</span>
          <span><strong>Sherpherdsville</strong><small>Complaints Management Portal</small></span>
        </Link>
        <nav className="portal-home-links portal-desktop-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <Link to="/login" className="portal-sign-in">Sign in</Link>
          <Link to="/login" className="portal-primary-button">Access portal</Link>
        </nav>
        <button className="portal-mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={22} /></button>
      </header>

      <AnimatePresence>
        {mobileNav && <>
          <motion.button className="portal-drawer-backdrop" aria-label="Close navigation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileNav(false)} />
          <motion.aside className="portal-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
            <button onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={22} /></button>
            <a href="#how-it-works" onClick={() => setMobileNav(false)}>How it works</a>
            <a href="#features" onClick={() => setMobileNav(false)}>Features</a>
            <Link to="/login" onClick={() => setMobileNav(false)}>Sign in</Link>
            <Link to="/login" className="portal-primary-button" onClick={() => setMobileNav(false)}>Access portal</Link>
          </motion.aside>
        </>}
      </AnimatePresence>

      <main>
        <section className="portal-hero">
          <motion.div className="portal-hero-copy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="portal-eyebrow"><ShieldCheck size={15} /> Resident support, made accountable</span>
            <h1>Report a problem.<br /><span>Track the response.</span></h1>
            <p>A clear, reliable way for Sherpherdsville residents to submit complaints, receive progress updates, and know when an issue has been resolved.</p>
            <div className="portal-hero-actions">
              <Link to="/login" className="portal-primary-button">Access the portal <ArrowRight size={17} /></Link>
              <a href="#how-it-works" className="portal-secondary-button">How it works</a>
            </div>
            <div className="portal-trust-row">
              <span><CheckCircle2 size={16} /> Registered residents only</span>
              <span><CheckCircle2 size={16} /> Email OTP sign-in</span>
            </div>
          </motion.div>

          <motion.div className="portal-ticket-panel" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65, delay: 0.12 }} aria-label="Example complaint progress">
            <div className="portal-ticket-head">
              <div><span>COMPLAINT #1042</span><h2>Water leaking under sink</h2></div>
              <span className="portal-status portal-status-progress">In progress</span>
            </div>
            <div className="portal-ticket-meta"><span><FileText size={16} /> Plumbing</span><span><Clock3 size={16} /> Updated 12 min ago</span></div>
            <div className="portal-progress-line" aria-hidden="true"><span /></div>
            <ol className="portal-ticket-timeline">
              <li className="is-complete"><span><CheckCircle2 size={16} /></span><div><strong>Complaint received</strong><small>Your report was recorded successfully.</small></div></li>
              <li className="is-complete"><span><CheckCircle2 size={16} /></span><div><strong>Assigned to maintenance</strong><small>The plumbing team has been notified.</small></div></li>
              <li className="is-current"><span><Wrench size={16} /></span><div><strong>Repair in progress</strong><small>A specialist is attending to the issue.</small></div></li>
              <li><span><FileCheck2 size={16} /></span><div><strong>Resolution confirmed</strong><small>You will be notified when work is complete.</small></div></li>
            </ol>
          </motion.div>
        </section>

        <section id="how-it-works" className="portal-section">
          <div className="portal-section-heading"><span>Simple process</span><h2>From complaint to resolution</h2><p>Every complaint follows a visible process, so residents and staff always know what happens next.</p></div>
          <div className="portal-workflow-grid">
            {workflow.map((item, index) => <motion.article key={item.title} className="portal-workflow-card" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }}>
              <div className="portal-card-top"><span>{item.number}</span><item.icon size={22} /></div><h3>{item.title}</h3><p>{item.text}</p>
            </motion.article>)}
          </div>
        </section>

        <section id="features" className="portal-feature-section">
          <div className="portal-section-heading portal-section-heading-left"><span>Built for residence operations</span><h2>Clear communication for everyone</h2><p>Residents get visibility. Administrators get an organized queue and the information needed to act.</p></div>
          <div className="portal-feature-list">
            {features.map((feature) => <article key={feature.title}><span><feature.icon size={21} /></span><div><h3>{feature.title}</h3><p>{feature.text}</p></div></article>)}
          </div>
        </section>

        <section className="portal-final-cta">
          <div><span>Need to report an issue?</span><h2>Your complaint starts with one clear message.</h2></div>
          <Link to="/login" className="portal-primary-button">Sign in with email <ArrowRight size={17} /></Link>
        </section>
      </main>

      <footer className="portal-home-footer">
        <div className="portal-home-brand"><span className="portal-home-logo">S</span><span><strong>Sherpherdsville</strong><small>Complaints Management Portal</small></span></div>
        <p>© {new Date().getFullYear()} Sherpherdsville Hostel. Resident support, clearly managed.</p>
      </footer>
    </div>
  )
}
