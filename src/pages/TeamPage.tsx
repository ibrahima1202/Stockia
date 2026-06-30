import { Users, Shield, ShieldOff, UserCheck, UserX } from 'lucide-react'
import { LoadingScreen, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, EmptyState, Card } from '@/components/ui/index'
import { useTeam } from '@/hooks/useTeam'
import { useAuthStore } from '@/store/authStore'
import { useSubscription } from '@/hooks/useSubscription'

export default function TeamPage() {
  const { members, isLoading, updateRole, toggleActive } = useTeam()
  const { profile: currentProfile } = useAuthStore()
  const { subscription } = useSubscription()

  const activeMembers = members.filter((m) => m.is_active !== false)
  const maxUsers = subscription?.plan?.max_users

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'caissier' : 'admin'
    await updateRole(userId, newRole as 'admin' | 'caissier')
  }

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    await toggleActive(userId, !isActive)
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
      </div>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-700">
          ℹ️ Pour ajouter un nouveau membre, contactez le support STOCKAM avec le nom, l'email et le rôle souhaité.
        </p>
      </Card>

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
    </div>
  )
}
