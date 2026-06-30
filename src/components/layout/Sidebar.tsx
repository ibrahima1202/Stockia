import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart,
  BookOpen, Receipt, LogOut, Users, Truck, UserCircle, UsersRound
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord', exact: true, adminOnly: false },
  { to: '/products', icon: Package, label: 'Produits', adminOnly: false },
  { to: '/stocks', icon: Warehouse, label: 'Stocks', adminOnly: false },
  { to: '/sales', icon: ShoppingCart, label: 'Ventes', adminOnly: false },
  { to: '/clients', icon: Users, label: 'Clients', adminOnly: false },
  { to: '/fournisseurs', icon: Truck, label: 'Fournisseurs', adminOnly: false },
  { to: '/journal', icon: BookOpen, label: 'Livre Journal', adminOnly: false },
  { to: '/team', icon: UsersRound, label: 'Mon équipe', adminOnly: true },
  { to: '/expenses', icon: Receipt, label: 'Dépenses', adminOnly: true },
]

interface SidebarProps {
  onSignOut: () => void
}

export function Sidebar({ onSignOut }: SidebarProps) {
  const { profile } = useAuthStore()
  const location = useLocation()

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || profile?.role === 'admin'
  )

  return (
    <aside className="hidden lg:flex flex-col w-56 bg-slate-900 shrink-0 h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 44 44" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
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
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800 space-y-1">
        <div className="mb-2 px-2">
          <p className="text-white text-sm font-medium truncate">{profile?.full_name}</p>
          <p className="text-slate-400 text-xs capitalize">{profile?.role}</p>
        </div>
        <NavLink
          to="/profile"
          className={cn(
            'flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
            location.pathname === '/profile'
              ? 'bg-orange-500 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          )}
        >
          <UserCircle className="h-4 w-4" />
          Mon profil
        </NavLink>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
