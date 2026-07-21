import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Building2, User, Phone, MapPin, Check, Eye, EyeOff, Package, ShoppingBag, Search, ChevronDown } from 'lucide-react'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/hooks/useSubscription'


const STEPS = ['Compte', 'Commerce']

// Convertit un code ISO2 (ex: "ML") en emoji drapeau
function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

interface Country {
  name: string
  iso2: string
  dial: string
}

// Mali en premier (par défaut), puis liste alphabétique des autres pays
const COUNTRIES: Country[] = [
  { name: 'Mali', iso2: 'ML', dial: '223' },
  { name: 'Afghanistan', iso2: 'AF', dial: '93' },
  { name: 'Afrique du Sud', iso2: 'ZA', dial: '27' },
  { name: 'Albanie', iso2: 'AL', dial: '355' },
  { name: 'Algérie', iso2: 'DZ', dial: '213' },
  { name: 'Allemagne', iso2: 'DE', dial: '49' },
  { name: 'Andorre', iso2: 'AD', dial: '376' },
  { name: 'Angola', iso2: 'AO', dial: '244' },
  { name: 'Arabie saoudite', iso2: 'SA', dial: '966' },
  { name: 'Argentine', iso2: 'AR', dial: '54' },
  { name: 'Arménie', iso2: 'AM', dial: '374' },
  { name: 'Australie', iso2: 'AU', dial: '61' },
  { name: 'Autriche', iso2: 'AT', dial: '43' },
  { name: 'Azerbaïdjan', iso2: 'AZ', dial: '994' },
  { name: 'Bahamas', iso2: 'BS', dial: '1242' },
  { name: 'Bahreïn', iso2: 'BH', dial: '973' },
  { name: 'Bangladesh', iso2: 'BD', dial: '880' },
  { name: 'Barbade', iso2: 'BB', dial: '1246' },
  { name: 'Belgique', iso2: 'BE', dial: '32' },
  { name: 'Belize', iso2: 'BZ', dial: '501' },
  { name: 'Bénin', iso2: 'BJ', dial: '229' },
  { name: 'Bhoutan', iso2: 'BT', dial: '975' },
  { name: 'Biélorussie', iso2: 'BY', dial: '375' },
  { name: 'Birmanie (Myanmar)', iso2: 'MM', dial: '95' },
  { name: 'Bolivie', iso2: 'BO', dial: '591' },
  { name: 'Bosnie-Herzégovine', iso2: 'BA', dial: '387' },
  { name: 'Botswana', iso2: 'BW', dial: '267' },
  { name: 'Brésil', iso2: 'BR', dial: '55' },
  { name: 'Brunei', iso2: 'BN', dial: '673' },
  { name: 'Bulgarie', iso2: 'BG', dial: '359' },
  { name: 'Burkina Faso', iso2: 'BF', dial: '226' },
  { name: 'Burundi', iso2: 'BI', dial: '257' },
  { name: 'Cambodge', iso2: 'KH', dial: '855' },
  { name: 'Cameroun', iso2: 'CM', dial: '237' },
  { name: 'Canada', iso2: 'CA', dial: '1' },
  { name: 'Cap-Vert', iso2: 'CV', dial: '238' },
  { name: 'Chili', iso2: 'CL', dial: '56' },
  { name: 'Chine', iso2: 'CN', dial: '86' },
  { name: 'Chypre', iso2: 'CY', dial: '357' },
  { name: 'Colombie', iso2: 'CO', dial: '57' },
  { name: 'Comores', iso2: 'KM', dial: '269' },
  { name: 'Congo-Brazzaville', iso2: 'CG', dial: '242' },
  { name: 'Congo-Kinshasa (RDC)', iso2: 'CD', dial: '243' },
  { name: 'Corée du Nord', iso2: 'KP', dial: '850' },
  { name: 'Corée du Sud', iso2: 'KR', dial: '82' },
  { name: 'Costa Rica', iso2: 'CR', dial: '506' },
  { name: "Côte d'Ivoire", iso2: 'CI', dial: '225' },
  { name: 'Croatie', iso2: 'HR', dial: '385' },
  { name: 'Cuba', iso2: 'CU', dial: '53' },
  { name: 'Danemark', iso2: 'DK', dial: '45' },
  { name: 'Djibouti', iso2: 'DJ', dial: '253' },
  { name: 'Dominique', iso2: 'DM', dial: '1767' },
  { name: 'Égypte', iso2: 'EG', dial: '20' },
  { name: 'Émirats arabes unis', iso2: 'AE', dial: '971' },
  { name: 'Équateur', iso2: 'EC', dial: '593' },
  { name: 'Érythrée', iso2: 'ER', dial: '291' },
  { name: 'Espagne', iso2: 'ES', dial: '34' },
  { name: 'Estonie', iso2: 'EE', dial: '372' },
  { name: 'Eswatini', iso2: 'SZ', dial: '268' },
  { name: 'États-Unis', iso2: 'US', dial: '1' },
  { name: 'Éthiopie', iso2: 'ET', dial: '251' },
  { name: 'Fidji', iso2: 'FJ', dial: '679' },
  { name: 'Finlande', iso2: 'FI', dial: '358' },
  { name: 'France', iso2: 'FR', dial: '33' },
  { name: 'Gabon', iso2: 'GA', dial: '241' },
  { name: 'Gambie', iso2: 'GM', dial: '220' },
  { name: 'Géorgie', iso2: 'GE', dial: '995' },
  { name: 'Ghana', iso2: 'GH', dial: '233' },
  { name: 'Grèce', iso2: 'GR', dial: '30' },
  { name: 'Grenade', iso2: 'GD', dial: '1473' },
  { name: 'Guatemala', iso2: 'GT', dial: '502' },
  { name: 'Guinée', iso2: 'GN', dial: '224' },
  { name: 'Guinée-Bissau', iso2: 'GW', dial: '245' },
  { name: 'Guinée équatoriale', iso2: 'GQ', dial: '240' },
  { name: 'Guyana', iso2: 'GY', dial: '592' },
  { name: 'Haïti', iso2: 'HT', dial: '509' },
  { name: 'Honduras', iso2: 'HN', dial: '504' },
  { name: 'Hongrie', iso2: 'HU', dial: '36' },
  { name: 'Inde', iso2: 'IN', dial: '91' },
  { name: 'Indonésie', iso2: 'ID', dial: '62' },
  { name: 'Irak', iso2: 'IQ', dial: '964' },
  { name: 'Iran', iso2: 'IR', dial: '98' },
  { name: 'Irlande', iso2: 'IE', dial: '353' },
  { name: 'Islande', iso2: 'IS', dial: '354' },
  { name: 'Israël', iso2: 'IL', dial: '972' },
  { name: 'Italie', iso2: 'IT', dial: '39' },
  { name: 'Jamaïque', iso2: 'JM', dial: '1876' },
  { name: 'Japon', iso2: 'JP', dial: '81' },
  { name: 'Jordanie', iso2: 'JO', dial: '962' },
  { name: 'Kazakhstan', iso2: 'KZ', dial: '7' },
  { name: 'Kenya', iso2: 'KE', dial: '254' },
  { name: 'Kirghizistan', iso2: 'KG', dial: '996' },
  { name: 'Kiribati', iso2: 'KI', dial: '686' },
  { name: 'Koweït', iso2: 'KW', dial: '965' },
  { name: 'Laos', iso2: 'LA', dial: '856' },
  { name: 'Lesotho', iso2: 'LS', dial: '266' },
  { name: 'Lettonie', iso2: 'LV', dial: '371' },
  { name: 'Liban', iso2: 'LB', dial: '961' },
  { name: 'Liberia', iso2: 'LR', dial: '231' },
  { name: 'Libye', iso2: 'LY', dial: '218' },
  { name: 'Liechtenstein', iso2: 'LI', dial: '423' },
  { name: 'Lituanie', iso2: 'LT', dial: '370' },
  { name: 'Luxembourg', iso2: 'LU', dial: '352' },
  { name: 'Macédoine du Nord', iso2: 'MK', dial: '389' },
  { name: 'Madagascar', iso2: 'MG', dial: '261' },
  { name: 'Malaisie', iso2: 'MY', dial: '60' },
  { name: 'Malawi', iso2: 'MW', dial: '265' },
  { name: 'Maldives', iso2: 'MV', dial: '960' },
  { name: 'Malte', iso2: 'MT', dial: '356' },
  { name: 'Maroc', iso2: 'MA', dial: '212' },
  { name: 'Maurice', iso2: 'MU', dial: '230' },
  { name: 'Mauritanie', iso2: 'MR', dial: '222' },
  { name: 'Mexique', iso2: 'MX', dial: '52' },
  { name: 'Moldavie', iso2: 'MD', dial: '373' },
  { name: 'Monaco', iso2: 'MC', dial: '377' },
  { name: 'Mongolie', iso2: 'MN', dial: '976' },
  { name: 'Monténégro', iso2: 'ME', dial: '382' },
  { name: 'Mozambique', iso2: 'MZ', dial: '258' },
  { name: 'Namibie', iso2: 'NA', dial: '264' },
  { name: 'Népal', iso2: 'NP', dial: '977' },
  { name: 'Nicaragua', iso2: 'NI', dial: '505' },
  { name: 'Niger', iso2: 'NE', dial: '227' },
  { name: 'Nigeria', iso2: 'NG', dial: '234' },
  { name: 'Norvège', iso2: 'NO', dial: '47' },
  { name: 'Nouvelle-Zélande', iso2: 'NZ', dial: '64' },
  { name: 'Oman', iso2: 'OM', dial: '968' },
  { name: 'Ouganda', iso2: 'UG', dial: '256' },
  { name: 'Ouzbékistan', iso2: 'UZ', dial: '998' },
  { name: 'Pakistan', iso2: 'PK', dial: '92' },
  { name: 'Panama', iso2: 'PA', dial: '507' },
  { name: 'Papouasie-Nouvelle-Guinée', iso2: 'PG', dial: '675' },
  { name: 'Paraguay', iso2: 'PY', dial: '595' },
  { name: 'Pays-Bas', iso2: 'NL', dial: '31' },
  { name: 'Pérou', iso2: 'PE', dial: '51' },
  { name: 'Philippines', iso2: 'PH', dial: '63' },
  { name: 'Pologne', iso2: 'PL', dial: '48' },
  { name: 'Portugal', iso2: 'PT', dial: '351' },
  { name: 'Qatar', iso2: 'QA', dial: '974' },
  { name: 'République centrafricaine', iso2: 'CF', dial: '236' },
  { name: 'République dominicaine', iso2: 'DO', dial: '1809' },
  { name: 'République tchèque', iso2: 'CZ', dial: '420' },
  { name: 'Roumanie', iso2: 'RO', dial: '40' },
  { name: 'Royaume-Uni', iso2: 'GB', dial: '44' },
  { name: 'Russie', iso2: 'RU', dial: '7' },
  { name: 'Rwanda', iso2: 'RW', dial: '250' },
  { name: 'Saint-Marin', iso2: 'SM', dial: '378' },
  { name: 'Sao Tomé-et-Principe', iso2: 'ST', dial: '239' },
  { name: 'Sénégal', iso2: 'SN', dial: '221' },
  { name: 'Serbie', iso2: 'RS', dial: '381' },
  { name: 'Seychelles', iso2: 'SC', dial: '248' },
  { name: 'Sierra Leone', iso2: 'SL', dial: '232' },
  { name: 'Singapour', iso2: 'SG', dial: '65' },
  { name: 'Slovaquie', iso2: 'SK', dial: '421' },
  { name: 'Slovénie', iso2: 'SI', dial: '386' },
  { name: 'Somalie', iso2: 'SO', dial: '252' },
  { name: 'Soudan', iso2: 'SD', dial: '249' },
  { name: 'Soudan du Sud', iso2: 'SS', dial: '211' },
  { name: 'Sri Lanka', iso2: 'LK', dial: '94' },
  { name: 'Suède', iso2: 'SE', dial: '46' },
  { name: 'Suisse', iso2: 'CH', dial: '41' },
  { name: 'Suriname', iso2: 'SR', dial: '597' },
  { name: 'Syrie', iso2: 'SY', dial: '963' },
  { name: 'Tadjikistan', iso2: 'TJ', dial: '992' },
  { name: 'Tanzanie', iso2: 'TZ', dial: '255' },
  { name: 'Tchad', iso2: 'TD', dial: '235' },
  { name: 'Thaïlande', iso2: 'TH', dial: '66' },
  { name: 'Timor oriental', iso2: 'TL', dial: '670' },
  { name: 'Togo', iso2: 'TG', dial: '228' },
  { name: 'Tonga', iso2: 'TO', dial: '676' },
  { name: 'Trinité-et-Tobago', iso2: 'TT', dial: '1868' },
  { name: 'Tunisie', iso2: 'TN', dial: '216' },
  { name: 'Turkménistan', iso2: 'TM', dial: '993' },
  { name: 'Turquie', iso2: 'TR', dial: '90' },
  { name: 'Ukraine', iso2: 'UA', dial: '380' },
  { name: 'Uruguay', iso2: 'UY', dial: '598' },
  { name: 'Vanuatu', iso2: 'VU', dial: '678' },
  { name: 'Vatican', iso2: 'VA', dial: '379' },
  { name: 'Venezuela', iso2: 'VE', dial: '58' },
  { name: 'Vietnam', iso2: 'VN', dial: '84' },
  { name: 'Yémen', iso2: 'YE', dial: '967' },
  { name: 'Zambie', iso2: 'ZM', dial: '260' },
  { name: 'Zimbabwe', iso2: 'ZW', dial: '263' },
]

function CountryCodeSelect({
  value,
  onChange,
}: {
  value: Country
  onChange: (c: Country) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial.includes(search.replace('+', ''))
  )

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 flex items-center gap-1 rounded-md border border-input bg-background px-2 text-sm hover:bg-slate-50"
      >
        <span>{flagEmoji(value.iso2)}</span>
        <span className="font-medium">+{value.dial}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-64 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden">
          <div className="p-2 border-b relative">
            <Search className="absolute left-4 top-4.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un pays..."
              autoFocus
              className="w-full h-8 rounded border border-input bg-background pl-7 pr-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-muted-foreground">Aucun pays trouvé</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.iso2}
                  type="button"
                  onClick={() => {
                    onChange(c)
                    setOpen(false)
                    setSearch('')
                  }}
                  className={`w-full flex items-center gap-2 text-left px-3 py-2 text-xs hover:bg-orange-50 transition-colors ${
                    c.iso2 === value.iso2 ? 'bg-orange-50 font-medium' : ''
                  }`}
                >
                  <span>{flagEmoji(c.iso2)}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-slate-400">+{c.dial}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const phoneToEmail = (fullPhone: string): string => {
  const digits = fullPhone.replace(/\D/g, '')
  return `${digits}@stockam.app`
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { plans, createBusiness } = useSubscription()

  const [step, setStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Étape 1 — Compte
  const [fullName, setFullName] = useState('')
  const [country, setCountry] = useState<Country>(COUNTRIES[0]) // Mali par défaut
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Étape 2 — Commerce
  const [businessName, setBusinessName] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessCity, setBusinessCity] = useState('')
  const [commerceType, setCommerceType] = useState<'detail' | 'gros_detail'>('detail')

  // Numéro complet avec indicatif (ex: "22379740816")
  const fullPhone = `${country.dial}${phone.replace(/\D/g, '')}`

  const handleStep1 = () => {
    if (!fullName.trim()) {
      setError('Le nom complet est obligatoire')
      return
    }
    if (!phone.trim()) {
      setError('Veuillez saisir un numéro de téléphone')
      return
    }
    // Validation stricte du format selon le pays choisi (via libphonenumber-js)
    const isValid = isValidPhoneNumber(`+${fullPhone}`, country.iso2 as any)
    if (!isValid) {
      setError(`Ce numéro ne correspond pas au format attendu pour ${country.name}`)
      return
    }
    if (!password) {
      setError('Le mot de passe est obligatoire')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    setError('')
    setStep(1)
  }

  const handleStep2 = async () => {
    if (!businessName) {
      setError('Le nom du commerce est obligatoire')
      return
    }
    setError('')
    setIsLoading(true)
    try {
      // Convertir le numéro (avec indicatif) en email fictif
      const email = phoneToEmail(fullPhone)

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role: 'admin', phone: `+${fullPhone}` }
        }
      })
      if (authError) throw authError
      if (!data.user) throw new Error('Erreur lors de la création du compte')

      const businessPlan = plans.find((p) => p.slug === 'business')
      if (!businessPlan) throw new Error('Plan introuvable')

      await createBusiness(
        {
          name: businessName,
          phone: businessPhone || `+${fullPhone}`,
          city: businessCity,
          commerce_type: commerceType,
        },
        businessPlan.id
      )

      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'inscription'
      if (
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('already exists') ||
        msg.toLowerCase().includes('user already') ||
        msg.toLowerCase().includes('email')
      ) {
        setError('Un compte existe déjà avec ce numéro. Connectez-vous ou contactez le support.')
        setStep(0)
      } else {
        setError(msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-8">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <svg viewBox="0 0 44 44" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
          <rect width="44" height="44" rx="8" fill="#0f172a"/>
          <rect x="7" y="22" width="30" height="18" rx="2" fill="#f97316"/>
          <polygon points="4,22 22,10 40,22" fill="#fb923c"/>
          <rect x="17" y="28" width="10" height="12" rx="1" fill="#0f172a"/>
          <rect x="9" y="24" width="6" height="5" rx="1" fill="#fed7aa"/>
          <rect x="29" y="24" width="6" height="5" rx="1" fill="#fed7aa"/>
          <circle cx="37" cy="13" r="4" fill="#22c55e"/>
        </svg>
        <div>
          <p className="text-white font-bold text-xl leading-tight">
            STOCK<span className="text-orange-500">AM</span>
          </p>
          <p className="text-slate-400 text-xs">Gestion de Commerce Simplifiée</p>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Progress steps */}
        <div className="bg-slate-50 px-6 py-4 border-b">
          <div className="flex items-center justify-center gap-4">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  i < step ? 'bg-emerald-500 text-white' :
                  i === step ? 'bg-orange-500 text-white' :
                  'bg-slate-200 text-slate-400'
                }`}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-sm font-medium ${
                  i === step ? 'text-orange-500' : 'text-slate-400'
                }`}>{s}</span>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-12 ml-2 ${i < step ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">

          {/* Étape 1 — Compte */}
          {step === 0 && (
            <>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Créer votre compte</h2>
                <p className="text-sm text-slate-500 mt-0.5">14 jours d'essai gratuit, sans carte bancaire</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom complet *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Ibrahima Sidibé"
                    />
                  </div>
                </div>

                {/* Numéro de téléphone avec indicatif pays */}
                <div>
                  <label className="block text-sm font-medium mb-1">Numéro de téléphone *</label>
                  <div className="flex gap-2">
                    <CountryCodeSelect value={country} onChange={setCountry} />
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Ex: 79740816"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Ce numéro sera utilisé pour vous connecter
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Mot de passe *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Min. 6 caractères"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Confirmer le mot de passe *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Répétez le mot de passe"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 space-y-1">
                  <p className="text-sm text-red-500">{error}</p>
                  {error.includes('compte existe') && (
                    <div className="flex gap-3">
                      <Link to="/login" className="text-sm text-orange-500 font-semibold hover:underline">
                        Se connecter →
                      </Link>
                      <span className="text-slate-300">|</span>
                      <a
                      
                        href="https://wa.me/22392347783?text=Bonjour, j'ai oublié mon mot de passe STOCKAM."
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-green-600 hover:underline"
                      >
                        Contacter le support
                      </a>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleStep1}
                className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-semibold transition-colors"
              >
                Continuer →
              </button>
              <p className="text-center text-sm text-slate-500">
                Déjà un compte ?{' '}
                <Link to="/login" className="text-orange-500 font-medium hover:underline">
                  Se connecter
                </Link>
              </p>
            </>
          )}

          {/* Étape 2 — Commerce */}
          {step === 1 && (
            <>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Votre commerce</h2>
                <p className="text-sm text-slate-500 mt-0.5">Informations sur votre boutique</p>
              </div>

              {/* Type de commerce */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Type de vente *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCommerceType('detail')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                      commerceType === 'detail'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Package className={`h-5 w-5 ${commerceType === 'detail' ? 'text-orange-500' : 'text-slate-400'}`} />
                    <div className="text-center">
                      <p className={`text-xs font-semibold ${commerceType === 'detail' ? 'text-orange-600' : 'text-slate-700'}`}>
                        Vente au détail
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Vente à l'unité</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommerceType('gros_detail')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                      commerceType === 'gros_detail'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <ShoppingBag className={`h-5 w-5 ${commerceType === 'gros_detail' ? 'text-orange-500' : 'text-slate-400'}`} />
                    <div className="text-center">
                      <p className={`text-xs font-semibold ${commerceType === 'gros_detail' ? 'text-orange-600' : 'text-slate-700'}`}>
                        Gros & Détail
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Carton, pack, pièce...</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom du commerce *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Ex: Quincaillerie Sidibé"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone du commerce</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="+223 XX XX XX XX"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ville</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={businessCity}
                      onChange={(e) => setBusinessCity(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Bamako, Sikasso, Tombouctou..."
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  <p className="text-sm text-red-500">{error}</p>
                  {error.includes('compte existe') && (
                    <Link to="/login" className="text-sm text-orange-500 font-semibold hover:underline">
                      Se connecter →
                    </Link>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setStep(0); setError('') }}
                  className="flex-1 h-10 border border-slate-200 text-slate-600 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  ← Retour
                </button>
                <button
                  onClick={handleStep2}
                  disabled={isLoading}
                  className="flex-1 h-10 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-md text-sm font-semibold transition-colors"
                >
                  {isLoading ? 'Création...' : 'Commencer l\'essai gratuit 🚀'}
                </button>
              </div>
              <p className="text-xs text-center text-slate-400">
                Aucune carte bancaire requise • 14 jours gratuits
              </p>
            </>
          )}

        </div>
      </div>

      <p className="text-center text-slate-600 text-xs mt-6">
        © {new Date().getFullYear()} STOCKAM · Tous droits réservés
      </p>
    </div>
  )
}
