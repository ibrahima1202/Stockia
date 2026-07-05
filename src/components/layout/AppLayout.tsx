import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart,
  BookOpen, Receipt, LogOut, Users, Truck, UserCircle,
  MoreHorizontal, Crown, UsersRound, ChevronDown, X, BarChart3
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { useSubscription } from '@/hooks/useSubscription'
import { useRole } from '@/hooks/useRole'
import { SubscriptionBanner } from './SubscriptionBanner'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const { signOut } = useAuth()
  const { profile } = useAuthStore()
  const { subscription } = useSubscription()
  const {
    isAdmin, canManageSales, canManageStock, canViewClients,
    canViewFournisseurs, canViewJournal, canManageExpenses, canViewStats
  } = useRole()

  const navigate = useNavigate()
  const [showMore, setShowMore] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const isTrialing = subscription?.status === 'trial'
  const isExpired = subscription ? subscription.status === 'expired' : false

  const handleSignOut = async () => {
    setShowUserMenu(false)
    await signOut()
  }

  const bottomNavItems = [
    { to: '/', icon: LayoutDashboard, label: 'Accueil', show: true },
    { to: '/products', icon: Package, label: 'Produits', show: true },
    { to: '/stocks', icon: Warehouse, label: 'Stocks', show: canManageStock },
    { to: '/sales', icon: ShoppingCart, label: 'Ventes', show: canManageSales },
  ].filter((i) => i.show)

  const moreItems = [
    { to: '/clients', icon: Users, label: 'Clients', show: canViewClients },
    { to: '/fournisseurs', icon: Truck, label: 'Fournisseurs', show: canViewFournisseurs },
    { to: '/journal', icon: BookOpen, label: 'Journal', show: canViewJournal },
    { to: '/expenses', icon: Receipt, label: 'Dépenses', show: canManageExpenses },
    { to: '/stats', icon: BarChart3, label: 'Statistiques', show: canViewStats },
  ].filter((i) => i.show)

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar desktop */}
      <Sidebar />

      {/* Header mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 border-b border-slate-800 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
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
            <p className="text-slate-400 text-[10px] leading-tight">Gestion de stock</p>
          </div>
        </div>

        {/* User menu mobile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 bg-slate-800 rounded-full pl-1 pr-2 py-1"
          >
            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
              {profile?.full_name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <span className="text-white text-xs font-medium max-w-[80px] truncate">
              {profile?.full_name?.split(' ')[0]}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-10 z-50 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700">
                  <p className="text-white font-semibold text-sm">{profile?.full_name}</p>
                  <p className="text-slate-400 text-xs capitalize">{profile?.role}</p>
                </div>
                <div className="py-1">
                  <button onClick={() => { navigate('/profile'); setShowUserMenu(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:bg-slate-800 text-sm">
                    <UserCircle className="h-4 w-4" /> Mon profil
                  </button>
                  {isAdmin && (
                    <button onClick={() => { navigate('/team'); setShowUserMenu(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:bg-slate-800 text-sm">
                      <UsersRound className="h-4 w-4" /> Mon équipe
                    </button>
                  )}
                  {isAdmin && (
                    <button onClick={() => { navigate('/subscription'); setShowUserMenu(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:bg-slate-800 text-sm">
                      <Crown className="h-4 w-4" /> Abonnement
                    </button>
                  )}
                  <div className="border-t border-slate-700 mt-1">
                    <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-slate-800 text-sm">
                      <LogOut className="h-4 w-4" /> Déconnexion
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Subscription banner mobile */}
      {(isTrialing || isExpired) && (
        <div className="lg:hidden fixed top-14 left-0 right-0 z-30">
          <SubscriptionBanner />
        </div>
      )}

      {/* Main content */}
      <main className={`lg:ml-64 pt-14 lg:pt-0 ${(isTrialing || isExpired) ? 'pt-24' : ''} pb-20 lg:pb-6`}>
        <div className="max-w-5xl mx-auto px-4 py-5">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 h-16 flex items-center justify-around">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-orange-500' : 'text-slate-500 hover:text-slate-700'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}

        {moreItems.length > 0 && (
          <button
            onClick={() => setShowMore(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">Plus</span>
          </button>
        )}
      </nav>

      {/* Menu Plus */}
      {showMore && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowMore(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl p-4 pb-8">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-slate-900">Menu</p>
              <button onClick={() => setShowMore(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {moreItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setShowMore(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors ${
                      isActive ? 'bg-orange-50 text-orange-500' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
