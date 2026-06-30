import { useState } from 'react'
import { Users, Shield, ShieldOff, UserCheck, UserX, Plus, Eye, EyeOff } from 'lucide-react'
import { LoadingScreen, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, EmptyState, Card } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { useTeam } from '@/hooks/useTeam'
import { useAuthStore } from '@/store/authStore'
import { useSubscription } from '@/hooks/useSubscription'
import { useToast } from '@/store/toastStore'

export default function TeamPage() {
  const { members, isLoading, updateRole, toggleActive, createMember } = useTeam()
  const { profile: currentProfile } = useAuthStore()
  const { subscription } = useSubscription()
  const toast = useToast()

  const activeMembers = members.filter((m) => m.is_active !== false)
  const maxUsers = subscription?.plan?.max_users
  const limitReached = maxUsers !== null && maxUsers !== undefined && activeMembers.length >= maxUsers

  // Modal création membre
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '', email: '', password: '', role: 'caissier' as 'admin' | 'caissier'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'caissier' : 'admin'
    await updateRole(userId, newRole as 'admin' | 'caissier')
  }

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    await toggleActive(userId, !isActive)
  }

  const openCreate = () => {
    if (limitReached) {
      toast.error('Limite atteinte', `Votre plan permet ${maxUsers} utilisateur(s) maximum. Passez à un plan supérieur pour en ajouter d'autres.`)
      return
    }
    setFormData({ fullName: '', email: '', password: '', role: 'caissier' })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password) {
      toast.error('Erreur', 'Tous les champs sont obligatoires')
      return
    }
    if (formData.password.length < 6) {
      toast.error('Erreur', 'Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    setFormSubmitting(true)
    try {
      await createMember(formData)
      setShowForm(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création'
      toast.error('Erreur', msg)
    } finally {
      setFormSubmitting(false)
    }
  }

  if (isLoading) return <LoadingScreen text="Chargement de l'équipe..." />

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mon équipe</h1>
          <p className="text-sm text-muted-foreground">
            {activeMembers.length} membre(s) actif(s)
            {maxUsers ? ` sur ${maxUsers} max` : ''}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Ajouter un membre
        </Button>
      </div>

      {limitReached && (
        <Card className="p-4 bg-orange-50 border-orange-200">
          <p className="text-sm text-orange-700">
            ⚠️ Vous avez atteint la limite de {maxUsers} utilisateur(s) de votre plan. Passez à un plan supérieur pour ajouter plus de membres.
          </p>
        </Card>
      )}

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {members.length === 0 ? (
          <EmptyState icon={Users} title="Aucun membre" description="Votre équipe apparaîtra ici" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isMe = member.id === currentProfile?.id
                const isActive = member.is_active !== false
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <p className="text-sm font-medium">
                        {member.full_name}
                        {isMe && <span className="text-xs text-muted-foreground ml-1">(vous)</span>}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.role === 'admin' ? 'info' : 'success'}>
                        {member.role === 'admin' ? 'Admin' : 'Caissier'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isActive ? 'success' : 'danger'}>
                        {isActive ? 'Actif' : 'Désactivé'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!isMe && (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleRoleToggle(member.id, member.role)}
                            className="p-1.5 hover:bg-blue-50 rounded text-blue-500"
                            title={member.role === 'admin' ? 'Rétrograder en caissier' : 'Promouvoir admin'}
                          >
                            {member.role === 'admin' ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => handleToggleActive(member.id, isActive)}
                            className={`p-1.5 rounded ${isActive ? 'hover:bg-red-50 text-red-400' : 'hover:bg-green-50 text-green-500'}`}
                            title={isActive ? 'Désactiver' : 'Réactiver'}
                          >
                            {isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal création membre */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-lg">Nouveau membre</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nom complet *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Nom du membre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="email@exemple.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mot de passe *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Min. 6 caractères"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Communiquez ces identifiants au membre pour qu'il puisse se connecter
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rôle *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'caissier' })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="caissier">Caissier</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button className="flex-1" onClick={handleSubmit} isLoading={formSubmitting}>
                Créer le compte
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
