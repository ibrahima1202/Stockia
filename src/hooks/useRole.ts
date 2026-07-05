import { useAuthStore } from '@/store/authStore'

export function useRole() {
  const { profile } = useAuthStore()
  const role = profile?.role ?? 'caissier'

  const isAdmin = role === 'admin'
  const isCaissier = role === 'caissier'
  const isMagasinier = role === 'magasinier'
  const isPromoteur = role === 'promoteur'

  // Tableau de bord
  const canViewDashboard = true

  // Produits
  const canViewProducts = true
  const canManageProducts = isAdmin || isMagasinier

  // Stock
  const canManageStock = isAdmin || isMagasinier

  // Ventes
  const canManageSales = isAdmin || isCaissier
  const canCreateSale = isAdmin || isCaissier
  const canCancelSale = isAdmin || isCaissier
  const canApplyDiscount = isAdmin || isCaissier
  const canExportSale = isAdmin || isCaissier

  // Clients
  const canViewClients = isAdmin || isCaissier || isPromoteur
  const canManageClients = isAdmin || isCaissier

  // Fournisseurs
  const canViewFournisseurs = isAdmin || isCaissier || isPromoteur
  const canManageFournisseurs = isAdmin || isCaissier

  // Achats fournisseurs
  const canManageAchats = isAdmin || isCaissier

  // Dépenses
  const canManageExpenses = isAdmin || isCaissier

  // Journal
  const canViewJournal = isAdmin || isCaissier || isPromoteur

  // Statistiques
  const canViewStats = isAdmin || isPromoteur

  // Équipe
  const canManageTeam = isAdmin

  // Abonnement
  const canManageSubscription = isAdmin

  // Export PDF
  const canExportPDFRole = isAdmin || isCaissier

  return {
    role,
    isAdmin,
    isCaissier,
    isMagasinier,
    isPromoteur,
    canViewDashboard,
    canViewProducts,
    canManageProducts,
    canManageStock,
    canManageSales,
    canCreateSale,
    canCancelSale,
    canApplyDiscount,
    canExportSale,
    canViewClients,
    canManageClients,
    canViewFournisseurs,
    canManageFournisseurs,
    canManageAchats,
    canManageExpenses,
    canViewJournal,
    canViewStats,
    canManageTeam,
    canManageSubscription,
    canExportPDFRole,
  }
}
