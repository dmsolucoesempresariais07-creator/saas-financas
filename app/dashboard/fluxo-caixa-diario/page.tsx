'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function FluxoCaixaDiarioPage() {
  const [dados, setDados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [saldoInicial, setSaldoInicial] = useState(0)
  const [configCarregada, setConfigCarregada] = useState(false)
  const [saldoMesAnteriorCalculado, setSaldoMesAnteriorCalculado] = useState(0)
  const [detalhesDia, setDetalhesDia] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    carregarConfig()
  }, [])

  useEffect(() => {
    if (configCarregada) calcularSaldoMesAnterior()
  }, [ano, mes, saldoInicial, configCarregada])

  const carregarConfig = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('configuracoes')
      .select('saldo_inicial')
      .eq('user_id', user.id)
      .single()
    if (data?.saldo_inicial) setSaldoInicial(parseFloat(data.saldo_inicial))
    setConfigCarregada(true)
  }

  const calcularSaldoMesAnterior = async () => {
    setLoading(true)

    let saldoAcumulado = saldoInicial

    for (let m = 1; m < mes; m++) {
      const dataInicio = `${ano}-${String(m).padStart(2, '0')}-01`
      const ultimoDia = new Date(ano, m, 0).getDate()
      const dataFim = `${ano}-${String(m).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

      const { data: receber } = await supabase
        .from('contas_receber')
        .select('valor')
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim)

      const { data: pagar } = await supabase
        .from('contas_pagar')
        .select('valor')
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim)

      const entradas = (receber || []).reduce((s, c) => s + parseFloat(c.valor), 0)
      const saidas = (pagar || []).reduce((s, c) => s + parseFloat(c.valor), 0)
      saldoAcumulado += entradas - saidas
    }

    setSaldoMesAnteriorCalculado(saldoAcumulado)
    await carregarDados(saldoAcumulado)
  }

  const carregarDados = async (saldoMesAnt: number) => {
    const ultimoDia = new Date(ano, mes, 0).getDate()
    const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
    const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

    const { data: receber } = await supabase
      .from('contas_receber')
      .select('valor, data_vencimento, descricao, cliente, categoria, status')
      .gte('data_vencimento', dataInicio)
      .lte('data_vencimento', dataFim)
      .order('data_vencimento', { ascending: true })

    const { data: pagar } = await supabase
      .from('contas_pagar')
      .select('valor, data_vencimento, descricao, fornecedor, categoria, status')
      .gte('data_vencimento', dataInicio)
      .lte('data_vencimento', dataFim)
      .order('data_vencimento', { ascending: true })

    const rec = receber || []
    const pag = pagar || []

    let saldoAcumulado = saldoMesAnt
    const resultado = []

    for (let dia = 1; dia <= ultimoDia; dia++) {
      const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

      const entradasDia = rec.filter(c => c.data_vencimento === dataStr)
      const saidasDia = pag.filter(c => c.data_vencimento === dataStr)

      const totalEntradas = entradasDia.reduce((s, c) => s + parseFloat(c.valor), 0)
      const totalSaidas = saidasDia.reduce((s, c) => s + parseFloat(c.valor), 0)
      const saldoDia = totalEntradas - totalSaidas
      saldoAcumulado += saldoDia

      resultado.push({
        dia,
        dataStr,
        totalEntradas,
        totalSaidas,
        saldoDia,
        saldoAcumulado,
        entradasDia,
        saidasDia,
      })
    }

    setDados(resultado)
    setLoading(false)
  }

  const fmt = (v: number) => v === 0 ? 'R$ -' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const mesesDisponiveis = Array.from({length: 12}, (_, i) => ({
    value: i + 1,
    label: new Date(ano, i).toLocaleString('pt-BR', { month: 'long' })
  }))

  const totalEntradas = dados.reduce((s, d) => s + d.totalEntradas, 0)
  const totalSaidas = dados.reduce((s, d) => s + d.totalSaidas, 0)
  const saldoFinal = saldoMesAnteriorCalculado + totalEntradas - totalSaidas

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-600">DM Solucoes</h1>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:underline">
          Voltar ao dashboard
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Fluxo de Caixa Diario</h2>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ano</label>
            <select value={ano} onChange={e => setAno(parseInt(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              {[2023, 2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mes</label>
            <select value={mes} onChange={e => setMes(parseInt(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              {mesesDisponiveis.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Saldo inicial do ano (R$)</label>
            <input
              type="number"
              step="0.01"
              value={saldoInicial}
              onChange={e => setSaldoInicial(parseFloat(e.target.value) || 0)}
              className="w-40 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              placeholder="0,00"
            />
          </div>
          <button onClick={() => calcularSaldoMesAnterior()} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">
            Atualizar
          </button>
        </div>

        <div className="bg-blue-700 text-white rounded-xl p-4 mb-6 flex flex-wrap gap-8 items-center">
          <div>
            <p className="text-xs text-blue-200 mb-1">Saldo final mes anterior</p>
            <p className="text-xl font-bold">{fmt(saldoMesAnteriorCalculado)}</p>
          </div>
          <div>
            <p className="text-xs text-blue-200 mb-1">Total entradas do mes</p>
            <p className="text-xl font-bold">{fmt(totalEntradas)}</p>
          </div>
          <div>
            <p className="text-xs text-blue-200 mb-1">Total saidas do mes</p>
            <p className="text-xl font-bold">{fmt(totalSaidas)}</p>
          </div>
          <div>
            <p className="text-xs text-blue-200 mb-1">Saldo final do mes</p>
            <p className={`text-xl font-bold ${saldoFinal >= 0 ? 'text-green-300' : 'text-red-300'}`}>{fmt(saldoFinal)}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="text-center px-4 py-3 font-medium w-16">Dia</th>
                  <th className="text-right px-4 py-3 font-medium">Entradas</th>
                  <th className="text-right px-4 py-3 font-medium">Saidas</th>
                  <th className="text-right px-4 py-3 font-medium">Saldo do Dia</th>
                  <th className="text-right px-4 py-3 font-medium">Saldo Acumulado</th>
                  <th className="text-center px-4 py-3 font-medium w-24">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <td colSpan={4} className="px-4 py-2 text-sm font-medium text-gray-700">Saldo final mes anterior</td>
                  <td className="px-4 py-2 text-right font-bold text-gray-800">{fmt(saldoMesAnteriorCalculado)}</td>
                  <td></td>
                </tr>
                {dados.map(d => (
                  <>
                    <tr
                      key={d.dia}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${d.totalEntradas > 0 || d.totalSaidas > 0 ? '' : 'opacity-40'}`}
                    >
                      <td className="px-4 py-2 text-center font-medium text-gray-800">{String(d.dia).padStart(2, '0')}</td>
                      <td className="px-4 py-2 text-right text-blue-600 font-medium">{fmt(d.totalEntradas)}</td>
                      <td className="px-4 py-2 text-right text-red-500 font-medium">{fmt(d.totalSaidas)}</td>
                      <td className={`px-4 py-2 text-right font-medium ${d.saldoDia > 0 ? 'text-green-600' : d.saldoDia < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {fmt(d.saldoDia)}
                      </td>
                      <td className={`px-4 py-2 text-right font-bold ${d.saldoAcumulado >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                        {fmt(d.saldoAcumulado)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {(d.totalEntradas > 0 || d.totalSaidas > 0) && (
                          <button
                            onClick={() => setDetalhesDia(detalhesDia?.dia === d.dia ? null : d)}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            {detalhesDia?.dia === d.dia ? 'Fechar' : 'Ver'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {detalhesDia?.dia === d.dia && (
                      <tr key={`det-${d.dia}`} className="bg-blue-50 border-b border-blue-100">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {d.entradasDia.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-blue-700 mb-2">Entradas</p>
                                {d.entradasDia.map((e: any, i: number) => (
                                  <div key={i} className="flex justify-between text-xs py-1 border-b border-blue-100">
                                    <div>
                                      <span className="font-medium text-gray-800">{e.descricao}</span>
                                      {e.cliente && <span className="text-gray-500 ml-1">— {e.cliente}</span>}
                                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${e.status === 'recebido' ? 'bg-green-100 text-green-700' : e.status === 'atrasado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {e.status}
                                      </span>
                                    </div>
                                    <span className="font-medium text-blue-600">{fmt(parseFloat(e.valor))}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {d.saidasDia.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-red-700 mb-2">Saidas</p>
                                {d.saidasDia.map((s: any, i: number) => (
                                  <div key={i} className="flex justify-between text-xs py-1 border-b border-blue-100">
                                    <div>
                                      <span className="font-medium text-gray-800">{s.descricao}</span>
                                      {s.fornecedor && <span className="text-gray-500 ml-1">— {s.fornecedor}</span>}
                                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${s.status === 'pago' ? 'bg-green-100 text-green-700' : s.status === 'atrasado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {s.status}
                                      </span>
                                    </div>
                                    <span className="font-medium text-red-500">{fmt(parseFloat(s.valor))}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                <tr className="bg-green-100 border-t-2 border-green-300">
                  <td className="px-4 py-3 font-bold text-gray-800">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600">{fmt(totalEntradas)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-500">{fmt(totalSaidas)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(totalEntradas - totalSaidas)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${saldoFinal >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(saldoFinal)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}