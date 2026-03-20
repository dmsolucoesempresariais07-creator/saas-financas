'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUsuario(user)
        setLoading(false)
      }
    }
    getUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-600">DM Solucoes</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{usuario?.email}</span>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="text-sm text-red-500 hover:underline"
          >
            Sair
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Visao Geral</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Saldo atual</p>
            <p className="text-3xl font-bold text-green-600">R$ 0,00</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Entradas do mes</p>
            <p className="text-3xl font-bold text-blue-600">R$ 0,00</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Saidas do mes</p>
            <p className="text-3xl font-bold text-red-500">R$ 0,00</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Contas a Receber</h3>
            <p className="text-sm text-gray-400">Nenhuma conta cadastrada ainda.</p>
            <button
              onClick={() => router.push('/dashboard/contas-receber')}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Gerenciar contas a receber
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Contas a Pagar</h3>
            <p className="text-sm text-gray-400">Nenhuma conta cadastrada ainda.</p>
            <button
              onClick={() => router.push('/dashboard/contas-pagar')}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Gerenciar contas a pagar
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
  <h3 className="text-lg font-semibold text-gray-800 mb-4">DRE</h3>
  <p className="text-sm text-gray-400">Demonstrativo de Resultado do Exercicio.</p>
  <button
    onClick={() => router.push('/dashboard/dre')}
    className="mt-4 text-sm text-blue-600 hover:underline"
  >
    Ver DRE
  </button>
</div>
        </div>
      </div>
    </div>
  )
}