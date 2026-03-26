'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function RelatoriosPage() {
  const [aba, setAba] = useState<'receber' | 'pagar'>('receber')
  const [dados, setDados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [categoriasList, setCategoriasList] = useState<any[]>([])
  const [clientesList, setClientesList] = useState<any[]>([])
  const [filtros, setFiltros] = useState({
    dataInicio: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
    dataFim: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}`,
    status: 'todos',
    categoria: '',
    clienteFornecedor: '',
  })

  useEffect(() => {
    carregarCategorias()
    carregarClientes()
  }, [aba])

  useEffect(() => {
    buscar()
  }, [aba, filtros])

  const carregarCategorias = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const tipo = aba === 'receber' ? ['receber', 'ambos'] : ['pagar', 'ambos']
    const { data } = await supabase.from('categorias').select('*').eq('user_id', user?.id).in('tipo', tipo).order('nome')
    setCategoriasList(data || [])
  }

  const carregarClientes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const tipo = aba === 'receber' ? ['cliente', 'ambos'] : ['fornecedor', 'ambos']
    const { data } = await supabase.from('clientes_fornecedores').select('*').eq('user_id', user?.id).in('tipo', tipo).order('nome')
    setClientesList(data || [])
  }

  const buscar = async () => {
    setLoading(true)
    const tabela = aba === 'receber' ? 'contas_receber' : 'contas_pagar'
    let query = supabase.from(tabela).select('*')
      .gte('data_vencimento', filtros.dataInicio)
      .lte('data_vencimento', filtros.dataFim)
      .order('data_vencimento', { ascending: true })

    if (filtros.status !== 'todos') query = query.eq('status', filtros.status)
    if (filtros.categoria) query = query.eq('categoria', filtros.categoria)
    if (filtros.clienteFornecedor) {
      const campo = aba === 'receber' ? 'cliente' : 'fornecedor'
      query = query.eq(campo, filtros.clienteFornecedor)
    }

    const { data } = await query
    setDados(data || [])
    setLoading(false)
  }

  const hoje = new Date().toISOString().split('T')[0]
  const dadosComStatus = dados.map(d => ({
    ...d,
    statusFinal: d.status === (aba === 'receber' ? 'recebido' : 'pago')
      ? d.status
      : d.data_vencimento < hoje ? 'atrasado' : d.status
  }))

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const totalGeral = dadosComStatus.reduce((s, d) => s + parseFloat(d.valor), 0)
  const totalPendente = dadosComStatus.filter(d => d.statusFinal === 'pendente').reduce((s, d) => s + parseFloat(d.valor), 0)
  const totalAtrasado = dadosComStatus.filter(d => d.statusFinal === 'atrasado').reduce((s, d) => s + parseFloat(d.valor), 0)
  const totalQuitado = dadosComStatus.filter(d => d.statusFinal === (aba === 'receber' ? 'recebido' : 'pago')).reduce((s, d) => s + parseFloat(d.valor), 0)

  const porCategoria = dadosComStatus.reduce((acc, d) => {
    const cat = d.categoria || 'Sem categoria'
    acc[cat] = (acc[cat] || 0) + parseFloat(d.valor)
    return acc
  }, {} as Record<string, number>)

  const porClienteFornecedor = dadosComStatus.reduce((acc, d) => {
    const nome = (aba === 'receber' ? d.cliente : d.fornecedor) || 'Não informado'
    acc[nome] = (acc[nome] || 0) + parseFloat(d.valor)
    return acc
  }, {} as Record<string, number>)

  const evolucaoMensal = dadosComStatus.reduce((acc, d) => {
    const mes = d.data_vencimento.substring(0, 7)
    acc[mes] = (acc[mes] || 0) + parseFloat(d.valor)
    return acc
  }, {} as Record<string, number>)

  const exportarExcel = () => {
    if (dadosComStatus.length === 0) { alert('Nenhum dado para exportar.'); return }
    const linhas = dadosComStatus.map(d => ({
      Descrição: d.descricao,
      [aba === 'receber' ? 'Cliente' : 'Fornecedor']: (aba === 'receber' ? d.cliente : d.fornecedor) || '',
      Categoria: d.categoria || '',
      'Valor (R$)': parseFloat(d.valor).toFixed(2),
      Vencimento: new Date(d.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR'),
      Status: d.statusFinal,
      'Forma de Pagamento': d.forma_pagamento || '',
      'Nota Fiscal': d.numero_nota || '',
      Observação: d.observacao || '',
    }))
    const csv = [Object.keys(linhas[0]).join(';'), ...linhas.map(l => Object.values(l).join(';'))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_${aba}_${filtros.dataInicio}_${filtros.dataFim}.csv`
    a.click()
  }

  const imprimirPDF = () => {
    window.print()
  }

  const statusLabel = (s: string) => {
    if (s === 'recebido') return 'Recebido'
    if (s === 'pago') return 'Pago'
    if (s === 'atrasado') return 'Atrasado'
    return 'Pendente'
  }

  const statusColor = (s: string) => {
    if (s === 'recebido' || s === 'pago') return { bg: '#dcfce7', text: '#15803d' }
    if (s === 'atrasado') return { bg: '#fee2e2', text: '#dc2626' }
    return { bg: '#fef9c3', text: '#a16207' }
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full { width: 100% !important; margin: 0 !important; padding: 0 !important; }
          body { font-size: 11px; }
        }
      `}</style>

      <div className="px-6 py-6 print-full">
        <div className="max-w-6xl mx-auto">

          <div className="flex items-center justify-between mb-6 no-print">
            <h2 className="text-2xl font-bold text-gray-800">Relatórios</h2>
            <div className="flex gap-3">
              <button onClick={exportarExcel} className="flex items-center gap-2 text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Exportar Excel
              </button>
              <button onClick={imprimirPDF} className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Imprimir / PDF
              </button>
            </div>
          </div>

          {/* ABAS */}
          <div className="flex gap-2 mb-6 no-print">
            <button
              onClick={() => setAba('receber')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${aba === 'receber' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              Contas a Receber
            </button>
            <button
              onClick={() => setAba('pagar')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${aba === 'pagar' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              Contas a Pagar
            </button>
          </div>

          {/* FILTROS */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 no-print">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Data início</label>
                <input type="date" value={filtros.dataInicio} onChange={e => setFiltros({...filtros, dataInicio: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Data fim</label>
                <input type="date" value={filtros.dataFim} onChange={e => setFiltros({...filtros, dataFim: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select value={filtros.status} onChange={e => setFiltros({...filtros, status: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  <option value="todos">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="atrasado">Atrasado</option>
                  <option value={aba === 'receber' ? 'recebido' : 'pago'}>{aba === 'receber' ? 'Recebido' : 'Pago'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Categoria</label>
                <select value={filtros.categoria} onChange={e => setFiltros({...filtros, categoria: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  <option value="">Todas</option>
                  {categoriasList.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">{aba === 'receber' ? 'Cliente' : 'Fornecedor'}</label>
                <select value={filtros.clienteFornecedor} onChange={e => setFiltros({...filtros, clienteFornecedor: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  <option value="">Todos</option>
                  {clientesList.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* HEADER IMPRESSÃO */}
          <div className="hidden print:block mb-6">
            <h1 className="text-xl font-bold">Relatório de {aba === 'receber' ? 'Contas a Receber' : 'Contas a Pagar'}</h1>
            <p className="text-sm text-gray-500">Período: {new Date(filtros.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(filtros.dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Carregando...</div>
          ) : (
            <>
              {/* RESUMO */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Total geral</p>
                  <p className="text-xl font-bold text-gray-800">{fmt(totalGeral)}</p>
                  <p className="text-xs text-gray-400 mt-1">{dadosComStatus.length} lançamentos</p>
                </div>
                <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
                  <p className="text-xs text-yellow-600 mb-1">Pendente</p>
                  <p className="text-xl font-bold text-yellow-700">{fmt(totalPendente)}</p>
                </div>
                <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                  <p className="text-xs text-red-600 mb-1">Atrasado</p>
                  <p className="text-xl font-bold text-red-700">{fmt(totalAtrasado)}</p>
                </div>
                <div className="bg-green-50 rounded-xl border border-green-200 p-4">
                  <p className="text-xs text-green-600 mb-1">{aba === 'receber' ? 'Recebido' : 'Pago'}</p>
                  <p className="text-xl font-bold text-green-700">{fmt(totalQuitado)}</p>
                </div>
              </div>

              {/* TOTAIS POR CATEGORIA E CLIENTE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-700">Total por categoria</h3>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                        <tr key={cat} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-700">{cat}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-800">{fmt(val)}</td>
                          <td className="px-4 py-2.5 text-right text-xs text-gray-400">{totalGeral > 0 ? `${((val / totalGeral) * 100).toFixed(0)}%` : '—'}</td>
                        </tr>
                      ))}
                      {Object.keys(porCategoria).length === 0 && (
                        <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400">Nenhum dado</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-700">Total por {aba === 'receber' ? 'cliente' : 'fornecedor'}</h3>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(porClienteFornecedor).sort((a, b) => b[1] - a[1]).map(([nome, val]) => (
                        <tr key={nome} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-700">{nome}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-800">{fmt(val)}</td>
                          <td className="px-4 py-2.5 text-right text-xs text-gray-400">{totalGeral > 0 ? `${((val / totalGeral) * 100).toFixed(0)}%` : '—'}</td>
                        </tr>
                      ))}
                      {Object.keys(porClienteFornecedor).length === 0 && (
                        <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400">Nenhum dado</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* EVOLUÇÃO MENSAL */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700">Evolução mensal</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium">Mês</th>
                      <th className="text-right px-4 py-2.5 font-medium">Total</th>
                      <th className="text-right px-4 py-2.5 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(evolucaoMensal).sort().map(([mes, val]) => {
                      const [ano, m] = mes.split('-')
                      const nomeMes = new Date(parseInt(ano), parseInt(m) - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
                      return (
                        <tr key={mes} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-700 capitalize">{nomeMes}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-800">{fmt(val)}</td>
                          <td className="px-4 py-2.5 text-right text-xs text-gray-400">{totalGeral > 0 ? `${((val / totalGeral) * 100).toFixed(0)}%` : '—'}</td>
                        </tr>
                      )
                    })}
                    {Object.keys(evolucaoMensal).length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400">Nenhum dado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* LISTAGEM COMPLETA */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Listagem completa</h3>
                  <span className="text-xs text-gray-400">{dadosComStatus.length} registros</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800 text-white">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium">Descrição</th>
                        <th className="text-left px-4 py-2.5 font-medium">{aba === 'receber' ? 'Cliente' : 'Fornecedor'}</th>
                        <th className="text-left px-4 py-2.5 font-medium">Categoria</th>
                        <th className="text-right px-4 py-2.5 font-medium">Valor</th>
                        <th className="text-left px-4 py-2.5 font-medium">Vencimento</th>
                        <th className="text-left px-4 py-2.5 font-medium">Status</th>
                        <th className="text-left px-4 py-2.5 font-medium no-print">Pagamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosComStatus.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum lançamento encontrado.</td></tr>
                      ) : (
                        dadosComStatus.map(d => (
                          <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-gray-800">{d.descricao}</td>
                            <td className="px-4 py-2.5 text-gray-600">{(aba === 'receber' ? d.cliente : d.fornecedor) || '-'}</td>
                            <td className="px-4 py-2.5 text-gray-600">{d.categoria || '-'}</td>
                            <td className="px-4 py-2.5 text-right font-medium text-gray-800">{fmt(parseFloat(d.valor))}</td>
                            <td className="px-4 py-2.5 text-gray-600">{new Date(d.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                            <td className="px-4 py-2.5">
                              <span style={{background: statusColor(d.statusFinal).bg, color: statusColor(d.statusFinal).text, padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 500}}>
                                {statusLabel(d.statusFinal)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-600 no-print">{d.forma_pagamento || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 font-bold text-gray-800">Total</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(totalGeral)}</td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}