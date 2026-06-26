-- ============================================================
-- QUINCAILLERIE PRO — Politiques RLS Supabase
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: Récupérer le rôle de l'utilisateur courant
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================
-- Lecture: chaque utilisateur voit son propre profil; admin voit tout
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    id = auth.uid() OR public.get_current_user_role() = 'admin'
  );

-- Mise à jour: chaque utilisateur peut modifier son propre profil
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Admin peut modifier tous les profils
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- CATEGORIES
-- ============================================================
-- Tous les utilisateurs authentifiés peuvent lire
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Seul l'admin peut créer/modifier/supprimer
CREATE POLICY "categories_insert_admin" ON public.categories
  FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "categories_update_admin" ON public.categories
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

CREATE POLICY "categories_delete_admin" ON public.categories
  FOR DELETE USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- PRODUCTS
-- ============================================================
-- Tous les utilisateurs authentifiés peuvent lire les produits actifs
CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Seul l'admin peut créer/modifier/supprimer les produits
CREATE POLICY "products_insert_admin" ON public.products
  FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "products_update_admin" ON public.products
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

CREATE POLICY "products_delete_admin" ON public.products
  FOR DELETE USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- STOCK MOVEMENTS
-- ============================================================
-- Tous les utilisateurs authentifiés peuvent lire
CREATE POLICY "stock_movements_select" ON public.stock_movements
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin et caissier peuvent créer des mouvements
CREATE POLICY "stock_movements_insert" ON public.stock_movements
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Seul l'admin peut supprimer
CREATE POLICY "stock_movements_delete_admin" ON public.stock_movements
  FOR DELETE USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- SALES
-- ============================================================
-- Tous les utilisateurs authentifiés peuvent lire les ventes
CREATE POLICY "sales_select" ON public.sales
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Tout utilisateur authentifié peut créer une vente
CREATE POLICY "sales_insert" ON public.sales
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Seul l'admin peut modifier/supprimer une vente
CREATE POLICY "sales_update_admin" ON public.sales
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

CREATE POLICY "sales_delete_admin" ON public.sales
  FOR DELETE USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- SALE ITEMS
-- ============================================================
CREATE POLICY "sale_items_select" ON public.sale_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "sale_items_insert" ON public.sale_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "sale_items_delete_admin" ON public.sale_items
  FOR DELETE USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin uniquement peut gérer les dépenses
CREATE POLICY "expenses_insert_admin" ON public.expenses
  FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "expenses_update_admin" ON public.expenses
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

CREATE POLICY "expenses_delete_admin" ON public.expenses
  FOR DELETE USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- JOURNAL ENTRIES
-- ============================================================
-- Tout utilisateur authentifié peut lire le journal
CREATE POLICY "journal_select" ON public.journal_entries
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insertion automatique via fonctions serveur (SECURITY DEFINER)
CREATE POLICY "journal_insert" ON public.journal_entries
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Seul l'admin peut modifier/supprimer
CREATE POLICY "journal_update_admin" ON public.journal_entries
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

CREATE POLICY "journal_delete_admin" ON public.journal_entries
  FOR DELETE USING (public.get_current_user_role() = 'admin');
