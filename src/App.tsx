import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ProductsPage from '@/pages/ProductsPage'
import StocksPage from '@/pages/StocksPage'
import SalesPage from '@/pages/SalesPage'
import JournalPage from '@/pages/JournalPage'
import ExpensesPage from '@/pages/ExpensesPage'
import ClientsPage from '@/pages/ClientsPage'
import FournisseursPage from '@/pages/FournisseursPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="stocks" element={<StocksPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="fournisseurs" element={<FournisseursPage />} />
          <Route
            path="expenses"
            element={
              <ProtectedRoute requiredRole="admin">
                <ExpensesPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
