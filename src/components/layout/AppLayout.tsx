import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, Warehouse, ShoppingCart, BookOpen } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { ToastContainer } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const bottomNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Accueil', exact: true },
  { to: '/products', icon: Package, label: 'Produits' },
  { to: '/stocks', icon: Warehouse, label: 'Stocks' },
  { to: '/sales', icon: ShoppingCart, label: 'Ventes' },
  { to: '/journal', icon: BookOpen, label: 'Journal' },
]

export function AppLayout() {
  const { signOut } = useAuth()
  const location = useLocation()

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar desktop uniquement */}
      <Sidebar onSignOut={signOut} />

      {/* Contenu principal */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 pt-14 pb-24 lg:p-6 lg:pt-5 lg:pb-6 max-w-screen-xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Barre de navigation mobile en bas */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800">
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
                <item.icon
                  className={cn(
                    'h-5 w-5',
                    isActive ? 'text-orange-500' : 'text-slate-400'
                  )}
                />
                <span
                  className={cn(
                    'text-xs font-medium',
                    isActive ? 'text-orange-500' : 'text-slate-400'
                  )}
                >
                  {item.label}
                </span>
              </NavLink>
            )
          })}
        </div>
      </nav>

      <ToastContainer />
    </div>
  )
}
