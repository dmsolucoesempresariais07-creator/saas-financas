'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mostrarFormReceber, setMostrarFormReceber] = useState(false)
  const [mostrarFormPagar, setMostrarFormPagar] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [formReceber, setFormReceber] = useState({ nome: '', descricao: '' })
  const [formPagar, setFormPagar] = useState({ nome: '', descricao: '' })

  useEffect(() => {
    carregarCategorias()
  }, [])

  const carregarCategorias = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user?.id)
      .order('nome', { ascending: true })
    if (error) alert('Erro ao carregar: ' + error.message)
    setCategorias(data || [])
    setLoading(false)
  }

  const salvarReceber = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (editando && editando.tipo === 'receber') {
      await supabase.from('categorias').update({ nome: formReceber.nome, descricao: formReceber.descricao }).eq('id', editando.id)
    } else {
      await supabase.from('categorias').insert({ nome: formReceber.nome, descricao: formReceber.descricao, tipo: 'receber', user_id: user?.id })
    }

    setFormReceber({ nome: '', descricao: '' })
    setMostrarFormReceber(false)
    setEditando(null)
    carregarCategorias()
    setSalvando(false)
  }

  const salvarPagar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (editando && editando.tipo === 'pagar') {
      await supabase.from('categorias').update({ nome: formPagar.nome, descricao: formPagar.descricao }).eq('id', editando.id)
    } else {
      await supabase.from('categorias').insert({ nome: formPagar.nome, descricao: formPagar.descricao, tipo: 'pagar', user_id: user?.id })
    }

    setFormPagar({ nome: '', descricao: '' })
    setMostrarFormPagar(false)
    setEditando(null)
    carregarCategorias()
    setSalvando(false)
  }

  const abrirEdicao = (c: any) => {
    setEditando(c)
    if (c.tipo === 'receber') {
      setFormReceber({ nome: c.nome, descricao: c.descricao || '' })
      setMostrarFormReceber(true)
    } else {
      setFormPagar({ nome: c.nome, descricao: c.descricao || '' })
      setMostrarFormPagar(true)
    }
  }

  const excluir = async (id: string) => {
    if (!confirm('Deseja excluir esta categoria?')) return
    await supabase.from('categorias').delete().eq('id', id)
    carregarCategorias()
  }

  const categoriasReceber = categorias.filter(c => c.tipo === 'receber')
  const categoriasPagar = categorias.filter(c => c.tipo === 'pagar')

  const TabelaCategoria = ({ lista, tipo }: { lista: any[], tipo: string }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-800 text-white">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Categoria</th>
            <th className="text-left px-4 py-3 font-medium">Descricao</th>
            <th className="text-left px-4 py-3 font-medium">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={3} className="px-4 py-4 text-gray-400">Carregando...</td></tr>
          ) : lista.length === 0 ? (
            <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Nenhuma categoria cadastrada.</td></tr>
          ) : (
            lista.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{c.nome}</td>
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
  )

  return (
    <div className="px-6 py-8">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Categorias</h2>
          <p className="text-sm text-gray-500 mt-1">Gerencie as categorias de lancamentos</p>
        </div>

        {/* BLOCO CONTAS A RECEBER */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <h3 className="text-lg font-semibold text-gray-800">Categorias de Contas a Receber</h3>
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{categoriasReceber.length}</span>
            </div>
            <button
              onClick={() => { setEditando(null); setFormReceber({ nome: '', descricao: '' }); setMostrarFormReceber(!mostrarFormReceber) }}
              className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nova categoria
            </button>
          </div>

          {mostrarFormReceber && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
              <h4 className="text-sm font-semibold text-blue-800 mb-3">{editando ? 'Editar categoria' : 'Nova categoria de Contas a Receber'}</h4>
              <form onSubmit={salvarReceber} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formReceber.nome}
                    onChange={e => setFormReceber({...formReceber, nome: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Receita com Produtos"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
                  <input
                    type="text"
                    value={formReceber.descricao}
                    onChange={e => setFormReceber({...formReceber, descricao: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Descricao opcional"
                  />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" disabled={salvando} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {salvando ? 'Salvando...' : editando ? 'Salvar alteracoes' : 'Cadastrar'}
                  </button>
                  <button type="button" onClick={() => { setMostrarFormReceber(false); setEditando(null) }} className="border border-gray-300 px-6 py-2 rounded-lg text-sm hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          <TabelaCategoria lista={categoriasReceber} tipo="receber" />
        </div>

        {/* DIVISOR */}
        <div className="border-t border-gray-200 my-8" />

        {/* BLOCO CONTAS A PAGAR */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <h3 className="text-lg font-semibold text-gray-800">Categorias de Contas a Pagar</h3>
              <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">{categoriasPagar.length}</span>
            </div>
            <button
              onClick={() => { setEditando(null); setFormPagar({ nome: '', descricao: '' }); setMostrarFormPagar(!mostrarFormPagar) }}
              className="flex items-center gap-2 text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nova categoria
            </button>
          </div>

          {mostrarFormPagar && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-4">
              <h4 className="text-sm font-semibold text-red-800 mb-3">{editando ? 'Editar categoria' : 'Nova categoria de Contas a Pagar'}</h4>
              <form onSubmit={salvarPagar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formPagar.nome}
                    onChange={e => setFormPagar({...formPagar, nome: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ex: Despesas com Pessoal"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
                  <input
                    type="text"
                    value={formPagar.descricao}
                    onChange={e => setFormPagar({...formPagar, descricao: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Descricao opcional"
                  />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" disabled={salvando} className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                    {salvando ? 'Salvando...' : editando ? 'Salvar alteracoes' : 'Cadastrar'}
                  </button>
                  <button type="button" onClick={() => { setMostrarFormPagar(false); setEditando(null) }} className="border border-gray-300 px-6 py-2 rounded-lg text-sm hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          <TabelaCategoria lista={categoriasPagar} tipo="pagar" />
        </div>

      </div>
    </div>
  )
}