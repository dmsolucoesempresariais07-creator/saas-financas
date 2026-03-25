'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function EditarContaReceberPage() {
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [conta, setConta] = useState<any>(null)
  const [categoriasList, setCategoriasList] = useState<any[]>([])
  const [form, setForm] = useState({
    descricao: '',
    valor: '',
    data_vencimento: '',
    cliente: '',
    categoria: '',
    centro_custo: '',
    numero_nota: '',
    observacao: '',
    forma_pagamento: '',
  })
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  useEffect(() => {
    carregarConta()
    carregarCategorias()
  }, [])

  const carregarCategorias = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user?.id)
      .in('tipo', ['receber', 'pagar', 'ambos'])
      .order('nome', { ascending: true })
    setCategoriasList(data || [])
  }

  const carregarConta = async () => {
    const { data, error } = await supabase
      .from('contas_receber')
      .select('*')
      .eq('id', id)
      .single()

    if (error) { alert('Erro ao carregar conta'); return }

    setConta(data)
    setForm({
      descricao: data.descricao || '',
      valor: String(data.valor) || '',
      data_vencimento: data.data_vencimento || '',
      cliente: data.cliente || '',
      categoria: data.categoria || '',
      centro_custo: data.centro_custo || '',
      numero_nota: data.numero_nota || '',
      observacao: data.observacao || '',
      forma_pagamento: data.forma_pagamento || '',
    })
    setLoading(false)
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)

    if (conta.parcelado && conta.grupo_id) {
      const { data: parcelas } = await supabase
        .from('contas_receber')
        .select('id, parcela_atual, data_vencimento')
        .eq('grupo_id', conta.grupo_id)
        .order('parcela_atual', { ascending: true })

      if (parcelas && parcelas.length > 0) {
        const dataBase = new Date(form.data_vencimento + 'T00:00:00')

        for (const parcela of parcelas) {
          const novaData = new Date(dataBase)
          novaData.setMonth(novaData.getMonth() + (parcela.parcela_atual - conta.parcela_atual))
          const dataFormatada = novaData.toISOString().split('T')[0]

          await supabase.from('contas_receber').update({
            descricao: `${form.descricao.replace(/ \(Parcela \d+\/\d+\)/, '')} (Parcela ${parcela.parcela_atual}/${conta.total_parcelas})`,
            valor: parseFloat(form.valor),
            data_vencimento: dataFormatada,
            cliente: form.cliente,
            categoria: form.categoria,
            centro_custo: form.centro_custo,
            numero_nota: form.numero_nota,
            observacao: form.observacao,
            forma_pagamento: form.forma_pagamento,
          }).eq('id', parcela.id)
        }
      }
    } else {
      const { error } = await supabase.from('contas_receber').update({
        descricao: form.descricao,
        valor: parseFloat(form.valor),
        data_vencimento: form.data_vencimento,
        cliente: form.cliente,
        categoria: form.categoria,
        centro_custo: form.centro_custo,
        numero_nota: form.numero_nota,
        observacao: form.observacao,
        forma_pagamento: form.forma_pagamento,
      }).eq('id', id)

      if (error) { alert('Erro ao salvar: ' + error.message); setSalvando(false); return }
    }

    setSalvando(false)
    router.push('/dashboard/contas-receber')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Carregando...</p></div>

  return (
    <div className="px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Editar conta a receber</h2>
        {conta.parcelado && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-6 text-sm text-blue-700">
            Esta é uma conta parcelada — todas as parcelas serão atualizadas!
          </div>
        )}
        {conta.recorrente && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-6 text-sm text-blue-700">
            Esta é uma conta recorrente.
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
              <input type="text" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <input type="text" value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
              <input type="number" step="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data vencimento *</label>
              <input type="date" value={form.data_vencimento} onChange={e => setForm({...form, data_vencimento: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm">
                <option value="">Selecione</option>
                {categoriasList.map(c => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pagamento</label>
              <select value={form.forma_pagamento} onChange={e => setForm({...form, forma_pagamento: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm">
                <option value="">Selecione</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="PIX">PIX</option>
                <option value="Boleto">Boleto</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Transferência Bancária">Transferência Bancária</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Centro de custo</label>
              <input type="text" value={form.centro_custo} onChange={e => setForm({...form, centro_custo: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número da nota fiscal</label>
              <input type="text" value={form.numero_nota} onChange={e => setForm({...form, numero_nota: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
              <input type="text" value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={salvando} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button type="button" onClick={() => router.push('/dashboard/contas-receber')} className="border border-gray-300 px-6 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}