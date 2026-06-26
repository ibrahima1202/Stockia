-- ============================================================
-- QUINCAILLERIE PRO — Schéma PostgreSQL Supabase
-- Phase 1 MVP
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: profiles (liée à auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'caissier')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: categories
-- ============================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: products
-- ============================================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stock_current INTEGER NOT NULL DEFAULT 0,
  stock_minimum INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: stock_movements
-- ============================================================
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entree', 'sortie')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT,
  reference TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: sales
-- ============================================================
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL UNIQUE,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'especes' CHECK (payment_method IN ('especes', 'mobile_money', 'carte')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: sale_items
-- ============================================================
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: expenses
-- ============================================================
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('transport', 'loyer', 'divers')),
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: journal_entries (Livre Journal)
-- ============================================================
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT NOT NULL,
  label TEXT NOT NULL,
  debit NUMERIC(12, 2) DEFAULT 0,   -- Entrée de fonds
  credit NUMERIC(12, 2) DEFAULT 0,  -- Sortie de fonds
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  source_type TEXT CHECK (source_type IN ('vente', 'depense', 'manuel')),
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES pour performance
-- ============================================================
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_reference ON public.products(reference);
CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON public.stock_movements(created_at);
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON public.sale_items(product_id);
CREATE INDEX idx_sales_created_at ON public.sales(created_at);
CREATE INDEX idx_journal_entry_date ON public.journal_entries(entry_date);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);

-- ============================================================
-- FONCTION: Mise à jour automatique de updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_products
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- FONCTION: Création du profil après inscription
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'caissier')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FONCTION: Calcul du solde journal (running balance)
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
  prev_balance NUMERIC(12, 2);
BEGIN
  SELECT COALESCE(balance, 0) INTO prev_balance
  FROM public.journal_entries
  WHERE entry_date <= NEW.entry_date
    AND id != NEW.id
  ORDER BY entry_date DESC, created_at DESC
  LIMIT 1;

  IF prev_balance IS NULL THEN
    prev_balance := 0;
  END IF;

  NEW.balance := prev_balance + NEW.debit - NEW.credit;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_journal_balance
  BEFORE INSERT ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.calculate_journal_balance();

-- ============================================================
-- DONNÉES INITIALES: Catégories par défaut
-- ============================================================
INSERT INTO public.categories (name) VALUES
  ('Visserie & Boulonnerie'),
  ('Outillage à main'),
  ('Outillage électroportatif'),
  ('Quincaillerie de bâtiment'),
  ('Plomberie'),
  ('Électricité'),
  ('Peinture & Enduits'),
  ('Sécurité'),
  ('Divers');
