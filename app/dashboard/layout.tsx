'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<any>(null)
  const [nomeEmpresa, setNomeEmpresa] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [onboardingPendente, setOnboardingPendente] = useState(false)
  const router = useRouter()

  useEffect(() => {
    verificar()
  }, [])

  const verificar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    setUsuario(user)

    const { data: config } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!config?.onboarding_concluido) {
      setOnboardingPendente(true)
    } else {
      setNomeEmpresa(config.nome_empresa || '')
      setLogoUrl(config.logo_url || '')
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar usuario={usuario} nomeEmpresa={nomeEmpresa} logoUrl={logoUrl} />

      {onboardingPendente && (
        <div className="md:ml-60 pt-14 md:pt-0">
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" fill="none" stroke="#92400e" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-sm text-yellow-800 font-medium">
                Configure sua empresa para aproveitar todos os recursos!
              </p>
            </div>
            <button
              onClick={() => router.push('/onboarding')}
              className="text-xs bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600 font-medium"
            >
              Configurar agora
            </button>
          </div>
        </div>
      )}

      <main className="md:ml-60 pt-14 md:pt-0 pb-20 md:pb-0 transition-all duration-300">
  <div className="hidden md:flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
    <nav className="text-xs text-gray-400">Inicio</nav>
    <p className="text-sm text-gray-600">
      Bem-vindo, <span className="font-semibold text-gray-800">{nomeEmpresa || 'usuario'}</span>
    </p>
  </div>
        {children}
      </main>
    </div>
  )
}