'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ContasReceberPage() {
  const [contas, setContas] = useState<any[]>([])
  const [categoriasList, setCategoriasList] = useState<any[]>([])
  const [clientesList, setClientesList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [clienteDigitado, setClienteDigitado] = useState('')
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false)
  const [salvandoCliente, setSalvandoCliente] = useState(false)
  const [formCliente, setFormCliente] = useState({
    nome: '', cpf_cnpj: '', email: '', telefone: '', endereco: '', cidade: '', estado: '', observacoes: ''
  })
  const clienteRef = useRef<HTMLDivElement>(null)
  const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
  const [form, setForm] = useState({
    descricao: '', valor: '', data_vencimento: '', cliente: '', categoria: '',
    centro_custo: '', numero_nota: '', observacao: '', forma_pagamento: '',
    recorrente: false, parcelado: false, total_parcelas: '1',
  })
  const router = useRouter()

  useEffect(() => {
    carregarContas()
    carregarCategorias()
    carregarClientes()
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (clienteRef.current && !clienteRef.current.contains(e.target as Node)) {
        setMostrarSugestoes(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const carregarCategorias = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('categorias').select('*').eq('user_id', user?.id).in('tipo', ['receber', 'ambos']).order('nome', { ascending: true })
    setCategoriasList(data || [])
  }

  const carregarClientes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('clientes_fornecedores').select('*').eq('user_id', user?.id).in('tipo', ['cliente', 'ambos']).order('nome', { ascending: true })
    setClientesList(data || [])
  }

  const carregarContas = async () => {
    const { data, error } = await supabase.from('contas_receber').select('*').order('data_vencimento', { ascending: true })
    if (error) alert('Erro ao carregar: ' + error.message)
    setContas(data || [])
    setLoading(false)
  }

  const cadastrarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoCliente(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('clientes_fornecedores').insert({
      ...formCliente, tipo: 'cliente', user_id: user?.id
    })
    if (error) { alert('Erro: ' + error.message); setSalvandoCliente(false); return }
    await carregarClientes()
    setForm({...form, cliente: formCliente.nome})
    setClienteDigitado(formCliente.nome)
    setFormCliente({ nome: '', cpf_cnpj: '', email: '', telefone: '', endereco: '', cidade: '', estado: '', observacoes: '' })
    setMostrarModalCliente(false)
    setMostrarSugestoes(false)
    setSalvandoCliente(false)
  }

  const sugestoesFiltradas = clienteDigitado.length >= 1
    ? clientesList.filter(c => c.nome.toLowerCase().includes(clienteDigitado.toLowerCase()))
    : []

  const clienteExisteNaLista = clientesList.some(c => c.nome.toLowerCase() === clienteDigitado.toLowerCase())

  const adicionarConta = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    const grupoId = crypto.randomUUID()
    const totalParcelas = form.parcelado ? parseInt(form.total_parcelas) : 1
    const registros = []
    for (let i = 0; i < totalParcelas; i++) {
      const dataBase = new Date(form.data_vencimento + 'T00:00:00')
      dataBase.setMonth(dataBase.getMonth() + i)
      registros.push({
        descricao: form.parcelado ? `${form.descricao} (Parcela ${i + 1}/${totalParcelas})` : form.descricao,
        valor: parseFloat(form.valor), data_vencimento: dataBase.toISOString().split('T')[0],
        cliente: form.cliente, categoria: form.categoria, centro_custo: form.centro_custo,
        numero_nota: form.numero_nota, observacao: form.observacao, forma_pagamento: form.forma_pagamento,
        recorrente: form.recorrente, parcelado: form.parcelado, total_parcelas: totalParcelas,
        parcela_atual: i + 1, grupo_id: grupoId, status: 'pendente',
      })
    }
    const { error } = await supabase.from('contas_receber').insert(registros)
    if (error) { alert('Erro: ' + error.message); setSalvando(false); return }
    setForm({ descricao: '', valor: '', data_vencimento: '', cliente: '', categoria: '', centro_custo: '', numero_nota: '', observacao: '', forma_pagamento: '', recorrente: false, parcelado: false, total_parcelas: '1' })
    setClienteDigitado('')
    setMostrarForm(false)
    carregarContas()
    setSalvando(false)
  }

  const marcarStatus = async (id: string, status: string) => {
    await supabase.from('contas_receber').update({ status, data_recebimento: status === 'recebido' ? new Date().toISOString().split('T')[0] : null }).eq('id', id)
    carregarContas()
  }

  const excluir = async (conta: any) => {
    if (conta.parcelado && conta.grupo_id) {
      const confirmar = confirm(`Conta parcelada (${conta.parcela_atual}/${conta.total_parcelas}).\nOK = Excluir todas | Cancelar = Excluir apenas esta`)
      if (confirmar) await supabase.from('contas_receber').delete().eq('grupo_id', conta.grupo_id)
      else if (confirm('Excluir apenas esta?')) await supabase.from('contas_receber').delete().eq('id', conta.id)
    } else if (confirm('Excluir esta conta?')) {
      await supabase.from('contas_receber').delete().eq('id', conta.id)
    }
    carregarContas()
  }

  const gerarProximoMes = async (conta: any) => {
    const d = new Date(conta.data_vencimento + 'T00:00:00')
    d.setMonth(d.getMonth() + 1)
    const { error } = await supabase.from('contas_receber').insert({ ...conta, id: undefined, data_vencimento: d.toISOString().split('T')[0], status: 'pendente', recorrente: true, parcelado: false, total_parcelas: 1, parcela_atual: 1 })
    if (error) alert('Erro: ' + error.message)
    else carregarContas()
  }

  const exportarExcel = () => {
    if (contasFiltradas.length === 0) { alert('Nenhuma conta para exportar.'); return }
    const linhas = contasFiltradas.map(c => ({ Descricao: c.descricao, Cliente: c.cliente || '', Categoria: c.categoria || '', 'Valor (R$)': parseFloat(c.valor).toFixed(2), Vencimento: new Date(c.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR'), Status: c.status }))
    const csv = [Object.keys(linhas[0]).join(';'), ...linhas.map(l => Object.values(l).join(';'))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contas_receber.csv'
    a.click()
  }

  const hoje = new Date().toISOString().split('T')[0]
  const contasFiltradas = contas.filter(c => {
    const statusOk = filtroStatus === 'todos' || c.status === filtroStatus
    const inicioOk = !filtroDataInicio || c.data_vencimento >= filtroDataInicio
    const fimOk = !filtroDataFim || c.data_vencimento <= filtroDataFim
    return statusOk && inicioOk && fimOk
  }).map(c => ({ ...c, status: c.status !== 'recebido' && c.data_vencimento < hoje ? 'atrasado' : c.status }))

  const totalPendente = contasFiltradas.filter(c => c.status === 'pendente').reduce((s, c) => s + parseFloat(c.valor), 0)
  const totalAtrasado = contasFiltradas.filter(c => c.status === 'atrasado').reduce((s, c) => s + parseFloat(c.valor), 0)
  const totalRecebido = contasFiltradas.filter(c => c.status === 'recebido').reduce((s, c) => s + parseFloat(c.valor), 0)
  const totalGeral = contasFiltradas.reduce((s, c) => s + parseFloat(c.valor), 0)

  return (
    <div className="px-6 py-6">
      <div className="max-w-6xl mx-auto">

        {/* MODAL CADASTRO CLIENTE */}
        {mostrarModalCliente && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Novo cliente</h3>
                <button onClick={() => setMostrarModalCliente(false)} className="text-gray-400 hover:text-gray-600">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <form onSubmit={cadastrarCliente} className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input type="text" value={formCliente.nome} onChange={e => setFormCliente({...formCliente, nome: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome ou razao social" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
                  <input type="text" value={formCliente.cpf_cnpj} onChange={e => setFormCliente({...formCliente, cpf_cnpj: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input type="text" value={formCliente.telefone} onChange={e => setFormCliente({...formCliente, telefone: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="(00) 00000-0000" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formCliente.email} onChange={e => setFormCliente({...formCliente, email: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="email@empresa.com" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereco</label>
                  <input type="text" value={formCliente.endereco} onChange={e => setFormCliente({...formCliente, endereco: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Rua, numero, complemento" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  <input type="text" value={formCliente.cidade} onChange={e => setFormCliente({...formCliente, cidade: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Cidade" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select value={formCliente.estado} onChange={e => setFormCliente({...formCliente, estado: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione</option>
                    {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
                  <textarea value={formCliente.observacoes} onChange={e => setFormCliente({...formCliente, observacoes: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Informacoes adicionais" />
                </div>
                <div className="md:col-span-2 flex gap-3 pb-2">
                  <button type="submit" disabled={salvandoCliente} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {salvandoCliente ? 'Cadastrando...' : 'Cadastrar cliente'}
                  </button>
                  <button type="button" onClick={() => setMostrarModalCliente(false)} className="flex-1 border border-gray-300 py-2.5 rounded-lg text-sm hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Contas a Receber</h2>
          <div className="flex gap-3">
            <button onClick={exportarExcel} className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50">Exportar Excel</button>
            <button onClick={() => setMostrarForm(!mostrarForm)} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ Nova conta</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-500 mb-1">Total geral</p><p className="text-xl font-bold text-gray-800">R$ {totalGeral.toFixed(2)}</p></div>
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4"><p className="text-xs text-yellow-600 mb-1">Pendente</p><p className="text-xl font-bold text-yellow-700">R$ {totalPendente.toFixed(2)}</p></div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4"><p className="text-xs text-red-600 mb-1">Atrasado</p><p className="text-xl font-bold text-red-700">R$ {totalAtrasado.toFixed(2)}</p></div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4"><p className="text-xs text-green-600 mb-1">Recebido</p><p className="text-xl font-bold text-green-700">R$ {totalRecebido.toFixed(2)}</p></div>
        </div>

        {mostrarForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Nova conta a receber</h3>
            <form onSubmit={adicionarConta} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descricao *</label>
                <input type="text" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" placeholder="Ex: Servico prestado" required />
              </div>

              <div ref={clienteRef} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <div className="relative">
                  <input
                    type="text"
                    value={clienteDigitado}
                    onChange={e => { setClienteDigitado(e.target.value); setForm({...form, cliente: e.target.value}); setMostrarSugestoes(true) }}
                    onFocus={() => { if (clienteDigitado.length >= 1) setMostrarSugestoes(true) }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Digite o nome do cliente..."
                    autoComplete="off"
                  />
                  {clienteDigitado && (
                    <button type="button" onClick={() => { setClienteDigitado(''); setForm({...form, cliente: ''}); setMostrarSugestoes(false) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
                {mostrarSugestoes && clienteDigitado.length >= 1 && (
                  <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                    <div className="max-h-44 overflow-y-auto">
                      {sugestoesFiltradas.length > 0 ? (
                        sugestoesFiltradas.map(c => (
                          <button key={c.id} type="button" onClick={() => { setClienteDigitado(c.nome); setForm({...form, cliente: c.nome}); setMostrarSugestoes(false) }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 text-gray-800 flex items-center gap-2 border-b border-gray-50 last:border-0">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-medium flex-shrink-0">{c.nome[0].toUpperCase()}</div>
                            <span>{c.nome}</span>
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-2.5 text-sm text-gray-400">Nenhum cliente encontrado</p>
                      )}
                    </div>
                    {clienteDigitado.length > 0 && !clienteExisteNaLista && (
                      <div className="border-t border-gray-100">
                        <button type="button" onClick={() => { setFormCliente({...formCliente, nome: clienteDigitado}); setMostrarModalCliente(true); setMostrarSugestoes(false) }}
                          className="w-full text-left px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          </div>
                          <span>Cadastrar "{clienteDigitado}" como novo cliente</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
                <input type="number" step="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" placeholder="0,00" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data primeiro vencimento *</label>
                <input type="date" value={form.data_vencimento} onChange={e => setForm({...form, data_vencimento: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm">
                  <option value="">Selecione</option>
                  {categoriasList.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pagamento</label>
                <select value={form.forma_pagamento} onChange={e => setForm({...form, forma_pagamento: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm">
                  <option value="">Selecione</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Cartao de Credito">Cartao de Credito</option>
                  <option value="Cartao de Debito">Cartao de Debito</option>
                  <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Centro de custo</label>
                <input type="text" value={form.centro_custo} onChange={e => setForm({...form, centro_custo: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" placeholder="Ex: Comercial" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numero da nota fiscal</label>
                <input type="text" value={form.numero_nota} onChange={e => setForm({...form, numero_nota: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" placeholder="Ex: NF-001" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacao</label>
                <input type="text" value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" placeholder="Observacoes adicionais" />
              </div>
              <div className="md:col-span-2 border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-3">Tipo de lancamento</p>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.recorrente} onChange={e => setForm({...form, recorrente: e.target.checked, parcelado: false})} className="w-4 h-4" />
                    <span className="text-sm text-gray-700">Recorrente</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.parcelado} onChange={e => setForm({...form, parcelado: e.target.checked, recorrente: false})} className="w-4 h-4" />
                    <span className="text-sm text-gray-700">Parcelado</span>
                  </label>
                </div>
                {form.parcelado && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Numero de parcelas</label>
                    <input type="number" min="2" max="60" value={form.total_parcelas} onChange={e => setForm({...form, total_parcelas: e.target.value})} className="w-32 border border-gray-300 rounded-lg px-4 py-2 text-sm" />
                  </div>
                )}
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" disabled={salvando} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {salvando ? 'Salvando...' : form.parcelado ? `Gerar ${form.total_parcelas} parcelas` : 'Salvar conta'}
                </button>
                <button type="button" onClick={() => { setMostrarForm(false); setClienteDigitado('') }} className="border border-gray-300 px-6 py-2 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              <option value="todos">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="atrasado">Atrasado</option>
              <option value="recebido">Recebido</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data inicio</label>
            <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data fim</label>
            <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Descricao</th>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Categoria</th>
                <th className="text-left px-4 py-3 font-medium">Valor</th>
                <th className="text-left px-4 py-3 font-medium">Vencimento</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-4 text-gray-400">Carregando...</td></tr>
              ) : contasFiltradas.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-4 text-gray-400">Nenhuma conta encontrada.</td></tr>
              ) : (
                contasFiltradas.map((conta) => (
                  <tr key={conta.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{conta.descricao}</td>
                    <td className="px-4 py-3 text-gray-600">{conta.cliente || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{conta.categoria || '-'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">R$ {parseFloat(conta.valor).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(conta.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3">
                      {conta.recorrente && <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">Recorrente</span>}
                      {conta.parcelado && <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">{conta.parcela_atual}/{conta.total_parcelas}</span>}
                      {!conta.recorrente && !conta.parcelado && <span className="text-gray-400 text-xs">Normal</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${conta.status === 'recebido' ? 'bg-green-100 text-green-700' : conta.status === 'atrasado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {conta.status === 'recebido' ? 'Recebido' : conta.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <button onClick={() => router.push(`/dashboard/contas-receber/editar/${conta.id}`)} className="text-blue-600 hover:underline text-xs">Editar</button>
                        {conta.status !== 'recebido' && <button onClick={() => marcarStatus(conta.id, 'recebido')} className="text-green-600 hover:underline text-xs">Marcar recebido</button>}
                        {conta.recorrente && conta.status === 'recebido' && <button onClick={() => gerarProximoMes(conta)} className="text-blue-600 hover:underline text-xs">Gerar proximo mes</button>}
                        <button onClick={() => excluir(conta)} className="text-red-500 hover:underline text-xs">Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}