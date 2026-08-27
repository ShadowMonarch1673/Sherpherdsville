import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform, AnimatePresence, useSpring } from 'framer-motion'
import {
  ArrowRight,
  Menu,
  X,
  Sparkles,
  MessageCircle,
  ShieldCheck,
  Bell,
  CheckCircle2,
  Smartphone,
  Heart,
} from 'lucide-react'
import { Link } from 'react-router-dom'

/* High-quality lifestyle imagery (Unsplash — college / phone / smile vibe) */
const IMG = {
  hero: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=2000&q=85',
  smilePhone: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=85',
  friends: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=85',
  campus: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=85',
  study: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=85',
  night: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=85',
  texting: 'https://images.unsplash.com/photo-1516534775068-ba3e3415b6f4?auto=format&fit=crop&w=1200&q=85',
}

const highlights = [
  {
    title: 'Report in seconds',
    text: 'Snap a photo, describe the issue, and send. Your request is logged instantly.',
    image: IMG.texting,
  },
  {
    title: 'Live status updates',
    text: 'Know when work starts, who is assigned, and when it is done — no chasing staff.',
    image: IMG.smilePhone,
  },
  {
    title: 'Heard by the right team',
    text: 'Plumbing, electrical, security — tickets route to specialists automatically.',
    image: IMG.study,
  },
]

const features = [
  { icon: Smartphone, title: 'Phone OTP login', text: 'Sign in with your registered student number. No password required.' },
  { icon: MessageCircle, title: 'Shepherd assistant', text: 'Ask how to file, track status, or read the handbook — anytime.' },
  { icon: Bell, title: 'Gentle notifications', text: 'Quiet updates when something moves. Never left in the dark.' },
  { icon: ShieldCheck, title: 'Transparent SLAs', text: 'Urgent issues are prioritized. Overdue tickets surface automatically.' },
]

export default function LandingPage() {
  const [mobileNav, setMobileNav] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 600], [0, 120])
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.35])
  const heroScale = useTransform(scrollY, [0, 500], [1, 1.08])
  const springY = useSpring(heroY, { stiffness: 80, damping: 24 })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="apple-page">
      {/* Sticky frosted nav */}
      <header className={`apple-nav ${scrolled ? 'apple-nav--solid' : ''}`}>
        <div className="apple-nav-inner">
          <Link to="/" className="apple-logo">
            <span className="apple-logo-mark">S</span>
            <span className="apple-logo-text">Sherpherdsville</span>
          </Link>

          <nav className="apple-nav-links desktop-only">
            <a href="#highlights">Highlights</a>
            <a href="#story">Your voice</a>
            <a href="#features">Features</a>
            <a href="#cta">Get started</a>
          </nav>

          <div className="apple-nav-actions desktop-only">
            <Link to="/login" className="apple-link">Sign in</Link>
            <Link to="/login" className="apple-btn apple-btn--sm">Get started</Link>
          </div>

          <button className="apple-menu-btn" onClick={() => setMobileNav(true)} aria-label="Menu">
            <Menu size={20} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div
              className="apple-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNav(false)}
            />
            <motion.aside
              className="apple-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            >
              <div className="apple-drawer-top">
                <span className="apple-logo-mark">S</span>
                <button onClick={() => setMobileNav(false)}><X size={22} /></button>
              </div>
              <a href="#highlights" onClick={() => setMobileNav(false)}>Highlights</a>
              <a href="#story" onClick={() => setMobileNav(false)}>Your voice</a>
              <a href="#features" onClick={() => setMobileNav(false)}>Features</a>
              <div className="apple-drawer-cta">
                <Link to="/login" className="apple-btn apple-btn--ghost" onClick={() => setMobileNav(false)}>Sign in</Link>
                <Link to="/login" className="apple-btn" onClick={() => setMobileNav(false)}>Get started</Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* HERO — full bleed, parallax */}
      <section className="apple-hero">
        <motion.div className="apple-hero-media" style={{ y: springY, scale: heroScale, opacity: heroOpacity }}>
          <img src={IMG.hero} alt="Students together on campus" />
          <div className="apple-hero-shade" />
        </motion.div>
        <div className="apple-hero-copy">
          <motion.p
            className="apple-eyebrow"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7 }}
          >
            Sherpherdsville Hostel Portal
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Your complaint.
            <br />
            <span className="apple-gradient-text">Finally heard.</span>
          </motion.h1>
          <motion.p
            className="apple-hero-sub"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
          >
            Built for students who want fixes — not forms that vanish.
            File, track, and get updates that feel as simple as a text.
          </motion.p>
          <motion.div
            className="apple-hero-cta"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6 }}
          >
            <Link to="/login" className="apple-btn">
              Get started <ArrowRight size={16} />
            </Link>
            <a href="#highlights" className="apple-btn apple-btn--ghost">
              See how it works
            </a>
          </motion.div>
        </div>
        <div className="apple-scroll-hint">
          <span />
        </div>
      </section>

      {/* HIGHLIGHTS — horizontal cards like Apple “Get the highlights” */}
      <section id="highlights" className="apple-section">
        <motion.div
          className="apple-section-head"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
        >
          <h2>Get the highlights.</h2>
          <p>Everything designed around one feeling — being taken seriously.</p>
        </motion.div>

        <div className="apple-highlight-track">
          {highlights.map((h, i) => (
            <motion.article
              key={h.title}
              className="apple-highlight-card"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.12, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="apple-highlight-img">
                <img src={h.image} alt={h.title} loading="lazy" />
              </div>
              <div className="apple-highlight-body">
                <h3>{h.title}</h3>
                <p>{h.text}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* STORY — full-width image + glass overlay panel */}
      <section id="story" className="apple-story">
        <div className="apple-story-bg">
          <img src={IMG.friends} alt="Students smiling together" />
          <div className="apple-story-fade" />
        </div>
        <motion.div
          className="apple-glass-panel"
          initial={{ opacity: 0, y: 48 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <Sparkles size={18} className="apple-glass-icon" />
          <h2>Because every resident deserves a reply.</h2>
          <p>
            Late-night leaks. Flickering lights. Lost access cards.
            Sherpherdsville turns those moments into clear tickets —
            with photos, priorities, and a team that actually responds.
          </p>
          <ul className="apple-check-list">
            {['Photo-backed tickets', 'Status you can trust', 'Specialists on the right jobs'].map((t) => (
              <li key={t}>
                <CheckCircle2 size={18} />
                {t}
              </li>
            ))}
          </ul>
        </motion.div>
      </section>

      {/* SPLIT — image left, copy right */}
      <section className="apple-split">
        <motion.div
          className="apple-split-media"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <img src={IMG.campus} alt="Campus life" loading="lazy" />
        </motion.div>
        <motion.div
          className="apple-split-copy"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <p className="apple-eyebrow">Designed for residence life</p>
          <h2>As simple as sending a text to a friend.</h2>
          <p>
            Open the portal, describe what is wrong, attach a photo, and submit.
            Admins and specialists see it in a live queue — you see every step after.
          </p>
          <Link to="/login" className="apple-text-link">
            Sign in with phone OTP <ArrowRight size={14} />
          </Link>
        </motion.div>
      </section>

      {/* FEATURES grid on soft black */}
      <section id="features" className="apple-section apple-section--tight">
        <motion.div
          className="apple-section-head"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>Quiet power. Clear outcomes.</h2>
          <p>The tools behind the calm experience.</p>
        </motion.div>
        <div className="apple-feature-grid">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="apple-feature-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.55 }}
            >
              <div className="apple-feature-icon">
                <f.icon size={22} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* IMMERSIVE band with glass strip */}
      <section className="apple-immersive">
        <img src={IMG.night} alt="Evening campus" className="apple-immersive-img" loading="lazy" />
        <div className="apple-immersive-veil" />
        <motion.div
          className="apple-immersive-glass"
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.75 }}
        >
          <Heart size={20} className="text-rose-300" />
          <h2>Feel at home. Stay in control.</h2>
          <p>
            From first-year nerves to final-year focus — your living space should support you.
            We made the admin side disappear so the care stays visible.
          </p>
        </motion.div>
      </section>

      {/* CTA */}
      <section id="cta" className="apple-cta">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2>Ready when you are.</h2>
          <p>Join your hall’s digital front desk in under a minute.</p>
          <div className="apple-hero-cta" style={{ justifyContent: 'center' }}>
            <Link to="/login" className="apple-btn">
              Sign in with your phone <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="apple-btn apple-btn--ghost">
              Sign in
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="apple-footer">
        <div className="apple-footer-inner">
          <span>© {new Date().getFullYear()} Sherpherdsville</span>
          <span>Hostel management, refined.</span>
        </div>
      </footer>
    </div>
  )
}
