import { supabase } from '@/lib/supabase'
import type { Client, ReglementClient, PaymentMethod } from '@/types'
import { generateReference } from '@/lib/utils'
import { getBusinessId } from '@/lib/business'

export interface ClientHistoriqueEntry {
  id: string
  date: string
  type: 'vente' | 'reglement' | 'pret'
  label: string
  montant: number
  solde_after?: number
  reference?: string
  notes?: string
}

export const clientService = {
  async getAll(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name')
    if (error) throw error
    return data
  },

  async getById(id: string): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(
    client: { name: string; phone?: string; address?: string; notes?: string },
    userId: string
  ): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...client, solde: 0, created_by: userId, business_id: getBusinessId() })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(
    id: string,
    updates: { name?: string; phone?: string; address?: string; notes?: string }
  ): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) throw error
  },

  async getReglements(clientId: string): Promise<ReglementClient[]> {
    const { data, error } = await supabase
      .from('reglements_clients')
      .select('*')
      .eq('client_id', clientId)
      .order('reglement_date', { ascending: false })
    if (error) throw error
    return data
  },

  async getHistorique(clientId: string): Promise<ClientHistoriqueEntry[]> {
    const entries: ClientHistoriqueEntry[] = []

    // 1. Ventes à crédit ou partielles
    const { data: sales } = await supabase
      .from('sales')
      .select('id, reference, created_at, total_amount, montant_paye, statut, notes, sale_items(product:products(name))')
      .eq('client_id', clientId)
      .in('statut', ['credit', 'partiel'])
      .order('created_at', { ascending: false })

    for (const sale of sales || []) {
      const productNames = (sale.sale_items || [])
        .map((i: any) => i.product?.name)
        .filter(Boolean)
        .join(', ')
      const montantDu = sale.total_amount - (sale.montant_paye ?? 0)
      entries.push({
        id: sale.id,
        date: sale.created_at,
        type: 'vente',
        label: productNames || 'Vente',
        montant: montantDu,
        reference: sale.reference,
        notes: sale.notes ?? undefined,
      })
    }

    // 2. Règlements réels uniquement (sale_id IS NULL — exclut les lignes
    // de traçage "Crédit vente" créées automatiquement par saleService.create,
    // qui ne sont PAS de vrais paiements reçus et ne doivent pas apparaître ici)
    const { data: reglements } = await supabase
      .from('reglements_clients')
      .select('*')
      .eq('client_id', clientId)
      .is('sale_id', null)
      .gt('montant', 0)
      .order('reglement_date', { ascending: false })

    for (const reg of reglements || []) {
      entries.push({
        id: reg.id,
        date: reg.reglement_date,
        type: 'reglement',
        label: reg.notes || 'Règlement',
        montant: reg.montant,
        notes: reg.notes ?? undefined,
      })
    }

    // 3. Prêts (également sale_id IS NULL par construction)
    const { data: pretsAlt } = await supabase
      .from('reglements_clients')
      .select('*')
      .eq('client_id', clientId)
      .is('sale_id', null)
      .lt('montant', 0)
      .order('reglement_date', { ascending: false })

    for (const pret of pretsAlt || []) {
      entries.push({
        id: pret.id,
        date: pret.reglement_date,
        type: 'pret',
        label: pret.notes || 'Prêt espèces',
        montant: Math.abs(pret.montant),
        notes: pret.notes ?? undefined,
      })
    }

    // Trier par date décroissante
    entries.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      if (dateB !== dateA) return dateB - dateA
      const order: Record<string, number> = { reglement: 0, pret: 1, vente: 2 }
      return (order[a.type] ?? 0) - (order[b.type] ?? 0)
    })

    return entries
  },

  async addReglement(
    clientId: string,
    montant: number,
    paymentMethod: PaymentMethod,
    notes: string,
    saleId: string | null,
    userId: string
  ): Promise<ReglementClient> {
    const businessId = getBusinessId()

    // 1. Enregistrer le règlement
    const { data: reglement, error: rError } = await supabase
      .from('reglements_clients')
      .insert({
        client_id: clientId,
        sale_id: saleId,
        montant,
        payment_method: paymentMethod,
        notes,
        reglement_date: new Date().toISOString().split('T')[0],
        created_by: userId,
        business_id: businessId,
      })
      .select()
      .single()
    if (rError) throw rError

    // 2. Récupérer le client pour son nom et son solde
    const { data: clientData, error: cError } = await supabase
      .from('clients')
      .select('name, solde')
      .eq('id', clientId)
      .single()
    if (cError) throw cError

    // 3. Mettre à jour le solde
    const { error: uError } = await supabase
      .from('clients')
      .update({ solde: Math.max(0, clientData.solde - montant) })
      .eq('id', clientId)
    if (uError) throw uError

    // 4. Entrée journal avec le nom du client, liée par source_id
    const reference = generateReference('RCL')
    const { error: jError } = await supabase.from('journal_entries').insert({
      entry_date: new Date().toISOString().split('T')[0],
      reference,
      label: `Règlement — ${clientData.name}${notes ? ` (${notes})` : ''}`,
      debit: montant,
      credit: 0,
      source_type: 'reglement_client',
      source_id: reglement.id,
      business_id: businessId,
    })
    if (jError) throw jError

    return reglement
  },

  async addPret(
    clientId: string,
    clientName: string,
    montant: number,
    notes: string,
    userId: string
  ): Promise<ReglementClient> {
    const businessId = getBusinessId()
    const reference = generateReference('PRE')
    const today = new Date().toISOString().split('T')[0]

    // 1. Enregistrer le prêt comme un règlement à montant négatif
    const { data: pret, error: rError } = await supabase
      .from('reglements_clients')
      .insert({
        client_id: clientId,
        sale_id: null,
        montant: -montant,
        payment_method: 'especes',
        notes: `Prêt espèces — ${reference}${notes ? ` — ${notes}` : ''}`,
        reglement_date: today,
        created_by: userId,
        business_id: businessId,
      })
      .select()
      .single()
    if (rError) throw rError

    // 2. Mettre à jour le solde du client
    const { data: clientData, error: cError } = await supabase
      .from('clients')
      .select('solde')
      .eq('id', clientId)
      .single()
    if (cError) throw cError

    const { error: uError } = await supabase
      .from('clients')
      .update({ solde: clientData.solde + montant })
      .eq('id', clientId)
    if (uError) throw uError

    // 3. Entrée journal liée par source_id (permet suppression/mise à jour propre)
    const { error: jError } = await supabase.from('journal_entries').insert({
      entry_date: today,
      reference,
      label: `Prêt espèces — ${clientName}${notes ? ` (${notes})` : ''}`,
      debit: 0,
      credit: montant,
      source_type: 'pret_client',
      source_id: pret.id,
      business_id: businessId,
    })
    if (jError) throw jError

    return pret
  },

  /**
   * Supprime un règlement ou un prêt (jamais une vente — celles-ci se gèrent
   * depuis la page Ventes pour rester synchronisées avec le stock).
   * Recalcule le solde client et supprime l'écriture journal liée.
   */
  async deleteOperation(
    entryId: string,
    entryType: 'reglement' | 'pret',
    clientId: string
  ): Promise<void> {
    // 1. Récupérer la ligne réelle pour connaître le montant signé exact
    const { data: row, error: fetchError } = await supabase
      .from('reglements_clients')
      .select('montant')
      .eq('id', entryId)
      .single()
    if (fetchError) throw fetchError

    // 2. Recalculer le solde client (annule l'effet initial de la ligne)
    const { data: clientData, error: cError } = await supabase
      .from('clients')
      .select('solde')
      .eq('id', clientId)
      .single()
    if (cError) throw cError

    const newSolde = Math.max(0, clientData.solde + row.montant)
    const { error: uError } = await supabase
      .from('clients')
      .update({ solde: newSolde })
      .eq('id', clientId)
    if (uError) throw uError

    // 3. Supprimer l'écriture journal liée (source_id = id de la ligne)
    const sourceType = entryType === 'reglement' ? 'reglement_client' : 'pret_client'
    await supabase
      .from('journal_entries')
      .delete()
      .eq('source_type', sourceType)
      .eq('source_id', entryId)

    // 4. Supprimer la ligne règlement/prêt
    const { error: dError } = await supabase
      .from('reglements_clients')
      .delete()
      .eq('id', entryId)
    if (dError) throw dError
  },

  /**
   * Met à jour le montant et/ou les notes d'un règlement ou d'un prêt.
   * Recalcule le solde client par delta et synchronise l'écriture journal liée.
   */
  async updateOperation(
    entryId: string,
    entryType: 'reglement' | 'pret',
    clientId: string,
    clientName: string,
    newMontant: number,
    newNotes: string
  ): Promise<void> {
    const { data: row, error: fetchError } = await supabase
      .from('reglements_clients')
      .select('montant')
      .eq('id', entryId)
      .single()
    if (fetchError) throw fetchError

    const oldSigned = row.montant
    const newSigned = entryType === 'reglement' ? newMontant : -newMontant

    // 1. Ajuster le solde client par le delta entre ancien et nouveau montant
    const { data: clientData, error: cError } = await supabase
      .from('clients')
      .select('solde')
      .eq('id', clientId)
      .single()
    if (cError) throw cError

    const delta = newSigned - oldSigned
    const newSolde = Math.max(0, clientData.solde - delta)
    const { error: uError } = await supabase
      .from('clients')
      .update({ solde: newSolde })
      .eq('id', clientId)
    if (uError) throw uError

    // 2. Mettre à jour la ligne règlement/prêt
    const { error: rError } = await supabase
      .from('reglements_clients')
      .update({ montant: newSigned, notes: newNotes })
      .eq('id', entryId)
    if (rError) throw rError

    // 3. Synchroniser l'écriture journal liée
    const sourceType = entryType === 'reglement' ? 'reglement_client' : 'pret_client'
    const label = entryType === 'reglement'
      ? `Règlement — ${clientName}${newNotes ? ` (${newNotes})` : ''}`
      : `Prêt espèces — ${clientName}${newNotes ? ` (${newNotes})` : ''}`

    await supabase
      .from('journal_entries')
      .update({
        debit: entryType === 'reglement' ? newMontant : 0,
        credit: entryType === 'pret' ? newMontant : 0,
        label,
      })
      .eq('source_type', sourceType)
      .eq('source_id', entryId)
  },
}
