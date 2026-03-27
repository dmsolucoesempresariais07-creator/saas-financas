'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const LINHAS_DRE = [
  { value: 'receitas', label: 'Receitas' },
  { value: 'deducoes_sobre_vendas', label: 'Deduções sobre vendas' },
  { value: 'custos_variaveis', label: 'Custos variáveis' },
  { value: 'custos_fixos', label: 'Custos fixos' },
  { value: 'despesas_operacionais', label: 'Despesas operacionais' },
  { value: 'resultado_financeiro', label: 'Resultado financeiro' },
  { value: 'resultado_nao_operacional', label: 'Resultado não operacional' },
  { value: 'impostos_diretos', label: 'Impostos diretos' },
  { value: 'outras_receitas', label: 'Outras receitas' },
  { value: 'outras_despesas', label: 'Outras despesas' },
  { value: 'nao_listar', label: 'Não listar no DRE' },
]

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [porPagina, setPorPagina] = useState(25)
  const [menuAberto, setMenuAberto] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState({
    nome: '',
    linha_dre: '',
    indicador: 'Débito',
  })

  useEffect(() => { carregarCategorias() }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const carregarCategorias = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user?.id)
      .eq('ativo', true)
    if (error) alert('Erro: ' + error.message)
    const sorted = (data || []).sort((a, b) => {
      const numA = parseFloat(a.codigo || '0')
      const numB = parseFloat(b.codigo || '0')
      return numA - numB
    })
    setCategorias(sorted)
    setLoading(false)
  }

  const gerarCodigoPreview = () => {
    if (editando) return editando.codigo
    const principais = categorias.filter(c => !c.parent_id)
    return String(principais.length + 1)
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.linha_dre) { alert('Selecione a Faixa no DRE!'); return }
    if (!form.nome.trim()) { alert('Preencha a Descrição!'); return }
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()

    const duplicado = categorias.find(c =>
      c.nome.toLowerCase() === form.nome.toLowerCase() &&
      !c.parent_id &&
      c.id !== editando?.id
    )
    if (duplicado) { alert('Já existe uma categoria com esse nome!'); setSalvando(false); return }

    if (editando) {
      const camposAlterados: any[] = []
      if (editando.nome !== form.nome) camposAlterados.push({ campo: 'nome', anterior: editando.nome, novo: form.nome })
      if (editando.linha_dre !== form.linha_dre) camposAlterados.push({ campo: 'linha_dre', anterior: editando.linha_dre, novo: form.linha_dre })

      const { error } = await supabase.from('categorias').update({
        nome: form.nome, linha_dre: form.linha_dre, subtipo: form.indicador,
      }).eq('id', editando.id)

      if (error) { alert('Erro: ' + error.message); setSalvando(false); return }

      for (const c of camposAlterados) {
        await supabase.from('categorias_log').insert({
          categoria_id: editando.id, user_id: user?.id,
          campo_alterado: c.campo, valor_anterior: c.anterior, valor_novo: c.novo,
        })
      }

      if (form.nome !== editando.nome) {
        await supabase.from('contas_receber').update({ categoria: form.nome }).eq('categoria', editando.nome)
        await supabase.from('contas_pagar').update({ categoria: form.nome }).eq('categoria', editando.nome)
      }
    } else {
      const principais = categorias.filter(c => !c.parent_id)
      const codigo = String(principais.length + 1)
      const { error } = await supabase.from('categorias').insert({
        nome: form.nome, linha_dre: form.linha_dre, subtipo: form.indicador,
        tipo: 'ambos', parent_id: null, codigo, ativo: true, user_id: user?.id,
      })
      if (error) { alert('Erro: ' + error.message); setSalvando(false); return }
    }

    resetForm()
    carregarCategorias()
    setSalvando(false)
  }

  const excluir = async (cat: any) => {
    const temFilhos = categorias.some(c => c.parent_id === cat.id)
    if (temFilhos) { alert('Esta categoria possui subcategorias. Exclua as subcategorias primeiro!'); return }
    if (!confirm(`Deseja excluir "${cat.nome}"?`)) return
    await supabase.from('categorias').update({ ativo: false }).eq('id', cat.id)
    carregarCategorias()
    resetForm()
  }

  const abrirEdicao = (cat: any) => {
    setEditando(cat)
    setForm({
      nome: cat.nome,
      linha_dre: cat.linha_dre || '',
      indicador: cat.subtipo || 'Débito',
    })
    setMostrarForm(true)
    setMenuAberto(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setForm({ nome: '', linha_dre: '', indicador: 'Débito' })
    setEditando(null)
    setMostrarForm(false)
  }

  const toggleExpandido = (id: string) => {
    const novo = new Set(expandidos)
    if (novo.has(id)) novo.delete(id)
    else novo.add(id)
    setExpandidos(novo)
  }

  const getLinhaDRE = (value: string) => LINHAS_DRE.find(l => l.value === value)

  const principais = categorias
    .filter(c => !c.parent_id && (!busca || c.nome.toLowerCase().includes(busca.toLowerCase()) || (c.codigo || '').includes(busca)))
    .slice(0, porPagina)

  const subcategorias = (parentId: string) => categorias.filter(c => c.parent_id === parentId)

  const BotaoAcoes = ({ cat }: { cat: any }) => (
    <div className="relative" ref={menuAberto === cat.id ? menuRef : null}>
      <button
        onClick={() => setMenuAberto(menuAberto === cat.id ? null : cat.id)}
        className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition"
      >
        Ações
        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {menuAberto === cat.id && (
        <div className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-28">
          <button onClick={() => abrirEdicao(cat)}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar
          </button>
          <button onClick={() => { setMenuAberto(null); excluir(cat) }}
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
            <h2 className="text-xl font-bold text-gray-800">Categorias de Plano de Contas</h2>
            <p className="text-xs text-gray-400 mt-1">Home / Categorias de Plano de Contas</p>
          </div>
          <button
            onClick={() => { resetForm(); setMostrarForm(true) }}
            className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Nova Categoria
          </button>
        </div>

        {mostrarForm && (
          <div className="bg-white rounded-xl border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">
                {editando ? 'Editar Categoria' : 'Cadastro de Categorias de Plano de Contas'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Home / Categorias / {editando ? 'Editar' : 'Cadastro'}
              </p>
            </div>

            <form onSubmit={salvar} className="px-6 py-5">
              <div className="grid grid-cols-4 gap-3 mb-5 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Código</label>
                  <input
                    type="text"
                    value={gerarCodigoPreview()}
                    disabled
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Indicador</label>
                  <select
                    value={form.indicador}
                    onChange={e => setForm({...form, indicador: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Débito">Débito</option>
                    <option value="Crédito">Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Faixa no DRE <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.linha_dre}
                    onChange={e => setForm({...form, linha_dre: e.target.value})}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${!form.linha_dre ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    required
                  >
                    <option value="">Selecione...</option>
                    {LINHAS_DRE.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Descrição <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={e => setForm({...form, nome: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Nome da categoria"
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
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">Código</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Descrição</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Indicador</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Faixa no DRE</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                {principais.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhuma categoria cadastrada.</td></tr>
                ) : (
                  principais.map((cat, idx) => {
                    const subs = subcategorias(cat.id)
                    const expandido = expandidos.has(cat.id)
                    const linhaInfo = getLinhaDRE(cat.linha_dre)
                    const indicador = cat.subtipo || 'Débito'
                    const isEven = idx % 2 === 0
                    return (
                      <>
                        <tr key={cat.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isEven ? 'bg-white' : 'bg-gray-50/30'}`}>
                          <td className="px-4 py-3 font-medium text-gray-700">{cat.codigo}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {subs.length > 0 && (
                                <button onClick={() => toggleExpandido(cat.id)} className="text-gray-400 hover:text-gray-700">
                                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                                    style={{transform: expandido ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s'}}>
                                    <polyline points="9 18 15 12 9 6"/>
                                  </svg>
                                </button>
                              )}
                              <span className="text-gray-800">{cat.nome}</span>
                              {subs.length > 0 && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{subs.length}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${indicador === 'Crédito' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {indicador}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{linhaInfo?.label || '-'}</td>
                          <td className="px-4 py-3"><BotaoAcoes cat={cat} /></td>
                        </tr>
                        {expandido && subs.map(sub => {
                          const subLinhaInfo = getLinhaDRE(sub.linha_dre)
                          const subIndicador = sub.subtipo || 'Débito'
                          return (
                            <tr key={sub.id} className="border-b border-gray-50 bg-blue-50/20 hover:bg-blue-50">
                              <td className="px-4 py-2.5 text-gray-500 text-xs pl-10">{sub.codigo}</td>
                              <td className="px-4 py-2.5 pl-12">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-300">↳</span>
                                  <span className="text-gray-600">{sub.nome}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${subIndicador === 'Crédito' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {subIndicador}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-gray-500 text-sm">{subLinhaInfo?.label || '-'}</td>
                              <td className="px-4 py-2.5"><BotaoAcoes cat={sub} /></td>
                            </tr>
                          )
                        })}
                      </>
                    )
                  })
                )}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">Mostrando {principais.length} de {categorias.filter(c => !c.parent_id).length} categorias</span>
              <span className="text-xs text-gray-400">{categorias.length} registro{categorias.length !== 1 ? 's' : ''} no total</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}