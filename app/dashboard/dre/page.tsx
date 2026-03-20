'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DREPage() {
  const [dados, setDados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [periodo, setPeriodo] = useState('anual')
  const [mesInicio, setMesInicio] = useState(1)
  const router = useRouter()

  useEffect(() => {
    carregarDados()
  }, [ano, periodo, mesInicio])

  const getMeses = () => {
    switch (periodo) {
      case 'mensal': return [mesInicio]
      case 'bimestral': return [mesInicio, mesInicio + 1].filter(m => m <= 12)
      case 'trimestral': return [mesInicio, mesInicio + 1, mesInicio + 2].filter(m => m <= 12)
      case 'semestral': return mesInicio <= 6 ? [1,2,3,4,5,6] : [7,8,9,10,11,12]
      case 'anual': return [1,2,3,4,5,6,7,8,9,10,11,12]
      default: return [mesInicio]
    }
  }

  const carregarDados = async () => {
    setLoading(true)
    const meses = getMeses()
    const resultado = []

    for (const mes of meses) {
      const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
    const ultimoDia = new Date(ano, mes, 0).getDate()
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
      const receitaBruta = recProdutos + recServicos + outrasReceitas

      const deducoes = soma(pag, ['Impostos Diretos'])
      const receitaLiquida = receitaBruta - deducoes

      const custosVariaveis = soma(pag, ['Custos Variaveis'])
      const margemContribuicao = receitaLiquida - custosVariaveis
      const pctMargem = receitaBruta > 0 ? (margemContribuicao / receitaBruta) * 100 : 0

      const despOcupacao = soma(pag, ['Despesas com Ocupacao'])
      const despServicos = soma(pag, ['Despesas com Servicos'])
      const despPessoal = soma(pag, ['Despesas com Pessoal'])
      const outrasDespesas = soma(pag, ['Outras Despesas'])
      const totalDespesas = despOcupacao + despServicos + despPessoal + outrasDespesas

      const lucroOperacional = margemContribuicao - totalDespesas

      const recFinanceiras = soma(rec, ['Resultado Financeiro'])
      const despFinanceiras = soma(pag, ['Resultado Financeiro'])
      const resultadoFinanceiro = recFinanceiras - despFinanceiras

      const impostosD = soma(pag, ['Impostos Diretos'])
      const lucroLiquido = lucroOperacional + resultadoFinanceiro
      const pctMargLiquida = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0

      resultado.push({
        mes,
        nomeMes: new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long' }),
        receitaBruta, recProdutos, recServicos, outrasReceitas,
        deducoes, receitaLiquida,
        custosVariaveis, margemContribuicao, pctMargem,
        totalDespesas, despOcupacao, despServicos, despPessoal, outrasDespesas,
        lucroOperacional,
        recFinanceiras, despFinanceiras, resultadoFinanceiro,
        impostosD, lucroLiquido, pctMargLiquida,
      })
    }

    setDados(resultado)
    setLoading(false)
  }

  const fmt = (v: number) => v === 0 ? 'R$ -' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const pct = (v: number) => `${v.toFixed(0)}%`

  const total = (key: string) => dados.reduce((s, d) => s + (d[key] || 0), 0)
  const totalRB = total('receitaBruta')
  const av = (v: number) => totalRB > 0 ? `${((v / totalRB) * 100).toFixed(0)}%` : '0%'

  const mesesDisponiveis = Array.from({length: 12}, (_, i) => ({
    value: i + 1,
    label: new Date(ano, i).toLocaleString('pt-BR', { month: 'long' })
  }))

  type Linha = {
    key?: string
    label: string
    tipo: 'titulo' | 'sub' | 'total' | 'pct' | 'separador'
    negativo?: boolean
    cor?: string
  }

  const linhas: Linha[] = [
    { key: 'receitaBruta', label: 'Receita Bruta', tipo: 'titulo', cor: 'bg-blue-50 text-blue-800' },
    { key: 'recProdutos', label: 'Receita com Produtos', tipo: 'sub' },
    { key: 'recServicos', label: 'Receita com Servicos', tipo: 'sub' },
    { key: 'outrasReceitas', label: 'Outras Receitas', tipo: 'sub' },
    { key: 'deducoes', label: 'Deducoes sobre Vendas', tipo: 'titulo', negativo: true, cor: 'bg-red-50 text-red-700' },
    { key: 'receitaLiquida', label: 'Receita Liquida', tipo: 'total', cor: 'bg-blue-100 text-blue-900' },
    { key: 'custosVariaveis', label: 'Custos Variaveis', tipo: 'titulo', negativo: true, cor: 'bg-orange-50 text-orange-700' },
    { key: 'margemContribuicao', label: 'Margem Contribuicao', tipo: 'total', cor: 'bg-green-50 text-green-800' },
    { key: 'pctMargem', label: '% Margem Contribuicao', tipo: 'pct', cor: 'bg-green-50 text-green-700' },
    { key: 'totalDespesas', label: 'Despesas', tipo: 'titulo', negativo: true, cor: 'bg-red-50 text-red-700' },
    { key: 'despOcupacao', label: 'Despesas com Ocupacao', tipo: 'sub' },
    { key: 'despServicos', label: 'Despesas com Servicos', tipo: 'sub' },
    { key: 'despPessoal', label: 'Despesas com Pessoal', tipo: 'sub' },
    { key: 'outrasDespesas', label: 'Outras Despesas', tipo: 'sub' },
    { key: 'lucroOperacional', label: 'Lucro Operacional', tipo: 'total', cor: 'bg-green-100 text-green-900' },
    { key: 'resultadoFinanceiro', label: 'Resultado Financeiro', tipo: 'titulo', cor: 'bg-gray-50 text-gray-700' },
    { key: 'recFinanceiras', label: 'Receitas Financeiras', tipo: 'sub' },
    { key: 'despFinanceiras', label: 'Despesas Financeiras', tipo: 'sub', negativo: true },
    { key: 'impostosD', label: 'Impostos Diretos', tipo: 'titulo', negativo: true, cor: 'bg-red-50 text-red-700' },
    { key: 'lucroLiquido', label: 'Lucro Liquido', tipo: 'total', cor: 'bg-green-200 text-green-900' },
    { key: 'pctMargLiquida', label: '% Margem Liquida', tipo: 'pct', cor: 'bg-green-100 text-green-800' },
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
          <h2 className="text-2xl font-bold text-gray-800">DRE — Demonstrativo de Resultado</h2>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ano</label>
            <select value={ano} onChange={e => setAno(parseInt(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              {[2023, 2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Periodo</label>
            <select value={periodo} onChange={e => { setPeriodo(e.target.value); setMesInicio(1) }} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              <option value="mensal">Mensal</option>
              <option value="bimestral">Bimestral</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </select>
          </div>
          {periodo !== 'anual' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">{periodo === 'semestral' ? 'Semestre' : 'Mes inicial'}</label>
              {periodo === 'semestral' ? (
                <select value={mesInicio} onChange={e => setMesInicio(parseInt(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  <option value={1}>1º Semestre (Jan-Jun)</option>
                  <option value={7}>2º Semestre (Jul-Dez)</option>
                </select>
              ) : (
                <select value={mesInicio} onChange={e => setMesInicio(parseInt(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  {mesesDisponiveis.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              )}
            </div>
          )}
          <button onClick={carregarDados} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="text-xs" style={{minWidth: '900px', width: '100%'}}>
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="text-left px-4 py-3 font-medium sticky left-0 bg-gray-800" style={{minWidth:'220px'}}>Demonstrativo de Resultado</th>
                  {dados.map(d => (
                    <th key={d.mes} className="text-right px-3 py-3 font-medium capitalize" style={{minWidth:'90px'}}>{d.nomeMes}</th>
                  ))}
                  <th className="text-right px-3 py-3 font-medium bg-gray-700" style={{minWidth:'90px'}}>{ano}</th>
                  <th className="text-right px-3 py-3 font-medium bg-gray-600" style={{minWidth:'60px'}}>AV%</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha, idx) => {
                  const isTitulo = linha.tipo === 'titulo'
                  const isTotal = linha.tipo === 'total'
                  const isPct = linha.tipo === 'pct'
                  const isSub = linha.tipo === 'sub'
                  const totalVal = linha.key ? total(linha.key) : 0

                  return (
                    <tr key={idx} className={`border-b border-gray-100 ${linha.cor || (isSub ? '' : '')} ${isTotal ? 'font-bold' : ''}`}>
                      <td className={`px-4 py-2 sticky left-0 ${linha.cor || 'bg-white'} ${isSub ? 'pl-8 text-gray-600' : 'font-medium'} ${isTotal ? 'font-bold' : ''}`}>
                        {linha.negativo && !isPct ? '(-) ' : ''}{linha.label}
                      </td>
                      {dados.map(d => (
                        <td key={d.mes} className={`px-3 py-2 text-right ${linha.cor || 'bg-white'} ${isSub ? 'text-gray-500' : ''}`}>
                          {isPct ? pct(d[linha.key!] || 0) : fmt(d[linha.key!] || 0)}
                        </td>
                      ))}
                      <td className={`px-3 py-2 text-right font-bold ${linha.cor || 'bg-gray-50'}`}>
                        {isPct
                          ? pct(totalRB > 0 ? (total('lucroLiquido') / totalRB) * 100 : 0)
                          : fmt(totalVal)}
                      </td>
                      <td className={`px-3 py-2 text-right ${linha.cor || 'bg-gray-100'} text-gray-600`}>
                        {isPct ? '-' : av(totalVal)}
                      </td>
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