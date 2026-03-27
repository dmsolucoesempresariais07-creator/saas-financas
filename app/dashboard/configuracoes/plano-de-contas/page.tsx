'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function PlanoDeContasPage() {
  const [subcontas, setSubcontas] = useState<any[]>([])
  const [categoriasPai, setCategoriasPai] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')
  const [porPagina, setPorPagina] = useState(25)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [menuAberto, setMenuAberto] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState({
    descricao: '',
    categoria: '',
  })

  useEffect(() => { carregarDados() }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const carregarDados = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: cats } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user?.id)
      .eq('ativo', true)
      .is('parent_id', null)
      .order('codigo', { ascending: true })

    setCategoriasPai(cats || [])

    const { data: subs } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user?.id)
      .eq('ativo', true)
      .not('parent_id', 'is', null)
      .order('codigo', { ascending: true })

    setSubcontas(subs || [])
    setLoading(false)
  }

  const getCodigoSimples = (sub: any, lista: any[]) => {
    const subsOrdenadas = lista
      .filter(s => s.parent_id === sub.parent_id)
      .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''))
    const idx = subsOrdenadas.findIndex(s => s.id === sub.id)
    return idx + 1
  }

  const gerarProximoCodigo = (parentId: string) => {
    const pai = categoriasPai.find(c => c.id === parentId)
    if (!pai) return ''
    const existentes = subcontas.filter(s => s.parent_id === parentId)
    return `${pai.codigo}.${existentes.length + 1}`
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.categoria) { alert('Selecione a Categoria!'); return }
    if (!form.descricao.trim()) { alert('Preencha a Descrição!'); return }
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()
    const pai = categoriasPai.find(c => c.id === form.categoria)

    if (editando) {
      const { error } = await supabase.from('categorias').update({
        nome: form.descricao,
        parent_id: form.categoria,
        linha_dre: pai?.linha_dre || editando.linha_dre,
      }).eq('id', editando.id)

      if (error) { alert('Erro: ' + error.message); setSalvando(false); return }

      if (form.descricao !== editando.nome) {
        await supabase.from('contas_receber').update({ categoria: form.descricao }).eq('categoria', editando.nome)
        await supabase.from('contas_pagar').update({ categoria: form.descricao }).eq('categoria', editando.nome)
        await supabase.from('categorias_log').insert({
          categoria_id: editando.id, user_id: user?.id,
          campo_alterado: 'nome', valor_anterior: editando.nome, valor_novo: form.descricao,
        })
      }
    } else {
      if (!pai) { alert('Categoria não encontrada!'); setSalvando(false); return }
      const existentes = subcontas.filter(s => s.parent_id === pai.id)
      const codigo = `${pai.codigo}.${existentes.length + 1}`

      const { error } = await supabase.from('categorias').insert({
        nome: form.descricao,
        tipo: 'ambos',
        linha_dre: pai.linha_dre,
        subtipo: 'Débito',
        parent_id: pai.id,
        codigo,
        ativo: true,
        user_id: user?.id,
      })
      if (error) { alert('Erro: ' + error.message); setSalvando(false); return }
    }

    resetForm()
    carregarDados()
    setSalvando(false)
  }

  const excluir = async (sub: any) => {
    if (!confirm(`Deseja excluir "${sub.nome}"?`)) return
    await supabase.from('categorias').update({ ativo: false }).eq('id', sub.id)
    carregarDados()
    resetForm()
  }

  const abrirEdicao = (sub: any) => {
    setEditando(sub)
    setForm({ descricao: sub.nome, categoria: sub.parent_id || '' })
    setMostrarForm(true)
    setMenuAberto(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setForm({ descricao: '', categoria: '' })
    setEditando(null)
    setMostrarForm(false)
  }

  const filtradas = subcontas
    .filter(s => !busca || s.nome.toLowerCase().includes(busca.toLowerCase()) || (s.codigo || '').includes(busca))
    .slice(0, porPagina)

  const BotaoAcoes = ({ sub }: { sub: any }) => (
    <div className="relative" ref={menuAberto === sub.id ? menuRef : null}>
      <button
        onClick={() => setMenuAberto(menuAberto === sub.id ? null : sub.id)}
        className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition"
      >
        Ações
        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {menuAberto === sub.id && (
        <div className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-28">
          <button onClick={() => abrirEdicao(sub)}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar
          </button>
          <button onClick={() => { setMenuAberto(null); excluir(sub) }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Excluir
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="px-6 py-8">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Plano de Contas</h2>
            <p className="text-xs text-gray-400 mt-1">Home / Configurações / Plano de Contas</p>
          </div>
          <button
            onClick={() => { resetForm(); setMostrarForm(true) }}
            className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Nova Subconta
          </button>
        </div>

        {mostrarForm && (
          <div className="bg-white rounded-xl border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">
                {editando ? 'Editar Subconta' : 'Nova Subconta'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Home / Configurações / Plano de Contas / {editando ? 'Editar' : 'Cadastro'}
              </p>
            </div>

            <form onSubmit={salvar} className="px-6 py-5">
              <div className="grid grid-cols-4 gap-3 mb-5 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Código Estruturado</label>
                  <input
                    type="text"
                    value={editando ? editando.codigo : (form.categoria ? gerarProximoCodigo(form.categoria) : '')}
                    disabled
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 text-center"
                    placeholder="Auto"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Categoria <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.categoria}
                    onChange={e => setForm({...form, categoria: e.target.value})}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${!form.categoria ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    required
                  >
                    <option value="">Selecione...</option>
                    {categoriasPai.map(c => (
                      <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Descrição <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.descricao}
                    onChange={e => setForm({...form, descricao: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Nome da subconta"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={salvando}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
                {editando && (
                  <button type="button" onClick={() => excluir(editando)}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
                    Excluir
                  </button>
                )}
                <button type="button" onClick={resetForm}
                  className="border border-gray-300 px-6 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <select value={porPagina} onChange={e => setPorPagina(parseInt(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-500">resultados por página</span>
          </div>
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Pesquisar" />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">Código</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-32">Cód. Estruturado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Descrição</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Categoria</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                      Nenhuma subconta cadastrada.
                    </td>
                  </tr>
                ) : (
                  filtradas.map((sub, idx) => {
                    const pai = categoriasPai.find(c => c.id === sub.parent_id)
                    const codigoSimples = getCodigoSimples(sub, subcontas)
                    const isEven = idx % 2 === 0
                    return (
                      <tr key={sub.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isEven ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="px-4 py-3 font-medium text-gray-700 text-center">{codigoSimples}</td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{sub.codigo}</td>
                        <td className="px-4 py-3 text-gray-800">{sub.nome}</td>
                        <td className="px-4 py-3">
                          {pai ? (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                              {pai.codigo} — {pai.nome}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <BotaoAcoes sub={sub} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">Mostrando {filtradas.length} de {subcontas.length} subcontas</span>
              <span className="text-xs text-gray-400">{subcontas.length} registro{subcontas.length !== 1 ? 's' : ''} no total</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}