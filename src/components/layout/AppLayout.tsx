import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, Warehouse, ShoppingCart, MoreHorizontal, BookOpen, Users, Truck, Receipt, X, User, LogOut, Settings, UsersRound } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { ToastContainer } from '@/components/ui/toast'
import { SubscriptionBanner } from './SubscriptionBanner'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const bottomNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Accueil', exact: true },
  { to: '/products', icon: Package, label: 'Produits' },
  { to: '/stocks', icon: Warehouse, label: 'Stocks' },
  { to: '/sales', icon: ShoppingCart, label: 'Ventes' },
]

const moreNavItems = [
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/fournisseurs', icon: Truck, label: 'Fournisseurs' },
  { to: '/journal', icon: BookOpen, label: 'Journal' },
  { to: '/expenses', icon: Receipt, label: 'Dépenses' },
]

export function AppLayout() {
  const { signOut } = useAuth()
  const { profile } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [showMore, setShowMore] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const isMoreActive = moreNavItems.some((item) =>
    location.pathname.startsWith(item.to)
  )

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar onSignOut={signOut} />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Entête mobile */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 44 44" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
              <rect width="44" height="44" rx="8" fill="#0f172a"/>
              <rect x="7" y="22" width="30" height="18" rx="2" fill="#f97316"/>
              <polygon points="4,22 22,10 40,22" fill="#fb923c"/>
              <rect x="17" y="28" width="10" height="12" rx="1" fill="#0f172a"/>
              <rect x="9" y="24" width="6" height="5" rx="1" fill="#fed7aa"/>
              <rect x="29" y="24" width="6" height="5" rx="1" fill="#fed7aa"/>
              <circle cx="37" cy="13" r="4" fill="#22c55e"/>
            </svg>
            <div>
              <p className="text-white font-bold text-sm leading-tight">
                STOCK<span className="text-orange-500">AM</span>
              </p>
              <p className="text-slate-400 text-xs">Gestion de stock</p>
            </div>
          </div>

          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 bg-slate-800 rounded-full px-3 py-1.5"
          >
            <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {profile?.full_name?.charAt(0).toUpperCase() ?? 'U'}
              </span>
            </div>
            <span className="text-slate-200 text-xs font-medium">
              {profile?.full_name ?? 'Utilisateur'}
            </span>
          </button>
        </header>

        {/* Bandeau abonnement */}
        <SubscriptionBanner />

        {/* Menu utilisateur dropdown */}
        {showUserMenu && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setShowUserMenu(false)}
          >
            <div
              className="absolute top-14 right-4 bg-slate-900 border border-slate-700 rounded-xl shadow-xl w-52 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-slate-700">
                <p className="text-white text-sm font-medium">{profile?.full_name}</p>
                <p className="text-slate-400 text-xs capitalize">{profile?.role}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { navigate('/profile'); setShowUserMenu(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-200 hover:bg-slate-800 transition-colors text-sm"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  Mon profil
                </button>
                {profile?.role === 'admin' && (
                  <button
                    onClick={() => { navigate('/team'); setShowUserMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-200 hover:bg-slate-800 transition-colors text-sm"
                  >
                    <UsersRound className="h-4 w-4 text-slate-400" />
                    Mon équipe
                  </button>
                )}
                <button
                  onClick={() => { navigate('/subscription'); setShowUserMenu(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-200 hover:bg-slate-800 transition-colors text-sm"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  Abonnement
                </button>
                <div className="border-t border-slate-700 mt-1 pt-1">
                  <button
                    onClick={() => { signOut(); setShowUserMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-slate-800 transition-colors text-sm"
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contenu principal */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 pb-24 lg:p-6 lg:pt-5 lg:pb-6 max-w-screen-xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Menu "Plus" overlay */}
        {showMore && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setShowMore(false)}
          >
            <div
              className="absolute bottom-16 left-0 right-0 bg-slate-900 border-t border-slate-800 px-4 py-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Plus de fonctions</p>
                <button onClick={() => setShowMore(false)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {moreNavItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.to)
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setShowMore(false)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                      <item.icon className={cn('h-5 w-5', isActive ? 'text-orange-500' : 'text-slate-300')} />
                      <span className={cn('text-xs font-medium', isActive ? 'text-orange-500' : 'text-slate-300')}>
                        {item.label}
                      </span>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Barre de navigation mobile en bas */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800">
          <div className="flex items-center justify-around px-2 py-2">
            {bottomNavItems.map((item) => {
              const isActive = item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <item.icon className={cn('h-5 w-5', isActive ? 'text-orange-500' : 'text-slate-400')} />
                  <span className={cn('text-xs font-medium', isActive ? 'text-orange-500' : 'text-slate-400')}>
                    {item.label}
                  </span>
                </NavLink>
              )
            })}
            <button
              onClick={() => setShowMore(!showMore)}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
            >
              <MoreHorizontal className={cn('h-5 w-5', isMoreActive || showMore ? 'text-orange-500' : 'text-slate-400')} />
              <span className={cn('text-xs font-medium', isMoreActive || showMore ? 'text-orange-500' : 'text-slate-400')}>
                Plus
              </span>
            </button>
          </div>
        </nav>

      </div>

      <ToastContainer />
    </div>
  )
}
