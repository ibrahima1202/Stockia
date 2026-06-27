import { supabase } from '@/lib/supabase'
import type { Client, ReglementClient, PaymentMethod } from '@/types'
import { generateReference } from '@/lib/utils'

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
      .insert({ ...client, solde: 0, created_by: userId })
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

  async addReglement(
    clientId: string,
    montant: number,
    paymentMethod: PaymentMethod,
    notes: string,
    saleId: string | null,
    userId: string
  ): Promise<ReglementClient> {
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
      })
      .select()
      .single()
    if (rError) throw rError

    // 2. Mettre à jour le solde du client
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

    // 3. Entrée journal
    const reference = generateReference('RCL')
    const { error: jError } = await supabase.from('journal_entries').insert({
      entry_date: new Date().toISOString().split('T')[0],
      reference,
      label: `Règlement client`,
      debit: montant,
      credit: 0,
      source_type: 'reglement_client',
      source_id: reglement.id,
    })
    if (jError) throw jError

    return reglement
  },
}
