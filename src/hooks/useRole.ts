import { useAuthStore } from '@/store/authStore'

export function useRole() {
  const { profile } = useAuthStore()
  const role = profile?.role ?? 'caissier'

  const isAdmin = role === 'admin'
  const isGerant = role === 'gerant'
  const isCaissier = role === 'caissier'
  const isMagasinier = role === 'magasinier'
  const isPromoteur = role === 'promoteur'

  // Gérant = mêmes droits opérationnels qu'Admin, sauf équipe et abonnement
  const isAdminLike = isAdmin || isGerant

  // Tableau de bord
  const canViewDashboard = true

  // Produits
  const canViewProducts = true
  const canManageProducts = isAdminLike || isMagasinier

  // Stock — lecture pour le promoteur, gestion réservée aux autres rôles habituels
  const canViewStock = isAdminLike || isMagasinier || isPromoteur
  const canManageStock = isAdminLike || isMagasinier

  // Ventes — lecture pour le promoteur, actions réservées aux autres rôles habituels
  const canViewSales = isAdminLike || isCaissier || isPromoteur
  const canManageSales = isAdminLike || isCaissier
  const canCreateSale = isAdminLike || isCaissier
  const canCancelSale = isAdminLike || isCaissier
  const canApplyDiscount = isAdminLike || isCaissier
  const canExportSale = isAdminLike || isCaissier

  // Clients
  const canViewClients = isAdminLike || isCaissier || isPromoteur
  const canManageClients = isAdminLike || isCaissier

  // Fournisseurs
  const canViewFournisseurs = isAdminLike || isCaissier || isPromoteur
  const canManageFournisseurs = isAdminLike || isCaissier

  // Achats fournisseurs
  const canManageAchats = isAdminLike || isCaissier

  // Dépenses — lecture pour le promoteur, gestion réservée aux autres rôles habituels
  const canViewExpenses = isAdminLike || isCaissier || isPromoteur
  const canManageExpenses = isAdminLike || isCaissier

  // Journal
  const canViewJournal = isAdminLike || isCaissier || isPromoteur

  // Statistiques
  const canViewStats = isAdminLike || isPromoteur

  // Équipe — réservé à Admin uniquement
  const canManageTeam = isAdmin

  // Abonnement — réservé à Admin uniquement
  const canManageSubscription = isAdmin

  // Export PDF
  const canExportPDFRole = isAdminLike || isCaissier

  return {
    role,
    isAdmin,
    isGerant,
    isCaissier,
    isMagasinier,
    isPromoteur,
    canViewDashboard,
    canViewProducts,
    canManageProducts,
    canViewStock,
    canManageStock,
    canViewSales,
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
    canViewExpenses,
    canManageExpenses,
    canViewJournal,
    canViewStats,
    canManageTeam,
    canManageSubscription,
    canExportPDFRole,
  }
}
