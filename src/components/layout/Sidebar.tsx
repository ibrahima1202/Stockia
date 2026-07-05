import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart,
  BookOpen, Receipt, LogOut, Users, Truck, UserCircle,
  Crown, UsersRound, ChevronDown, BarChart3
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { useSubscription } from '@/hooks/useSubscription'
import { useRole } from '@/hooks/useRole'
import { SubscriptionBanner } from './SubscriptionBanner'
import { useState } from 'react'

export function Sidebar() {
  const { signOut } = useAuth()
  const { profile } = useAuthStore()
  const { subscription } = useSubscription()
  const {
    isAdmin, canManageSales, canManageStock, canViewClients,
    canViewFournisseurs, canViewJournal, canManageExpenses, canViewStats
  } = useRole()

  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const isTrialing = subscription?.status === 'trial'
  const isExpired = subscription ? subscription.status === 'expired' : false

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Tableau de bord', show: true },
    { to: '/products', icon: Package, label: 'Produits', show: true },
    { to: '/stocks', icon: Warehouse, label: 'Stocks', show: canManageStock },
    { to: '/sales', icon: ShoppingCart, label: 'Ventes', show: canManageSales },
    { to: '/clients', icon: Users, label: 'Clients', show: canViewClients },
    { to: '/fournisseurs', icon: Truck, label: 'Fournisseurs', show: canViewFournisseurs },
    { to: '/journal', icon: BookOpen, label: 'Livre Journal', show: canViewJournal },
    { to: '/expenses', icon: Receipt, label: 'Dépenses', show: canManageExpenses },
    { to: '/stats', icon: BarChart3, label: 'Statistiques', show: canViewStats },
  ].filter((i) => i.show)

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800 shrink-0">
        <svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
          <rect width="44" height="44" rx="8" fill="#0f172a"/>
          <rect x="7" y="22" width="30" height="18" rx="2" fill="#f97316"/>
          <polygon points="4,22 22,10 40,22" fill="#fb923c"/>
          <rect x="17" y="28" width="10" height="12" rx="1" fill="#0f172a"/>
          <rect x="9" y="24" width="6" height="5" rx="1" fill="#fed7aa"/>
          <rect x="29" y="24" width="6" height="5" rx="1" fill="#fed7aa"/>
          <circle cx="37" cy="13" r="4" fill="#22c55e"/>
        </svg>
        <div>
          <p className="text-white font-bold text-base leading-tight">
            STOCK<span className="text-orange-500">AM</span>
          </p>
          <p className="text-slate-400 text-[11px] leading-tight">Gestion de stock</p>
        </div>
      </div>

      {/* Subscription banner desktop */}
      {(isTrialing || isExpired) && (
        <SubscriptionBanner />
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-800 p-3 shrink-0">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {profile?.full_name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-white text-sm font-medium truncate">{profile?.full_name}</p>
              <p className="text-slate-400 text-xs capitalize">{profile?.role}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute bottom-14 left-0 right-0 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                <button onClick={() => { navigate('/profile'); setShowUserMenu(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:bg-slate-700 text-sm">
                  <UserCircle className="h-4 w-4" /> Mon profil
                </button>
                {isAdmin && (
                  <button onClick={() => { navigate('/team'); setShowUserMenu(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:bg-slate-700 text-sm">
                    <UsersRound className="h-4 w-4" /> Mon équipe
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => { navigate('/subscription'); setShowUserMenu(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:bg-slate-700 text-sm">
                    <Crown className="h-4 w-4" /> Abonnement
                  </button>
                )}
                <div className="border-t border-slate-700">
                  <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-slate-700 text-sm">
                    <LogOut className="h-4 w-4" /> Déconnexion
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
