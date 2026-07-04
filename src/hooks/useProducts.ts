import { useState, useEffect, useCallback } from 'react'
import { productService } from '@/services/productService'
import type { Product, Category } from '@/types'
import { useToast } from '@/store/toastStore'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const [prods, cats] = await Promise.all([
        productService.getAll(),
        productService.getCategories(),
      ])
      setProducts(prods)
      setCategories(cats)
    } catch {
      toast.error('Erreur', 'Impossible de charger les produits')
    } finally {
      setIsLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
