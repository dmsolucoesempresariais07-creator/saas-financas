'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ContasReceberPage() {
  const [contas, setContas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [form, setForm] = useState({
    descricao: '',
    valor: '',
    data_vencimento: '',
    cliente: '',
    categoria: '',
    centro_custo: '',
    numero_nota: '',
    observacao: '',
    recorrente: false,
    parcelado: false,
    total_parcelas: '1',
  })
  const router = useRouter()

  useEffect(() => {
    carregarContas()
  }, [])

  const carregarContas = async () => {
    const { data, error } = await supabase
      .from('contas_receber')
      .select('*')
      .order('data_vencimento', { ascending: true })
    if (error) alert('Erro ao carregar: ' + error.message)
    setContas(data || [])
    setLoading(false)
  }

  const adicionarConta = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)

    const grupoId = crypto.randomUUID()
    const totalParcelas = form.parcelado ? parseInt(form.total_parcelas) : 1
    const registros = []

    for (let i = 0; i < totalParcelas; i++) {
      const dataBase = new Date(form.data_vencimento + 'T00:00:00')
      dataBase.setMonth(dataBase.getMonth() + i)
      const dataVenc = dataBase.toISOString().split('T')[0]

      registros.push({
        descricao: form.parcelado
          ? `${form.descricao} (Parcela ${i + 1}/${totalParcelas})`
          : form.descricao,
        valor: parseFloat(form.valor),
        data_vencimento: dataVenc,
        cliente: form.cliente,
        categoria: form.categoria,
        centro_custo: form.centro_custo,
        numero_nota: form.numero_nota,
        observacao: form.observacao,
        recorrente: form.recorrente,
        parcelado: form.parcelado,
        total_parcelas: totalParcelas,
        parcela_atual: i + 1,
        grupo_id: grupoId,
        status: 'pendente',
      })
    }

    const { error } = await supabase.from('contas_receber').insert(registros)

    if (error) {
      alert('Erro ao salvar: ' + error.message)
      setSalvando(false)
      return
    }

    setForm({ descricao: '', valor: '', data_vencimento: '', cliente: '', categoria: '', centro_custo: '', numero_nota: '', observacao: '', recorrente: false, parcelado: false, total_parcelas: '1' })
    setMostrarForm(false)
    carregarContas()
    setSalvando(false)
  }

  const marcarStatus = async (id: string, status: string) => {
    await supabase.from('contas_receber').update({
      status,
      data_recebimento: status === 'recebido' ? new Date().toISOString().split('T')[0] : null,
    }).eq('id', id)
    carregarContas()
  }

  const excluir = async (id: string) => {
    if (confirm('Deseja excluir esta conta?')) {
      await supabase.from('contas_receber').delete().eq('id', id)
      carregarContas()
    }
  }

  const gerarProximoMes = async (conta: any) => {
    const dataAtual = new Date(conta.data_vencimento + 'T00:00:00')
    dataAtual.setMonth(dataAtual.getMonth() + 1)
    const novaData = dataAtual.toISOString().split('T')[0]

    const { error } = await supabase.from('contas_receber').insert({
      descricao: conta.descricao,
      valor: conta.valor,
      data_vencimento: novaData,
      cliente: conta.cliente,
      categoria: conta.categoria,
      centro_custo: conta.centro_custo,
      numero_nota: conta.numero_nota,
      observacao: conta.observacao,
      recorrente: true,
      parcelado: false,
      total_parcelas: 1,
      parcela_atual: 1,
      grupo_id: conta.grupo_id,
      status: 'pendente',
    })

    if (error) alert('Erro: ' + error.message)
    else carregarContas()
  }

  const exportarExcel = () => {
    if (contasFiltradas.length === 0) { alert('Nenhuma conta para exportar.'); return }
    const linhas = contasFiltradas.map(c => ({
      Descricao: c.descricao,
      Cliente: c.cliente || '',
      Categoria: c.categoria || '',
      'Centro de Custo': c.centro_custo || '',
      'Nota Fiscal': c.numero_nota || '',
      'Valor (R$)': parseFloat(c.valor).toFixed(2),
      Vencimento: new Date(c.data_vencimento).toLocaleDateString('pt-BR'),
      Status: c.status,
      Tipo: c.recorrente ? 'Recorrente' : c.parcelado ? `Parcelado ${c.parcela_atual}/${c.total_parcelas}` : 'Normal',
    }))
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
  }).map(c => ({
    ...c,
    status: c.status !== 'recebido' && c.data_vencimento < hoje ? 'atrasado' : c.status
  }))

  const totalPendente = contasFiltradas.filter(c => c.status === 'pendente').reduce((s, c) => s + parseFloat(c.valor), 0)
  const totalAtrasado = contasFiltradas.filter(c => c.status === 'atrasado').reduce((s, c) => s + parseFloat(c.valor), 0)
  const totalRecebido = contasFiltradas.filter(c => c.status === 'recebido').reduce((s, c) => s + parseFloat(c.valor), 0)
  const totalGeral = contasFiltradas.reduce((s, c) => s + parseFloat(c.valor), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-600">DM Solucoes</h1>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:underline">
          Voltar ao dashboard
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Contas a Receber</h2>
          <div className="flex gap-3">
            <button onClick={exportarExcel} className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50">
              Exportar Excel
            </button>
            <button onClick={() => setMostrarForm(!mostrarForm)} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              + Nova conta
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total geral</p>
            <p className="text-xl font-bold text-gray-800">R$ {totalGeral.toFixed(2)}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
            <p className="text-xs text-yellow-600 mb-1">Pendente</p>
            <p className="text-xl font-bold text-yellow-700">R$ {totalPendente.toFixed(2)}</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4">
            <p className="text-xs text-red-600 mb-1">Atrasado</p>
            <p className="text-xl font-bold text-red-700">R$ {totalAtrasado.toFixed(2)}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4">
            <p className="text-xs text-green-600 mb-1">Recebido</p>
            <p className="text-xl font-bold text-green-700">R$ {totalRecebido.toFixed(2)}</p>
          </div>
        </div>

        {mostrarForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Nova conta a receber</h3>
            <form onSubmit={adicionarConta} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descricao *</label>
                <input type="text" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" placeholder="Ex: Servico prestado" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <input type="text" value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" placeholder="Nome do cliente" />
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
                  <option value="Servico">Servico</option>
                  <option value="Produto">Produto</option>
                  <option value="Consultoria">Consultoria</option>
                  <option value="Manutencao">Manutencao</option>
                  <option value="Outros">Outros</option>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacao</label>
                <input type="text" value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" placeholder="Observacoes adicionais" />
              </div>

              <div className="md:col-span-2 border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-3">Tipo de lancamento</p>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.recorrente} onChange={e => setForm({...form, recorrente: e.target.checked, parcelado: false})} className="w-4 h-4" />
                    <span className="text-sm text-gray-700">Recorrente (repete todo mes automaticamente)</span>
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
                    <p className="text-xs text-gray-400 mt-1">As parcelas serao lancadas automaticamente nos proximos meses</p>
                  </div>
                )}
                {form.recorrente && (
                  <p className="text-xs text-gray-400 mt-2">Um novo lancamento sera criado automaticamente todo mes na mesma data</p>
                )}
              </div>

              <div className="md:col-span-2 flex gap-3">
                <button type="submit" disabled={salvando} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {salvando ? 'Salvando...' : form.parcelado ? `Gerar ${form.total_parcelas} parcelas` : 'Salvar conta'}
                </button>
                <button type="button" onClick={() => setMostrarForm(false)} className="border border-gray-300 px-6 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
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
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Descricao</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Categoria</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Valor</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Vencimento</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Acoes</th>
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
                    <td className="px-4 py-3 text-gray-600">{new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3">
                      {conta.recorrente && <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">Recorrente</span>}
                      {conta.parcelado && <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">{conta.parcela_atual}/{conta.total_parcelas}</span>}
                      {!conta.recorrente && !conta.parcelado && <span className="text-gray-400 text-xs">Normal</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        conta.status === 'recebido' ? 'bg-green-100 text-green-700' :
                        conta.status === 'atrasado' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {conta.status === 'recebido' ? 'Recebido' : conta.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {conta.status !== 'recebido' && (
                          <button onClick={() => marcarStatus(conta.id, 'recebido')} className="text-green-600 hover:underline text-xs">Marcar recebido</button>
                        )}
                        {conta.recorrente && conta.status === 'recebido' && (
                          <button onClick={() => gerarProximoMes(conta)} className="text-blue-600 hover:underline text-xs">Gerar proximo mes</button>
                        )}
                        <button onClick={() => excluir(conta.id)} className="text-red-500 hover:underline text-xs">Excluir</button>
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