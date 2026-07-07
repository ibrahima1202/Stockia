import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Sale, JournalEntry, Product } from '@/types'

const STOCKAM_COLOR = [249, 115, 22] as [number, number, number]
const DARK_COLOR = [15, 23, 42] as [number, number, number]

function formatXOF(amount: number): string {
  return amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function addHeader(doc: jsPDF, businessName: string, title: string) {
  doc.setFillColor(...DARK_COLOR)
  doc.rect(0, 0, 210, 28, 'F')

  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('STOCK', 14, 17)

  doc.setTextColor(...STOCKAM_COLOR)
  doc.text('AM', 36, 17)

  doc.setFontSize(9)
  doc.setTextColor(148, 163, 184)
  doc.setFont('helvetica', 'normal')
  doc.text(businessName, 14, 23)

  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 210 - 14, 17, { align: 'right' })

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.setFont('helvetica', 'normal')
  doc.text(
    format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr }),
    210 - 14, 23,
    { align: 'right' }
  )
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Page ${i} / ${pageCount} — Généré par STOCKAM`,
      105, 290,
      { align: 'center' }
    )
  }
}

export const pdfService = {
  exportSaleReceipt(sale: Sale, businessName: string): void {
    const doc = new jsPDF()
    addHeader(doc, businessName, 'REÇU DE VENTE')

    let y = 38
    doc.setFontSize(10)
    doc.setTextColor(...DARK_COLOR)

    doc.setFont('helvetica', 'bold')
    doc.text('Référence :', 14, y)
    doc.setFont('helvetica', 'normal')
    doc.text(sale.reference, 55, y)
    y += 7

    doc.setFont('helvetica', 'bold')
    doc.text('Date :', 14, y)
    doc.setFont('helvetica', 'normal')
    doc.text(format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }), 55, y)
    y += 7

    if (sale.client) {
      doc.setFont('helvetica', 'bold')
      doc.text('Client :', 14, y)
      doc.setFont('helvetica', 'normal')
      doc.text(sale.client.name, 55, y)
      y += 7
    }

    doc.setFont('helvetica', 'bold')
    doc.text('Statut :', 14, y)
    doc.setFont('helvetica', 'normal')
    const statutLabel = sale.statut === 'paye' ? 'Payé' : sale.statut === 'credit' ? 'À crédit' : 'Partiel'
    doc.text(statutLabel, 55, y)
    y += 10

    // Tableau articles avec bordures
    autoTable(doc, {
      startY: y,
      head: [['Désignation', 'Qté', 'Remise', 'Prix unit.', 'Total']],
      body: (sale.sale_items || []).map((item) => [
        item.product?.name ?? '—',
        item.quantity.toString(),
        (item.discount_amount ?? 0) > 0 ? `-${formatXOF(item.discount_amount!)} XOF` : '—',
        `${formatXOF(item.unit_price)} XOF`,
        `${formatXOF(item.total_price)} XOF`,
      ]),
      headStyles: {
        fillColor: DARK_COLOR,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        lineWidth: 0.3,
        lineColor: [255, 255, 255],
      },
      bodyStyles: {
        lineWidth: 0.3,
        lineColor: [226, 232, 240],
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { halign: 'center' },
        2: { halign: 'right', textColor: [249, 115, 22] },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' },
      },
      tableLineWidth: 0.3,
      tableLineColor: [226, 232, 240],
    })

    let finalY = (doc as any).lastAutoTable.finalY + 6

    // Remise facture
    if ((sale.discount_amount ?? 0) > 0) {
      const subtotal = (sale.total_amount ?? 0) + (sale.discount_amount ?? 0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('Sous-total :', 125, finalY)
      doc.text(`${formatXOF(subtotal)} XOF`, 196, finalY, { align: 'right' })
      finalY += 6

      doc.setTextColor(249, 115, 22)
      doc.text('Remise facture :', 125, finalY)
      doc.text(`-${formatXOF(sale.discount_amount!)} XOF`, 196, finalY, { align: 'right' })
      finalY += 6
    }

    // Total
    doc.setFillColor(249, 250, 251)
    doc.rect(120, finalY - 4, 76, 9, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK_COLOR)
    doc.text('TOTAL :', 125, finalY + 2)
    doc.setTextColor(...STOCKAM_COLOR)
    doc.text(`${formatXOF(sale.total_amount)} XOF`, 196, finalY + 2, { align: 'right' })

    if (sale.statut === 'partiel') {
      finalY += 8
      doc.setFontSize(9)
      doc.setTextColor(239, 68, 68)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Montant payé : ${formatXOF(sale.montant_paye ?? 0)} XOF`,
        196, finalY,
        { align: 'right' }
      )
      finalY += 6
      doc.text(
        `Reste dû : ${formatXOF(sale.total_amount - (sale.montant_paye ?? 0))} XOF`,
        196, finalY,
        { align: 'right' }
      )
    }

    // Merci
    finalY += 12
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.setFont('helvetica', 'italic')
    doc.text('Merci pour votre achat !', 105, finalY, { align: 'center' })

    addFooter(doc)
    doc.save(`recu-${sale.reference}.pdf`)
  },

  exportJournal(entries: JournalEntry[], businessName: string, period?: string): void {
    const doc = new jsPDF()
    addHeader(doc, businessName, 'LIVRE JOURNAL')

    if (period) {
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text(`Période : ${period}`, 14, 35)
    }

    autoTable(doc, {
      startY: period ? 40 : 35,
      head: [['Date', 'Référence', 'Libellé', 'Débit', 'Crédit', 'Solde']],
      body: entries.map((e) => [
        format(new Date(e.entry_date), 'dd/MM/yyyy', { locale: fr }),
        e.reference,
        e.label.length > 35 ? e.label.substring(0, 35) + '...' : e.label,
        e.debit > 0 ? formatXOF(e.debit) : '—',
        e.credit > 0 ? formatXOF(e.credit) : '—',
        formatXOF(e.balance),
      ]),
      headStyles: {
        fillColor: DARK_COLOR,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        lineWidth: 0.3,
        lineColor: [255, 255, 255],
      },
      bodyStyles: {
        lineWidth: 0.3,
        lineColor: [226, 232, 240],
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 8, cellPadding: 4 },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' },
      },
      tableLineWidth: 0.3,
      tableLineColor: [226, 232, 240],
    })

    const totalDebit = entries.reduce((s, e) => s + e.debit, 0)
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0)
    const finalY = (doc as any).lastAutoTable.finalY + 6

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK_COLOR)
    doc.text(`Total débits : ${formatXOF(totalDebit)} XOF`, 14, finalY)
    doc.text(`Total crédits : ${formatXOF(totalCredit)} XOF`, 105, finalY)

    addFooter(doc)
    doc.save(`journal-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  },

  exportStock(products: Product[], businessName: string): void {
    const doc = new jsPDF()
    addHeader(doc, businessName, 'RAPPORT DE STOCK')

    const lowStock = products.filter((p) => p.stock_current <= p.stock_minimum)
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(
      `${products.length} produit(s) — ${lowStock.length} en rupture ou stock faible`,
      14, 35
    )

    autoTable(doc, {
      startY: 40,
      head: [['Référence', 'Produit', 'Catégorie', 'Stock', 'Min.', 'Prix achat', 'Valeur stock']],
      body: products.map((p) => [
        p.reference,
        p.name,
        p.category?.name ?? '—',
        p.stock_current.toString(),
        p.stock_minimum.toString(),
        formatXOF(p.purchase_price),
        formatXOF(p.stock_current * p.purchase_price),
      ]),
      headStyles: {
        fillColor: DARK_COLOR,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        lineWidth: 0.3,
        lineColor: [255, 255, 255],
      },
      bodyStyles: {
        lineWidth: 0.3,
        lineColor: [226, 232, 240],
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 8, cellPadding: 4 },
      columnStyles: {
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold' },
      },
      tableLineWidth: 0.3,
      tableLineColor: [226, 232, 240],
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const product = products[data.row.index]
          if (product && product.stock_current <= product.stock_minimum) {
            data.cell.styles.textColor = [239, 68, 68]
            data.cell.styles.fontStyle = 'bold'
          }
        }
      },
    })

    const totalValue = products.reduce((s, p) => s + p.stock_current * p.purchase_price, 0)
    const finalY = (doc as any).lastAutoTable.finalY + 6
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK_COLOR)
    doc.text('Valeur totale du stock :', 120, finalY)
    doc.setTextColor(...STOCKAM_COLOR)
    doc.text(`${formatXOF(totalValue)} XOF`, 196, finalY, { align: 'right' })

    addFooter(doc)
    doc.save(`stock-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  },
}
