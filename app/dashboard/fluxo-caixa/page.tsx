'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function FluxoCaixaPage() {
  const [dados, setDados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [saldoInicial, setSaldoInicial] = useState(0)
  const [configCarregada, setConfigCarregada] = useState(false)
  const router = useRouter()

  useEffect(() => {
    carregarConfig()
  }, [])

  useEffect(() => {
    if (configCarregada) carregarDados()
  }, [ano, saldoInicial, configCarregada])

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

  const carregarDados = async () => {
    setLoading(true)
    const resultado = []
    let saldoAnterior = saldoInicial

    for (let mes = 1; mes <= 12; mes++) {
      const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
      const ultimoDia = new Date(ano, mês, 0).getDate()
      const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

      const { data: receber } = await supabase
        .from('contas_receber')
        .select('valor, categoria')
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim)

      const { data: pagar } = await supabase
        .from('contas_pagar')
        .select('valor, categoria')
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim)

      const rec = receber || []
      const pag = pagar || []

      const soma = (arr: any[], cats: string[]) =>
        arr.filter(c => cats.includes(c.categoria)).reduce((s, c) => s + parseFloat(c.valor), 0)

      const recProdutos = soma(rec, ['Receita com Produtos'])
      const recServicos = soma(rec, ['Receita com Servicos'])
      const outrasReceitas = soma(rec, ['Outras Receitas'])
      const recFinanceiras = soma(rec, ['Resultado Financeiro'])
      const totalEntradas = recProdutos + recServicos + outrasReceitas + recFinanceiras

      const custosVariaveis = soma(pag, ['Custos Variaveis'])
      const despOcupacao = soma(pag, ['Despesas com Ocupacao'])
      const despServicos = soma(pag, ['Despesas com Servicos'])
      const despPessoal = soma(pag, ['Despesas com Pessoal'])
      const deducoes = soma(pag, ['Deducoes sobre Vendas'])
      const impostos = soma(pag, ['Impostos Diretos'])
      const outrasDespesas = soma(pag, ['Outras Despesas'])
      const despFinanceiras = soma(pag, ['Resultado Financeiro'])
      const totalSaidas = custosVariaveis + despOcupacao + despServicos + despPessoal + deducoes + impostos + outrasDespesas + despFinanceiras

      const saldoOperacional = totalEntradas - totalSaidas
      const saldoFinal = saldoAnterior + saldoOperacional

      resultado.push({
        mes,
        nomeMes: new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long' }),
        saldoInicial: saldoAnterior,
        recProdutos, recServicos, outrasReceitas, recFinanceiras, totalEntradas,
        custosVariaveis, despOcupacao, despServicos, despPessoal, deducoes, impostos, outrasDespesas, despFinanceiras, totalSaidas,
        saldoOperacional, saldoFinal,
      })

      saldoAnterior = saldoFinal
    }

    setDados(resultado)
    setLoading(false)
  }

  const fmt = (v: number) => v === 0 ? 'R$ -' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  type Linha = {
    key: string
    label: string
    tipo: 'titulo' | 'sub' | 'total' | 'saldo'
    cor?: string
  }

  const linhas: Linha[] = [
    { key: 'saldoInicial', label: '(A) Saldo Inicial', tipo: 'saldo', cor: 'bg-gray-800 text-white' },
    { key: 'totalEntradas', label: '(B) Entradas', tipo: 'titulo', cor: 'bg-blue-600 text-white' },
    { key: 'recProdutos', label: 'Receita com Produtos', tipo: 'sub' },
    { key: 'recServicos', label: 'Receita com Servicos', tipo: 'sub' },
    { key: 'outrasReceitas', label: 'Outras Receitas', tipo: 'sub' },
    { key: 'recFinanceiras', label: 'Receitas Financeiras', tipo: 'sub' },
    { key: 'totalSaidas', label: '(C) Saidas', tipo: 'titulo', cor: 'bg-red-600 text-white' },
    { key: 'custosVariaveis', label: 'Custos Variaveis', tipo: 'sub' },
    { key: 'despOcupacao', label: 'Despesas com Ocupacao', tipo: 'sub' },
    { key: 'despServicos', label: 'Despesas com Servicos', tipo: 'sub' },
    { key: 'despPessoal', label: 'Despesas com Pessoal', tipo: 'sub' },
    { key: 'deducoes', label: 'Deducoes sobre Vendas', tipo: 'sub' },
    { key: 'impostos', label: 'Impostos Diretos', tipo: 'sub' },
    { key: 'outrasDespesas', label: 'Outras Despesas', tipo: 'sub' },
    { key: 'despFinanceiras', label: 'Despesas Financeiras', tipo: 'sub' },
    { key: 'saldoOperacional', label: 'Saldo Operacional (B - C)', tipo: 'total', cor: 'bg-green-100 text-green-900' },
    { key: 'saldoFinal', label: 'Saldo Final (A + B - C)', tipo: 'total', cor: 'bg-green-200 text-green-900' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-600">DM Solucoes</h1>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:underline">
          Voltar ao dashboard
        </button>
      </nav>

      <div className="max-w-full px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Fluxo de Caixa Mensal</h2>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ano</label>
            <select value={ano} onChange={e => setAno(parseInt(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              {[2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Saldo inicial do ano (R$)</label>
            <input
              type="number"
              step="0.01"
              value={saldoInicial}
              onChange={e => setSaldoInicial(parseFloat(e.target.value) || 0)}
              className="w-36 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              placeholder="0,00"
            />
          </div>
          <button onClick={carregarDados} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="text-xs" style={{minWidth: '1100px', width: '100%'}}>
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="text-left px-4 py-3 font-medium sticky left-0 bg-gray-800" style={{minWidth:'220px'}}>Fluxo de Caixa</th>
                  {dados.map(d => (
                    <th key={d.mes} className="text-right px-3 py-3 font-medium capitalize" style={{minWidth:'90px'}}>{d.nomeMes}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha, idx) => {
                  const isTitulo = linha.tipo === 'titulo'
                  const isTotal = linha.tipo === 'total'
                  const isSaldo = linha.tipo === 'saldo'
                  const isSub = linha.tipo === 'sub'

                  return (
                    <tr key={idx} className={`border-b border-gray-100 ${linha.cor || ''}`}>
                      <td className={`px-4 py-2 sticky left-0 ${linha.cor || 'bg-white'} ${isSub ? 'pl-8 text-gray-600' : 'font-medium'} ${isTotal || isTitulo || isSaldo ? 'font-bold' : ''}`}>
                        {linha.label}
                      </td>
                      {dados.map(d => {
                        const val = d[linha.key] || 0
                        const isNegativo = val < 0
                        return (
                          <td key={d.mes} className={`px-3 py-2 text-right ${linha.cor || 'bg-white'} ${isSub ? 'text-gray-500' : ''} ${isNegativo ? 'text-red-600' : ''}`}>
                            {fmt(val)}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}