import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ToastContainer } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'

export function AppLayout() {
  const { signOut } = useAuth()

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar onSignOut={signOut} />
      <main className="flex-1 overflow-y-auto">
       <div className="p-4 pt-14 lg:p-6 lg:pt-5 max-w-screen-xl mx-auto">
          <Outlet />
        </div>
      </main>
      <ToastContainer />
    </div>
  )
}
