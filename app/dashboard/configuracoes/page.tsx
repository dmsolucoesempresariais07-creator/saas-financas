'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const [form, setForm] = useState({
    nome_empresa: '',
    segmento: '',
    saldo_inicial: '',
    mes_inicio: 1,
    ano_inicio: new Date().getFullYear(),
    logo_url: '',
  })
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    carregarConfig()
  }, [])

  const carregarConfig = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (data) {
      setForm({
        nome_empresa: data.nome_empresa || '',
        segmento: data.segmento || '',
        saldo_inicial: String(data.saldo_inicial || '0'),
        mes_inicio: data.mes_inicio || 1,
        ano_inicio: data.ano_inicio || new Date().getFullYear(),
        logo_url: data.logo_url || '',
      })
      if (data.logo_url) setPreview(data.logo_url)
    }
    setLoading(false)
  }

  const uploadLogo = async (file: File) => {
    setUploadando(true)
    const { data: { user } } = await supabase.auth.getUser()
    const ext = file.name.split('.').pop()
    const path = `${user?.id}/logo.${ext}`

    const { error } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true })

    if (error) {
      alert('Erro ao fazer upload: ' + error.message)
      setUploadando(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('logos')
      .getPublicUrl(path)

    setForm(f => ({ ...f, logo_url: urlData.publicUrl }))
    setPreview(urlData.publicUrl)
    setUploadando(false)
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('configuracoes').upsert({
      user_id: user?.id,
      nome_empresa: form.nome_empresa,
      segmento: form.segmento,
      saldo_inicial: parseFloat(form.saldo_inicial) || 0,
      mes_inicio: form.mes_inicio,
      ano_inicio: form.ano_inicio,
      logo_url: form.logo_url,
      onboarding_concluido: true,
    }, { onConflict: 'user_id' })

    if (error) {
      alert('Erro ao salvar: ' + error.message)
      setSalvando(false)
      return
    }

    alert('Configuracoes salvas com sucesso!')
    setSalvando(false)
    router.refresh()
  }

  const meses = Array.from({length: 12}, (_, i) => ({
    value: i + 1,
    label: new Date(2026, i).toLocaleString('pt-BR', { month: 'long' })
  }))

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Carregando...</p>
    </div>
  )

  return (
    <div className="px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Configurações</h2>
        <p className="text-sm text-gray-500 mb-8">Gerencie as informações da sua empresa</p>

        <form onSubmit={salvar} className="space-y-6">

          {/* Logo */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Logo da empresa</h3>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                {preview ? (
                  <img src={preview} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <svg width="10" height="10" fill="none" stroke="#9ca3af" strokeWidth="1.5" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadando}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploadando ? 'Enviando...' : preview ? 'Trocar logo' : 'Adicionar logo'}
                </button>
                <p className="text-xs text-gray-400 mt-2">PNG, JPG ou SVG. Maximo 2MB.</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = ev => setPreview(ev.target?.result as string)
                      reader.readAsDataURL(file)
                      uploadLogo(file)
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Dados da empresa */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Dados da empresa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da empresa *</label>
                <input
                  type="text"
                  value={form.nome_empresa}
                  onChange={e => setForm({...form, nome_empresa: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Segmento</label>
                <select
                  value={form.segmento}
                  onChange={e => setForm({...form, segmento: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o segmento</option>
                  <option value="Comercio">Comércio</option>
                  <option value="Servicos">Servicos</option>
                  <option value="Industria">Industria</option>
                  <option value="Tecnologia">Tecnologia</option>
                  <option value="Saude">Saúde</option>
                  <option value="Educacao">Educação</option>
                  <option value="Construcao">Construção</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>
          </div>

          {/* Configuracoes financeiras */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Configurações financeiras</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Saldo inicial (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.saldo_inicial}
                  onChange={e => setForm({...form, saldo_inicial: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0,00"
                />
                <p className="text-xs text-gray-400 mt-1">Saldo em caixa no início</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mês de inicio</label>
                <select
                  value={form.mes_inicio}
                  onChange={e => setForm({...form, mes_inicio: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {meses.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ano de inicio</label>
                <select
                  value={form.ano_inicio}
                  onChange={e => setForm({...form, ano_inicio: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {salvando ? 'Salvando...' : 'Salvar configuracoes'}
          </button>
        </form>
      </div>
    </div>
  )
}