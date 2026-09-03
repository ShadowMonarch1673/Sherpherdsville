import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  User,
  LogOut,
  PlusCircle,
  MessageCircle,
  Menu,
  Calendar,
  BookOpen,
  ScrollText,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import Chatbot from './Chatbot'
import NotificationDropdown from './NotificationDropdown'
import { cn } from '../lib/utils'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [chatOpen, setChatOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
    { to: '/portal/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/portal/announcements', icon: Megaphone, label: 'Announcements' },
    { to: '/portal/faq', icon: BookOpen, label: 'Handbook' },
    { to: '/portal/profile', icon: User, label: 'Profile' },
  ]

  const adminNavItems = isAdmin
    ? [{ to: '/portal/audit', icon: ScrollText, label: 'Audit Log' }]
    : []

  return (
    <div className="min-h-screen flex bg-[#090b0d] text-white">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "w-64 glass border-r border-white/10 flex flex-col fixed h-full z-30 transition-transform duration-300 bg-[#101316]/80",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
          <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white to-slate-300 flex items-center justify-center font-bold text-lg shadow-lg shadow-white/10 text-[#08090b]">
             S
           </div>
           <div>
             <h1 className="font-semibold text-white tracking-tight">Sherpherdsville</h1>
             <p className="text-xs text-slate-400">Hostel Portal</p>
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
             className={({ isActive }) =>
               cn(
                 'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                 isActive
                   ? 'bg-white/8 text-white border border-white/10'
                   : 'text-slate-300 hover:text-white hover:bg-white/5'
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
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
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
             className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-emerald-200 bg-emerald-500/10 border border-emerald-400/20 hover:bg-emerald-500/15 transition-all mt-4"
           >
             <PlusCircle size={18} />
             New Complaint
           </NavLink>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3 px-2">
           <div className="w-9 h-9 rounded-full bg-gradient-to-br from-white to-slate-300 flex items-center justify-center text-sm font-medium text-[#08090b] overflow-hidden">
             {user?.profile_picture ? (
               <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
             ) : (
               user?.first_name?.[0] || user?.username?.[0] || 'U'
             )}
           </div>
           <div className="flex-1 min-w-0">
             <p className="text-sm font-medium truncate text-white">
               {user?.first_name} {user?.last_name}
             </p>
             <p className="text-xs text-slate-400 truncate">{user?.role}</p>
           </div>
          </div>
          <button
           onClick={() => {
             logout()
             navigate('/login')
           }}
           className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
           <LogOut size={16} />
           Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 min-h-screen bg-[#090b0d]">
        <header className="sticky top-0 z-10 glass border-b border-white/10 px-4 sm:px-8 py-4 flex items-center justify-between bg-[#101316]/75 backdrop-blur-xl">
          <div className="flex items-center gap-3">
           <button
             onClick={() => setSidebarOpen(true)}
             className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-200"
           >
             <Menu size={20} />
           </button>
           <div>
             <h2 className="text-lg font-semibold text-white">
               Welcome back, {user?.first_name || user?.username}
             </h2>
             <p className="text-sm text-slate-400">
               {isAdmin ? 'Admin Dashboard' : isSpecialist ? `${user?.category_specialization_name || user?.role} queue` : `Room ${user?.room_number || '—'}`}
             </p>
           </div>
          </div>
          <div className="flex items-center gap-3">
           <NotificationDropdown />
           <button
             onClick={() => setChatOpen(true)}
             className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-100 hover:bg-white/8 transition-colors"
             title="Open Shepherd assistant"
           >
             <MessageCircle size={18} />
           </button>
          </div>
        </header>

        <div className="p-8">
          <Outlet />
        </div>
      </main>

      {/* Chatbot */}
      <Chatbot open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}
