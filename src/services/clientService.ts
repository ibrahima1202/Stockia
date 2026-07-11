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

    // 2. Règlements
    const { data: reglements } = await supabase
      .from('reglements_clients')
      .select('*')
      .eq('client_id', clientId)
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

    // 3. Prêts (entrées journal avec credit > 0 et label contenant le client)
    const { data: prets } = await supabase
      .from('journal_entries')
      .select('*')
      .like('label', `%Prêt espèces%${clientId}%`)
      .order('entry_date', { ascending: false })

    // Alternative — chercher dans journal par label
    const { data: pretsAlt } = await supabase
      .from('reglements_clients')
      .select('*')
      .eq('client_id', clientId)
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
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

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

    const { data: client, error: cError } = await supabase
      .from('clients')
      .select('solde')
      .eq('id', clientId)
      .single()
    if (cError) throw cError

    const { error: uError } = await supabase
      .from('clients')
      .update({ solde: Math.max(0, client.solde - montant) })
      .eq('id', clientId)
    if (uError) throw uError

    const reference = generateReference('RCL')
    const { error: jError } = await supabase.from('journal_entries').insert({
      entry_date: new Date().toISOString().split('T')[0],
      reference,
      label: `Règlement client`,
      debit: montant,
      credit: 0,
      source_type: 'reglement_client',
      source_id: reglement.id,
      business_id: businessId,
    })
    if (jError) throw jError

    return reglement
  },
}
