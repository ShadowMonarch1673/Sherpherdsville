import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  User,
  LogOut,
  PlusCircle,
  MessageCircle,
  CircleHelp,
  Menu,
  Calendar,
  ScrollText,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import NotificationDropdown from './NotificationDropdown'
import Chatbot from './Chatbot'
import GuidedTour, { type TourStep } from './GuidedTour'
import { cn } from '../lib/utils'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)

  const isAdmin = !!(user?.is_admin || user?.role === 'ADMIN')
  const isSpecialist = !!(user?.is_specialist || ['ELECTRICIAN','PLUMBER','CARPENTER','CLEANER','SECURITY'].includes(user?.role || ''))
  const isResident = user?.role === 'RESIDENT'

  const navItems = [
    { to: '/portal', icon: LayoutDashboard, label: 'Dashboard' },
    {
      to: '/portal/complaints',
      icon: FileText,
      label: isSpecialist && !isAdmin ? 'My Queue' : 'Complaints',
    },
    ...(!isResident ? [{ to: '/portal/calendar', icon: Calendar, label: 'Maintenance Calendar' }] : []),
    { to: '/portal/announcements', icon: Megaphone, label: 'Announcements' },
    { to: '/portal/profile', icon: User, label: 'Profile' },
  ]

  const adminNavItems = isAdmin
    ? [{ to: '/portal/audit', icon: ScrollText, label: 'Audit Log' }]
    : []

  const tourStorageKey = `sherpherdsville-tour-complete-${user?.id || 'user'}`
  const isWideScreen = window.innerWidth >= 1024
  const tourSteps: TourStep[] = isResident
    ? [
        { target: '[data-tour="welcome"]', title: 'Welcome to your dashboard', text: 'This is your overview of active and resolved complaints.' },
        ...(isWideScreen ? [
          { target: '[data-tour="complaints-nav"]', title: 'Your complaints', text: 'Open this page to review every complaint you have submitted.' },
          { target: '[data-tour="new-complaint"]', title: 'Report a problem', text: 'Use New Complaint to describe an issue and add photos when helpful.' },
          { target: '[data-tour="announcements-nav"]', title: 'Hostel announcements', text: 'Read important notices published by hostel administration.' },
        ] : []),
        { target: '[data-tour="notifications"]', title: 'Status notifications', text: 'Updates about your complaints appear here.' },
        { target: '[data-tour="assistant"]', title: 'Ask Shepherd', text: 'Use the portal assistant when you need help filing or tracking a complaint.' },
      ]
    : [
        { target: '[data-tour="welcome"]', title: 'Operations dashboard', text: 'Review complaint totals, current workload, and recent activity.' },
        ...(isWideScreen ? [
          { target: '[data-tour="complaints-nav"]', title: 'Complaint queue', text: 'Review complaints, update statuses, and record resolutions here.' },
          { target: '[data-tour="calendar-nav"]', title: 'Maintenance Calendar', text: 'Plan maintenance work and record expected service interruptions.' },
          { target: '[data-tour="announcements-nav"]', title: 'Announcements', text: 'Publish important notices for residents.' },
          ...(isAdmin ? [{ target: '[data-tour="audit-nav"]', title: 'Audit Log', text: 'Review important administrative activity across the portal.' }] : []),
        ] : []),
        { target: '[data-tour="notifications"]', title: 'Notifications', text: 'New complaint and status notifications appear here.' },
        { target: '[data-tour="assistant"]', title: 'Ask Shepherd', text: 'Use the portal assistant for quick guidance while working.' },
      ]

  useEffect(() => {
    if (!user || localStorage.getItem(tourStorageKey)) return
    const timer = window.setTimeout(() => setTourOpen(true), 700)
    return () => window.clearTimeout(timer)
  }, [tourStorageKey, user])

  const closeTour = () => {
    localStorage.setItem(tourStorageKey, 'true')
    setTourOpen(false)
  }

  return (
    <div className="portal-app min-h-screen flex bg-[#F8F8FB] text-[#1A1A1A]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "w-64 border-r border-[#E4E7ED] flex flex-col fixed h-full z-30 transition-transform duration-300 bg-white",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
          <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-[#2E67B1] flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-900/10 text-white">
             S
           </div>
           <div>
             <h1 className="font-semibold text-[#1A1A1A] tracking-tight">Sherpherdsville</h1>
             <p className="text-xs text-[#777D86]">Complaints Portal</p>
           </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
           <NavLink
             key={item.to}
             to={item.to}
             end={item.to === '/portal'}
             onClick={() => setSidebarOpen(false)}
             data-tour={item.to === '/portal' ? 'dashboard-nav' : item.to === '/portal/complaints' ? 'complaints-nav' : item.to === '/portal/calendar' ? 'calendar-nav' : item.to === '/portal/announcements' ? 'announcements-nav' : item.to === '/portal/profile' ? 'profile-nav' : undefined}
             className={({ isActive }) =>
               cn(
                 'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                 isActive
                   ? 'bg-[#EDF3FA] text-[#2E67B1] border border-[#CDDBEA]'
                   : 'text-[#606771] hover:text-[#2E67B1] hover:bg-[#F4F7FA]'
               )
             }
           >
             <item.icon size={18} />
             {item.label}
           </NavLink>
          ))}

          {isAdmin && adminNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              data-tour="audit-nav"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[#EDF3FA] text-[#2E67B1] border border-[#CDDBEA]'
                    : 'text-[#606771] hover:text-[#2E67B1] hover:bg-[#F4F7FA]'
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}

          {isResident && (
           <NavLink
             to="/portal/complaints/new"
             onClick={() => setSidebarOpen(false)}
             data-tour="new-complaint"
             className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0F654A] border border-[#0F654A] hover:bg-[#0B553E] transition-all mt-4 shadow-sm"
           >
             <PlusCircle size={18} />
             New Complaint
           </NavLink>
          )}
        </nav>

        <div className="p-4 border-t border-[#E4E7ED]">
          <div className="flex items-center gap-3 mb-3 px-2">
           <div className="w-9 h-9 rounded-full bg-[#2E67B1] flex items-center justify-center text-sm font-medium text-white overflow-hidden">
             {user?.profile_picture ? (
               <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
             ) : (
               user?.first_name?.[0] || user?.username?.[0] || 'U'
             )}
           </div>
           <div className="flex-1 min-w-0">
             <p className="text-sm font-medium truncate text-[#1A1A1A]">
               {user?.first_name} {user?.last_name}
             </p>
             <p className="text-xs text-[#777D86] truncate">{user?.role}</p>
           </div>
          </div>
          <button
           onClick={() => {
             logout()
             navigate('/login')
           }}
           className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-[#2E67B1] hover:bg-[#EDF3FA] transition-all"
          >
           <LogOut size={16} />
           Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 min-h-screen bg-[#F8F8FB]">
        <header className="sticky top-0 z-10 border-b border-[#E4E7ED] px-4 sm:px-8 py-4 flex items-center justify-between bg-white/95 backdrop-blur-xl">
          <div className="flex items-center gap-3">
           <button
             onClick={() => setSidebarOpen(true)}
             className="lg:hidden p-2 rounded-lg hover:bg-[#EDF3FA] text-[#2E67B1]"
           >
             <Menu size={20} />
           </button>
           <div data-tour="welcome">
             <h2 className="text-lg font-semibold text-[#1A1A1A]">
               Welcome back, {user?.first_name || user?.username}
             </h2>
             <p className="text-sm text-[#777D86]">
               {isAdmin ? 'Admin Dashboard' : isSpecialist ? `${user?.category_specialization_name || user?.role} queue` : user?.room_number ? `Room ${user.room_number}` : 'Resident account'}
             </p>
           </div>
          </div>
          <div className="flex items-center gap-2">
            <div data-tour="notifications"><NotificationDropdown /></div>
            <button type="button" onClick={() => setChatOpen(true)} data-tour="assistant" className="p-2.5 rounded-xl bg-[#EDF3FA] border border-[#CDDBEA] text-[#2E67B1] hover:bg-[#E2ECF7] transition-colors" title="Open Shepherd assistant" aria-label="Open Shepherd assistant"><MessageCircle size={18} /></button>
            <button type="button" onClick={() => setTourOpen(true)} className="p-2.5 rounded-xl bg-white border border-[#DDE2E9] text-[#656B74] hover:text-[#2E67B1] hover:bg-[#F4F7FA] transition-colors" title="Start portal tutorial" aria-label="Start portal tutorial"><CircleHelp size={18} /></button>
          </div>
        </header>

        <div className="p-8">
          <Outlet />
        </div>
      </main>

      <Chatbot open={chatOpen} onClose={() => setChatOpen(false)} />
      <GuidedTour open={tourOpen} steps={tourSteps} onClose={closeTour} />
    </div>
  )
}
