# Quincaillerie Pro — Guide de déploiement

## Prérequis

- Node.js 20+
- Compte [Supabase](https://supabase.com)
- Compte [Netlify](https://netlify.com)

---

## 1. Configurer Supabase

### 1.1 Créer un projet

1. Connectez-vous sur [app.supabase.com](https://app.supabase.com)
2. Cliquez **New Project**
3. Notez l'**URL** et la **clé anon** (Settings → API)

### 1.2 Exécuter le schéma SQL

Dans l'éditeur SQL de Supabase (`SQL Editor`), exécutez dans l'ordre :

```
supabase/schema.sql
supabase/rls_policies.sql
```

### 1.3 Créer le premier utilisateur Admin

Dans l'éditeur SQL, exécutez :

```sql
-- Créer le compte admin via Auth
-- Faites-le depuis Authentication > Users > Invite User
-- Email : admin@votrequincaillerie.com
-- Puis mettez à jour le profil :

UPDATE public.profiles
SET full_name = 'Administrateur', role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@votrequincaillerie.com'
);
```

Ou utilisez le dashboard Supabase → **Authentication → Users → Add user**.

### 1.4 Créer un utilisateur Caissier (optionnel)

```sql
UPDATE public.profiles
SET full_name = 'Caissier Principal', role = 'caissier'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'caissier@votrequincaillerie.com'
);
```

---

## 2. Configuration locale

```bash
# Cloner ou dézipper le projet
cd quincaillerie-pro

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.example .env

# Remplir le fichier .env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### Lancer en développement

```bash
npm run dev
```

Ouvrez [http://localhost:5173](http://localhost:5173)

---

## 3. Build de production

```bash
npm run build
```

Le dossier `dist/` est généré.

---

## 4. Déploiement Netlify

### Option A — Drag & Drop (rapide)

1. Exécutez `npm run build`
2. Allez sur [app.netlify.com](https://app.netlify.com)
3. Glissez le dossier `dist/` sur la page

### Option B — CI/CD GitHub (recommandé)

1. Pushez le projet sur GitHub
2. Sur Netlify → **Add new site → Import from Git**
3. Sélectionnez votre repo
4. Configurez :
   - **Build command** : `npm run build`
   - **Publish directory** : `dist`
5. Ajoutez les variables d'environnement :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Variables d'environnement Netlify

Dans **Site settings → Environment variables** :

| Variable | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` |

---

## 5. Structure du projet

```
src/
├── components/
│   ├── auth/          # ProtectedRoute
│   ├── layout/        # Sidebar, AppLayout
│   └── ui/            # Button, Input, Select, Card, Table, Modal...
├── hooks/             # useAuth, useProducts, useStocks, useSales, useExpenses, useJournal
├── pages/             # LoginPage, DashboardPage, ProductsPage, StocksPage, SalesPage, JournalPage, ExpensesPage
├── services/          # authService, productService, stockService, saleService, expenseService, journalService, dashboardService
├── store/             # authStore (Zustand), toastStore
├── types/             # Types TypeScript
└── lib/               # supabase.ts, utils.ts
supabase/
├── schema.sql         # Schéma complet PostgreSQL
└── rls_policies.sql   # Politiques RLS
```

---

## 6. Rôles et permissions

| Action | Admin | Caissier |
|---|---|---|
| Voir le dashboard | ✅ | ✅ |
| Voir les produits | ✅ | ✅ |
| Créer/modifier produits | ✅ | ❌ |
| Entrées/sorties de stock | ✅ | ✅ |
| Créer des ventes | ✅ | ✅ |
| Voir le journal | ✅ | ✅ |
| Gérer les dépenses | ✅ | ❌ |

---

## 7. Flux automatiques

- **Vente créée** → déduction automatique du stock + écriture dans le journal (débit)
- **Dépense créée** → écriture automatique dans le journal (crédit)
- **Mouvement de stock** → mise à jour du stock produit en temps réel

---

## 8. Notes importantes

- Les mots de passe sont gérés par Supabase Auth (bcrypt)
- Les RLS empêchent tout accès non authentifié aux données
- La colonne `balance` du journal est calculée automatiquement par trigger PostgreSQL
- La devise est le Franc CFA (XOF)

---

## 9. Phases suivantes (hors scope Phase 1)

- Gestion des clients
- Gestion des fournisseurs
- Gestion des employés
- Gestion des achats / bons de commande
- Rapports avancés et exports PDF/Excel
