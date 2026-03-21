'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [form, setForm] = useState({
    tipo: 'cliente',
    nome: '',
    cpf_cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    observacoes: '',
  })
  const router = useRouter()

  useEffect(() => {
    carregarClientes()
  }, [])

  const carregarClientes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('clientes_fornecedores')
      .select('*')
      .eq('user_id', user?.id)
      .order('nome', { ascending: true })
    if (error) alert('Erro ao carregar: ' + error.message)
    setClientes(data || [])
    setLoading(false)
  }

  const resetForm = () => {
    setForm({ tipo: 'cliente', nome: '', cpf_cnpj: '', email: '', telefone: '', endereco: '', cidade: '', estado: '', observacoes: '' })
    setEditando(null)
  }

  const abrirEdicao = (c: any) => {
    setForm({
      tipo: c.tipo,
      nome: c.nome,
      cpf_cnpj: c.cpf_cnpj || '',
      email: c.email || '',
      telefone: c.telefone || '',
      endereco: c.endereco || '',
      cidade: c.cidade || '',
      estado: c.estado || '',
      observacoes: c.observacoes || '',
    })
    setEditando(c)
    setMostrarForm(true)
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (editando) {
      const { error } = await supabase
        .from('clientes_fornecedores')
        .update({ ...form })
        .eq('id', editando.id)
      if (error) { alert('Erro: ' + error.message); setSalvando(false); return }
    } else {
      const { error } = await supabase
        .from('clientes_fornecedores')
        .insert({ ...form, user_id: user?.id })
      if (error) { alert('Erro: ' + error.message); setSalvando(false); return }
    }

    resetForm()
    setMostrarForm(false)
    carregarClientes()
    setSalvando(false)
  }

  const excluir = async (id: string) => {
    if (!confirm('Deseja excluir este cadastro?')) return
    await supabase.from('clientes_fornecedores').delete().eq('id', id)
    carregarClientes()
  }

  const exportarExcel = () => {
    if (filtrados.length === 0) { alert('Nenhum registro para exportar.'); return }
    const linhas = filtrados.map(c => ({
      Tipo: c.tipo,
      Nome: c.nome,
      'CPF/CNPJ': c.cpf_cnpj || '',
      Email: c.email || '',
      Telefone: c.telefone || '',
      Endereco: c.endereco || '',
      Cidade: c.cidade || '',
      Estado: c.estado || '',
      Observacoes: c.observacoes || '',
    }))
    const csv = [Object.keys(linhas[0]).join(';'), ...linhas.map(l => Object.values(l).join(';'))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clientes_fornecedores.csv'
    a.click()
  }

  const filtrados = clientes.filter(c => {
    const tipoOk = filtroTipo === 'todos' || c.tipo === filtroTipo
    const buscaOk = !busca || c.nome.toLowerCase().includes(busca.toLowerCase()) || (c.cpf_cnpj || '').includes(busca)
    return tipoOk && buscaOk
  })

  const totalClientes = clientes.filter(c => c.tipo === 'cliente').length
  const totalFornecedores = clientes.filter(c => c.tipo === 'fornecedor').length

  const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

  return (
    <div className="px-6 py-8">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Clientes e Fornecedores</h2>
            <p className="text-sm text-gray-500 mt-1">Gerencie seus contatos</p>
          </div>
          <div className="flex gap-3">
            <button onClick={exportarExcel} className="flex items-center gap-2 text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar
            </button>
            <button onClick={() => { resetForm(); setMostrarForm(true) }} className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Novo cadastro
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total de cadastros</p>
            <p className="text-2xl font-bold text-gray-800">{clientes.length}</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <p className="text-xs text-blue-600 mb-1">Clientes</p>
            <p className="text-2xl font-bold text-blue-700">{totalClientes}</p>
          </div>
          <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
            <p className="text-xs text-purple-600 mb-1">Fornecedores</p>
            <p className="text-2xl font-bold text-purple-700">{totalFornecedores}</p>
          </div>
        </div>

        {mostrarForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">{editando ? 'Editar cadastro' : 'Novo cadastro'}</h3>
            <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="cliente" checked={form.tipo === 'cliente'} onChange={e => setForm({...form, tipo: e.target.value})} className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">Cliente</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="fornecedor" checked={form.tipo === 'fornecedor'} onChange={e => setForm({...form, tipo: e.target.value})} className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">Fornecedor</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="ambos" checked={form.tipo === 'ambos'} onChange={e => setForm({...form, tipo: e.target.value})} className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">Ambos</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome ou razao social" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
                <input type="text" value={form.cpf_cnpj} onChange={e => setForm({...form, cpf_cnpj: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="000.000.000-00 ou 00.000.000/0001-00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="email@empresa.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input type="text" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="(00) 00000-0000" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereco</label>
                <input type="text" value={form.endereco} onChange={e => setForm({...form, endereco: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Rua, numero, complemento" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input type="text" value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome da cidade" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione</option>
                  {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
                <textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Informacoes adicionais" />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" disabled={salvando} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {salvando ? 'Salvando...' : editando ? 'Salvar alteracoes' : 'Cadastrar'}
                </button>
                <button type="button" onClick={() => { resetForm(); setMostrarForm(false) }} className="border border-gray-300 px-6 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs text-gray-500 mb-1">Buscar</label>
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome ou CPF/CNPJ..." />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo</label>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              <option value="todos">Todos</option>
              <option value="cliente">Clientes</option>
              <option value="fornecedor">Fornecedores</option>
              <option value="ambos">Ambos</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">CPF/CNPJ</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Telefone</th>
                <th className="text-left px-4 py-3 font-medium">Cidade/UF</th>
                <th className="text-left px-4 py-3 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-4 text-gray-400">Carregando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum cadastro encontrado.</td></tr>
              ) : (
                filtrados.map(c => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.nome}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        c.tipo === 'cliente' ? 'bg-blue-100 text-blue-700' :
                        c.tipo === 'fornecedor' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {c.tipo === 'cliente' ? 'Cliente' : c.tipo === 'fornecedor' ? 'Fornecedor' : 'Ambos'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.cpf_cnpj || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.email || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.telefone || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.cidade && c.estado ? `${c.cidade}/${c.estado}` : c.cidade || c.estado || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => abrirEdicao(c)} className="text-blue-600 hover:underline text-xs">Editar</button>
                        <button onClick={() => excluir(c.id)} className="text-red-500 hover:underline text-xs">Excluir</button>
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