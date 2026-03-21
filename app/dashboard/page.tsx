'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saldo, setSaldo] = useState(0)
  const [entradas, setEntradas] = useState(0)
  const [saidas, setSaidas] = useState(0)
  const [totalReceber, setTotalReceber] = useState(0)
  const [totalPagar, setTotalPagar] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUsuario(user)
      await carregarResumo()
      setLoading(false)
    }
    init()
  }, [])

  const carregarResumo = async () => {
    const mes = new Date().getMonth() + 1
    const ano = new Date().getFullYear()
    const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
    const ultimoDia = new Date(ano, mes, 0).getDate()
    const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

    const { data: receber } = await supabase
      .from('contas_receber')
      .select('valor, status')
      .gte('data_vencimento', dataInicio)
      .lte('data_vencimento', dataFim)

    const { data: pagar } = await supabase
      .from('contas_pagar')
      .select('valor, status')
      .gte('data_vencimento', dataInicio)
      .lte('data_vencimento', dataFim)

    const totalE = (receber || []).reduce((s, c) => s + parseFloat(c.valor), 0)
    const totalS = (pagar || []).reduce((s, c) => s + parseFloat(c.valor), 0)

    const { data: receberPendente } = await supabase
      .from('contas_receber')
      .select('valor')
      .neq('status', 'recebido')

    const { data: pagarPendente } = await supabase
      .from('contas_pagar')
      .select('valor')
      .neq('status', 'pago')

    setEntradas(totalE)
    setSaidas(totalS)
    setSaldo(totalE - totalS)
    setTotalReceber((receberPendente || []).reduce((s, c) => s + parseFloat(c.valor), 0))
    setTotalPagar((pagarPendente || []).reduce((s, c) => s + parseFloat(c.valor), 0))
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Visao Geral</h2>
        <p className="text-sm text-gray-500 mb-6">{new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric', day: 'numeric' })}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Saldo do mes</p>
            <p className={`text-3xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(saldo)}</p>
            <p className="text-xs text-gray-400 mt-1">Entradas - Saidas do mes</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Entradas do mes</p>
            <p className="text-3xl font-bold text-blue-600">{fmt(entradas)}</p>
            <p className="text-xs text-gray-400 mt-1">Total lancado no mes</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Saidas do mes</p>
            <p className="text-3xl font-bold text-red-500">{fmt(saidas)}</p>
            <p className="text-xs text-gray-400 mt-1">Total lancado no mes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
            <p className="text-sm text-yellow-600 mb-1">A Receber (pendente)</p>
            <p className="text-2xl font-bold text-yellow-700">{fmt(totalReceber)}</p>
            <p className="text-xs text-yellow-500 mt-1">Contas ainda nao recebidas</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-6">
            <p className="text-sm text-red-600 mb-1">A Pagar (pendente)</p>
            <p className="text-2xl font-bold text-red-700">{fmt(totalPagar)}</p>
            <p className="text-xs text-red-400 mt-1">Contas ainda nao pagas</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
            <p className="text-sm text-blue-600 mb-1">Resultado pendente</p>
            <p className={`text-2xl font-bold ${totalReceber - totalPagar >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmt(totalReceber - totalPagar)}</p>
            <p className="text-xs text-blue-400 mt-1">A receber - A pagar</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Contas a Receber</h3>
            <p className="text-sm text-gray-400">Gerencie suas receitas.</p>
            <button onClick={() => router.push('/dashboard/contas-receber')} className="mt-4 text-sm text-blue-600 hover:underline">
              Gerenciar
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Contas a Pagar</h3>
            <p className="text-sm text-gray-400">Gerencie suas despesas.</p>
            <button onClick={() => router.push('/dashboard/contas-pagar')} className="mt-4 text-sm text-blue-600 hover:underline">
              Gerenciar
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">DRE</h3>
            <p className="text-sm text-gray-400">Demonstrativo de Resultado.</p>
            <button onClick={() => router.push('/dashboard/dre')} className="mt-4 text-sm text-blue-600 hover:underline">
              Ver DRE
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Fluxo de Caixa</h3>
            <p className="text-sm text-gray-400">Entradas e saidas do periodo.</p>
            <button onClick={() => router.push('/dashboard/fluxo-caixa')} className="mt-4 text-sm text-blue-600 hover:underline">
              Ver Fluxo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}