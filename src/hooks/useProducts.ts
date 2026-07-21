import { useState, useEffect, useCallback } from 'react'
import { productService } from '@/services/productService'
import { db, type CachedProduct } from '@/lib/db'
import { getBusinessId } from '@/lib/business'
import type { Product, Category } from '@/types'
import { useToast } from '@/store/toastStore'

// Convertit un produit Supabase en entrée de cache local (Étape 1 — lecture seule hors ligne)
function toCachedProduct(product: Product, businessId: string): CachedProduct {
  return {
    id: product.id,
    business_id: businessId,
    name: product.name,
    reference: product.reference,
    selling_price: product.selling_price,
    purchase_price: product.purchase_price,
    stock_current: product.stock_current,
    stock_minimum: product.stock_minimum,
    base_unit: product.base_unit ?? null,
    category_id: product.category_id ?? null,
    is_active: product.is_active,
    updated_at: product.updated_at,
    cached_at: Date.now(),
  }
}

// Reconstruit un objet compatible Product à partir du cache (hors ligne)
// Note : certains champs relationnels (ex: category complet) ne sont pas disponibles hors ligne
function fromCachedProduct(cached: CachedProduct): Product {
  return {
    id: cached.id,
    name: cached.name,
    reference: cached.reference,
    category_id: cached.category_id,
    purchase_price: cached.purchase_price,
    selling_price: cached.selling_price,
    stock_current: cached.stock_current,
    stock_minimum: cached.stock_minimum,
    is_active: cached.is_active,
    base_unit: cached.base_unit ?? undefined,
    created_at: cached.updated_at,
    updated_at: cached.updated_at,
    category: undefined,
  }
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOfflineData, setIsOfflineData] = useState(false)
  const toast = useToast()

  const loadFromCache = useCallback(async (): Promise<boolean> => {
    let businessId: string
    try {
      businessId = getBusinessId()
    } catch {
      return false
    }
    const cached = await db.products.where('business_id').equals(businessId).toArray()
    if (cached.length > 0) {
      setProducts(cached.map(fromCachedProduct).sort((a, b) => a.name.localeCompare(b.name)))
      setIsOfflineData(true)
      return true
    }
    return false
  }, [])

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const [prods, cats] = await Promise.all([
        productService.getAll(),
        productService.getCategories(),
      ])
      setProducts(prods)
      setCategories(cats)
      setIsOfflineData(false)

      // Mise en cache silencieuse pour consultation hors ligne (Étape 1)
      try {
        const businessId = getBusinessId()
        const cacheEntries = prods.map((p) => toCachedProduct(p, businessId))
        await db.products.bulkPut(cacheEntries)
      } catch {
        // Pas de business_id disponible ou échec d'écriture cache — non bloquant
      }
    } catch {
      // Échec réseau probable — on tente de servir les données en cache local
      const hasCachedData = await loadFromCache()
      if (!hasCachedData) {
        toast.error('Erreur', 'Impossible de charger les produits')
      }
    } finally {
      setIsLoading(false)
    }
  }, [loadFromCache]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const createProduct = async (
    data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'>
  ) => {
    const product = await productService.create(data)
    setProducts((prev) => [...prev, product].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success('Produit créé', product.name)
    return product
  }

  const updateProduct = async (
    id: string,
    data: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'>>
  ) => {
    const product = await productService.update(id, data)
    setProducts((prev) => prev.map((p) => (p.id === id ? product : p)))
    toast.success('Produit mis à jour', product.name)
    return product
  }

  const deleteProduct = async (id: string) => {
    await productService.delete(id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
    toast.success('Produit désactivé')
  }

  const createCategory = async (name: string): Promise<Category> => {
    const category = await productService.createCategory(name)
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success('Catégorie créée', category.name)
    return category
  }

  return {
    products,
    categories,
    isLoading,
    isOfflineData,
    reload: load,
    createProduct,
    updateProduct,
    deleteProduct,
    createCategory,
  }
}

// Hook séparé pour les catégories uniquement
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()
  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const cats = await productService.getCategories()
      setCategories(cats)
    } catch {
    } finally {
      setIsLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])
  const createCategory = async (name: string): Promise<Category> => {
    const category = await productService.createCategory(name)
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success('Catégorie créée', category.name)
    return category
  }
  return { categories, isLoading, reload: load, createCategory }
}
