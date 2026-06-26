import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart,
  BookOpen, Receipt, LogOut, Menu, X, Wrench
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useState } from 'react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord', exact: true },
  { to: '/products', icon: Package, label: 'Produits', adminOnly: false },
  { to: '/stocks', icon: Warehouse, label: 'Stocks', adminOnly: false },
  { to: '/sales', icon: ShoppingCart, label: 'Ventes', adminOnly: false },
  { to: '/journal', icon: BookOpen, label: 'Livre Journal', adminOnly: false },
  { to: '/expenses', icon: Receipt, label: 'Dépenses', adminOnly: true },
]

interface SidebarProps {
  onSignOut: () => void
}

export function Sidebar({ onSignOut }: SidebarProps) {
  const { profile } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || profile?.role === 'admin'
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-steel-800">
        <div className="flex items-center gap-2.5">
          <div className="rounded-md bg-orange-500 p-1.5">
            <Wrench className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Quincaillerie</p>
            <p className="text-steel-300 text-xs">Pro</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-orange-500 text-white'
                  : 'text-steel-200 hover:bg-steel-800 hover:text-white'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-steel-800">
        <div className="mb-2 px-2">
          <p className="text-white text-sm font-medium truncate">{profile?.full_name}</p>
          <p className="text-steel-400 text-xs capitalize">{profile?.role}</p>
        </div>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-steel-300 hover:bg-steel-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-steel-900 shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 p-2 bg-steel-900 text-white rounded-md"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-56 bg-steel-900 h-full">
            <div className="flex justify-end p-3">
              <button onClick={() => setMobileOpen(false)} className="text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent />
          </div>
          <div
            className="flex-1 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}
    </>
  )
}
