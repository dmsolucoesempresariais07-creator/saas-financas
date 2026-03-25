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
  const [categorias, setCategorias] = useState<any[]>([])
  const [carregandoCategorias, setCarregandoCategorias] = useState(true)
  const router = useRouter()

  useEffect(() => {
    carregarCategorias()
  }, [])

  useEffect(() => {
    if (!carregandoCategorias) carregarDados()
  }, [ano, periodo, mesInicio, carregandoCategorias])

  const carregarCategorias = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('categorias').select('*').eq('user_id', user?.id)
    setCategorias(data || [])
    setCarregandoCategorias(false)
  }

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
    const dataInicio = `${ano}-${String(Math.min(...meses)).padStart(2, '0')}-01`
    const ultimoMes = Math.max(...meses)
    const ultimoDia = new Date(ano, ultimoMes, 0).getDate()
    const dataFim = `${ano}-${String(ultimoMes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

    const [{ data: receber }, { data: pagar }] = await Promise.all([
      supabase.from('contas_receber').select('valor, categoria, data_vencimento').gte('data_vencimento', dataInicio).lte('data_vencimento', dataFim),
      supabase.from('contas_pagar').select('valor, categoria, data_vencimento').gte('data_vencimento', dataInicio).lte('data_vencimento', dataFim),
    ])

    const rec = receber || []
    const pag = pagar || []

    const catDeducoes = categorias
      .filter(c => c.subtipo === 'deducao')
      .map(c => c.nome)

    const catPagarNormal = categorias
      .filter(c => (c.tipo === 'pagar' || c.tipo === 'ambos') && c.subtipo !== 'deducao')
      .map(c => c.nome)

    const resultado = meses.map(mes => {
      const dataInicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`
      const ultimoDiaMes = new Date(ano, mes, 0).getDate()
      const dataFimMes = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`

      const recMes = rec.filter(c => c.data_vencimento >= dataInicioMes && c.data_vencimento <= dataFimMes)
      const pagMes = pag.filter(c => c.data_vencimento >= dataInicioMes && c.data_vencimento <= dataFimMes)

      const somaRec = (cat: string) => recMes.filter(c => c.categoria === cat).reduce((s, c) => s + parseFloat(c.valor), 0)
      const somaPag = (cat: string) => pagMes.filter(c => c.categoria === cat).reduce((s, c) => s + parseFloat(c.valor), 0)

      const receitaBruta = recMes.reduce((s, c) => s + parseFloat(c.valor), 0)

      const deducoes = pagMes
        .filter(c => catDeducoes.includes(c.categoria))
        .reduce((s, c) => s + parseFloat(c.valor), 0)

      const totalDespesas = pagMes
        .filter(c => catPagarNormal.includes(c.categoria))
        .reduce((s, c) => s + parseFloat(c.valor), 0)

      const receitaLiquida = receitaBruta - deducoes
      const margemContribuicao = receitaLiquida
      const pctMargem = receitaBruta > 0 ? (margemContribuicao / receitaBruta) * 100 : 0
      const lucroOperacional = receitaLiquida - totalDespesas
      const lucroLiquido = lucroOperacional
      const pctMargLiquida = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0

      const valoresPorCategoria: Record<string, number> = {}
      categorias.forEach(cat => {
        if (cat.tipo === 'receber' || cat.tipo === 'ambos') {
          valoresPorCategoria[`rec_${cat.nome}`] = somaRec(cat.nome)
        }
        if ((cat.tipo === 'pagar' || cat.tipo === 'ambos') && cat.subtipo !== 'deducao') {
          valoresPorCategoria[`pag_${cat.nome}`] = somaPag(cat.nome)
        }
      })

      return {
        mes,
        nomeMes: new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'short' }),
        receitaBruta, deducoes, receitaLiquida, margemContribuicao, pctMargem,
        totalDespesas, lucroOperacional, lucroLiquido, pctMargLiquida,
        ...valoresPorCategoria,
      }
    })

    setDados(resultado)
    setLoading(false)
  }

  const pct = (v: number) => `${v.toFixed(0)}%`
  const totalCol = (key: string) => dados.reduce((s, d) => s + ((d[key] as number) || 0), 0)
  const totalRB = totalCol('receitaBruta')
  const av = (v: number) => totalRB > 0 ? `${((v / totalRB) * 100).toFixed(0)}%` : '—'

  const mesesDisponiveis = Array.from({length: 12}, (_, i) => ({
    value: i + 1,
    label: new Date(ano, i).toLocaleString('pt-BR', { month: 'long' })
  }))

  const catReceber = categorias.filter(c => c.tipo === 'receber' || c.tipo === 'ambos')
  const catPagarNormal = categorias.filter(c => (c.tipo === 'pagar' || c.tipo === 'ambos') && c.subtipo !== 'deducao')

  type Linha = {
    key: string
    label: string
    tipo: 'titulo' | 'sub' | 'total' | 'pct'
    negativo?: boolean
    corBg: string
    corText: string
  }

  const linhas: Linha[] = [
    { key: 'receitaBruta', label: 'Receita Bruta', tipo: 'titulo', corBg: '#2563eb', corText: 'white' },
    ...catReceber.map(c => ({ key: `rec_${c.nome}`, label: c.nome, tipo: 'sub' as const, corBg: '#ffffff', corText: '#4b5563' })),
    { key: 'deducoes', label: 'Deduções sobre Vendas', tipo: 'titulo', negativo: true, corBg: '#fef2f2', corText: '#b91c1c' },
    { key: 'receitaLiquida', label: 'Receita Líquida', tipo: 'total', corBg: '#dbeafe', corText: '#1e3a8a' },
    { key: 'totalDespesas', label: 'Despesas', tipo: 'titulo', negativo: true, corBg: '#fef2f2', corText: '#b91c1c' },
    ...catPagarNormal.map(c => ({ key: `pag_${c.nome}`, label: c.nome, tipo: 'sub' as const, corBg: '#ffffff', corText: '#4b5563' })),
    { key: 'margemContribuicao', label: 'Margem Contribuição', tipo: 'total', corBg: '#f0fdf4', corText: '#14532d' },
    { key: 'pctMargem', label: '% Margem Contribuição', tipo: 'pct', corBg: '#f0fdf4', corText: '#15803d' },
    { key: 'lucroOperacional', label: 'Lucro Operacional', tipo: 'total', corBg: '#dcfce7', corText: '#14532d' },
    { key: 'lucroLiquido', label: 'Lucro Líquido', tipo: 'total', corBg: '#bbf7d0', corText: '#14532d' },
    { key: 'pctMargLiquida', label: '% Margem Líquida', tipo: 'pct', corBg: '#dcfce7', corText: '#15803d' },
  ]

  return (
    <div className="px-4 py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">DRE — Demonstrativo de Resultado</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Ano</label>
          <select value={ano} onChange={e => setAno(parseInt(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            {[2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Período</label>
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
            <label className="block text-xs text-gray-500 mb-1">{periodo === 'semestral' ? 'Semestre' : 'Mês inicial'}</label>
            {periodo === 'semestral' ? (
              <select value={mesInicio} onChange={e => setMesInicio(parseInt(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                <option value={1}>1º Semestre</option>
                <option value={7}>2º Semestre</option>
              </select>
            ) : (
              <select value={mesInicio} onChange={e => setMesInicio(parseInt(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                {mesesDisponiveis.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            )}
          </div>
        )}
        <button onClick={carregarDados} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">Atualizar</button>
      </div>

      {!carregandoCategorias && categorias.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-yellow-800">
            Nenhuma categoria cadastrada.
            <button onClick={() => router.push('/dashboard/configuracoes/categorias')} className="font-semibold underline ml-1">
              Cadastre categorias aqui.
            </button>
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm">Carregando...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '12px'}}>
            <thead>
              <tr style={{background: '#1f2937', color: 'white'}}>
                <th style={{textAlign: 'left', padding: '10px 16px', position: 'sticky', left: 0, background: '#1f2937', minWidth: '200px', fontWeight: 500}}>Demonstrativo</th>
                {dados.map(d => (
                  <th key={d.mes} style={{textAlign: 'right', padding: '10px 12px', minWidth: '85px', fontWeight: 500, textTransform: 'capitalize'}}>{d.nomeMes}</th>
                ))}
                <th style={{textAlign: 'right', padding: '10px 12px', minWidth: '90px', fontWeight: 600, background: '#374151'}}>{ano}</th>
                <th style={{textAlign: 'right', padding: '10px 12px', minWidth: '55px', fontWeight: 500, background: '#4b5563'}}>AV%</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, idx) => {
                const isTotal = linha.tipo === 'total'
                const isPct = linha.tipo === 'pct'
                const isSub = linha.tipo === 'sub'
                const isTitulo = linha.tipo === 'titulo'
                const totalVal = totalCol(linha.key)

                return (
                  <tr key={idx} style={{borderBottom: '1px solid #f3f4f6', background: linha.corBg}}>
                    <td style={{
                      padding: isSub ? '7px 16px 7px 32px' : '9px 16px',
                      fontWeight: isTitulo || isTotal ? 600 : 400,
                      color: linha.corText,
                      position: 'sticky',
                      left: 0,
                      background: linha.corBg,
                      whiteSpace: 'nowrap',
                    }}>
                      {linha.negativo && !isPct ? '(-) ' : ''}{linha.label}
                    </td>
                    {dados.map(d => {
                      const val = (d[linha.key] as number) || 0
                      return (
                        <td key={d.mes} style={{
                          padding: '7px 12px',
                          textAlign: 'right',
                          color: val < 0 ? '#dc2626' : linha.corText,
                          fontWeight: isTitulo || isTotal ? 600 : 400,
                          fontVariantNumeric: 'tabular-nums',
                          background: linha.corBg,
                        }}>
                          {isPct
                            ? pct(d[linha.key] || 0)
                            : val === 0
                              ? <span style={{color: '#d1d5db'}}>—</span>
                              : val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          }
                        </td>
                      )
                    })}
                    <td style={{
                      padding: '7px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: totalVal < 0 ? '#dc2626' : linha.corText,
                      fontVariantNumeric: 'tabular-nums',
                      background: linha.corBg,
                      borderLeft: '1px solid #e5e7eb',
                    }}>
                      {isPct
                        ? pct(totalRB > 0 ? (totalCol('lucroLiquido') / totalRB) * 100 : 0)
                        : totalVal === 0
                          ? <span style={{color: '#d1d5db'}}>—</span>
                          : totalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      }
                    </td>
                    <td style={{
                      padding: '7px 12px',
                      textAlign: 'right',
                      color: '#6b7280',
                      fontVariantNumeric: 'tabular-nums',
                      background: linha.corBg,
                    }}>
                      {isPct ? '—' : av(totalVal)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}