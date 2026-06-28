import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
})
type LoginForm = z.infer<typeof schema>

export default function LoginPage() {
  const { signIn } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      await signIn(data.email, data.password)
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
          <p className="text-slate-400 text-xs">Gestion de stock intelligente</p>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Connexion</h2>
          <p className="text-sm text-slate-500 mt-0.5">Accédez à votre espace de gestion</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Adresse email"
            type="email"
            placeholder="vous@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pr-9 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Se connecter
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-orange-500 font-medium hover:underline">
            Créer un compte gratuit
          </Link>
        </p>
      </div>

      <p className="text-center text-slate-600 text-xs mt-6">
        © {new Date().getFullYear()} STOCKAM · Tous droits réservés
      </p>
    </div>
  )
}
