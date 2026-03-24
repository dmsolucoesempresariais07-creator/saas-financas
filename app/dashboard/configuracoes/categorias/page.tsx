'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [form, setForm] = useState({
    nome: '',
    tipo: 'receber',
    descricao: '',
  })

  useEffect(() => {
    carregarCategorias()
  }, [])

  const carregarCategorias = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user?.id)
      .order('tipo', { ascending: true })
    if (error) alert('Erro ao carregar: ' + error.message)
    setCategorias(data || [])
    setLoading(false)
  }

  const resetForm = () => {
    setForm({ nome: '', tipo: 'receber', descricao: '' })
    setEditando(null)
  }

  const abrirEdicao = (c: any) => {
    setForm({ nome: c.nome, tipo: c.tipo, descricao: c.descricao || '' })
    setEditando(c)
    setMostrarForm(true)
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (editando) {
      const { error } = await supabase
        .from('categorias')
        .update({ ...form })
        .eq('id', editando.id)
      if (error) { alert('Erro: ' + error.message); setSalvando(false); return }
    } else {
      const { error } = await supabase
        .from('categorias')
        .insert({ ...form, user_id: user?.id })
      if (error) { alert('Erro: ' + error.message); setSalvando(false); return }
    }

    resetForm()
    setMostrarForm(false)
    carregarCategorias()
    setSalvando(false)
  }

  const excluir = async (id: string) => {
    if (!confirm('Deseja excluir esta categoria?')) return
    await supabase.from('categorias').delete().eq('id', id)
    carregarCategorias()
  }

  const filtradas = categorias.filter(c =>
    filtroTipo === 'todos' || c.tipo === filtroTipo
  )

  const totalReceber = categorias.filter(c => c.tipo === 'receber').length
  const totalPagar = categorias.filter(c => c.tipo === 'pagar').length
  const totalAmbos = categorias.filter(c => c.tipo === 'ambos').length

  return (
    <div className="px-6 py-8">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Categorias</h2>
            <p className="text-sm text-gray-500 mt-1">Gerencie as categorias de lancamentos</p>
          </div>
          <button
            onClick={() => { resetForm(); setMostrarForm(true) }}
            className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova categoria
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <p className="text-xs text-blue-600 mb-1">Contas a Receber</p>
            <p className="text-2xl font-bold text-blue-700">{totalReceber}</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4">
            <p className="text-xs text-red-600 mb-1">Contas a Pagar</p>
            <p className="text-2xl font-bold text-red-700">{totalPagar}</p>
          </div>
          <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
            <p className="text-xs text-purple-600 mb-1">Ambos</p>
            <p className="text-2xl font-bold text-purple-700">{totalAmbos}</p>
          </div>
        </div>

        {mostrarForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">
              {editando ? 'Editar categoria' : 'Nova categoria'}
            </h3>
            <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da categoria *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm({...form, nome: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Vendas, Aluguel, Servicos..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usar em *</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm({...form, tipo: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="receber">Contas a Receber</option>
                  <option value="pagar">Contas a Pagar</option>
                  <option value="ambos">Ambos</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={e => setForm({...form, descricao: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descricao opcional"
                />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={salvando}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : editando ? 'Salvar alteracoes' : 'Cadastrar'}
                </button>
                <button
                  type="button"
                  onClick={() => { resetForm(); setMostrarForm(false) }}
                  className="border border-gray-300 px-6 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Filtrar por</label>
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="todos">Todos</option>
              <option value="receber">Contas a Receber</option>
              <option value="pagar">Contas a Pagar</option>
              <option value="ambos">Ambos</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Categoria</th>
                <th className="text-left px-4 py-3 font-medium">Usar em</th>
                <th className="text-left px-4 py-3 font-medium">Descricao</th>
                <th className="text-left px-4 py-3 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-4 text-gray-400">Carregando...</td></tr>
              ) : filtradas.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Nenhuma categoria cadastrada.</td></tr>
              ) : (
                filtradas.map(c => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.nome}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        c.tipo === 'receber' ? 'bg-blue-100 text-blue-700' :
                        c.tipo === 'pagar' ? 'bg-red-100 text-red-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {c.tipo === 'receber' ? 'Contas a Receber' : c.tipo === 'pagar' ? 'Contas a Pagar' : 'Ambos'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.descricao || '-'}</td>
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