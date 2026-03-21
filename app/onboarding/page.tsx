'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    nome_empresa: '',
    segmento: '',
    saldo_inicial: '',
    mes_inicio: new Date().getMonth() + 1,
    ano_inicio: new Date().getFullYear(),
  })
  const router = useRouter()

  useEffect(() => {
    verificarOnboarding()
  }, [])

  const verificarOnboarding = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (data?.onboarding_concluido) {
      router.push('/dashboard')
    }
  }

  const salvar = async () => {
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('configuracoes').upsert({
      user_id: user?.id,
      nome_empresa: form.nome_empresa,
      segmento: form.segmento,
      saldo_inicial: parseFloat(form.saldo_inicial) || 0,
      mes_inicio: form.mes_inicio,
      ano_inicio: form.ano_inicio,
      onboarding_concluido: true,
    }, { onConflict: 'user_id' })

    if (error) {
      alert('Erro ao salvar: ' + error.message)
      setSalvando(false)
      return
    }

    router.push('/dashboard')
  }

  const meses = Array.from({length: 12}, (_, i) => ({
    value: i + 1,
    label: new Date(2026, i).toLocaleString('pt-BR', { month: 'long' })
  }))

  return (
    <div className="min-h-screen bg-blue-700 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-700 mb-1">DM Solucoes</h1>
          <p className="text-gray-500 text-sm">Vamos configurar sua conta em poucos passos</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {s}
              </div>
              {s < 3 && <div className={`w-12 h-1 rounded ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Dados da empresa</h2>
            <p className="text-sm text-gray-500 mb-6">Como podemos chamar sua empresa?</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da empresa *</label>
                <input
                  type="text"
                  value={form.nome_empresa}
                  onChange={e => setForm({...form, nome_empresa: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: DM Solucoes Empresariais"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Segmento</label>
                <select
                  value={form.segmento}
                  onChange={e => setForm({...form, segmento: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o segmento</option>
                  <option value="Comercio">Comercio</option>
                  <option value="Servicos">Servicos</option>
                  <option value="Industria">Industria</option>
                  <option value="Tecnologia">Tecnologia</option>
                  <option value="Saude">Saude</option>
                  <option value="Educacao">Educacao</option>
                  <option value="Construcao">Construcao</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!form.nome_empresa}
              className="w-full mt-6 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Periodo inicial</h2>
            <p className="text-sm text-gray-500 mb-6">A partir de quando quer comecar a usar o sistema?</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mes de inicio</label>
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
                    {[2023, 2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 py-2.5 rounded-lg text-sm hover:bg-gray-50">
                Voltar
              </button>
              <button onClick={() => setStep(3)} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Saldo inicial em caixa</h2>
            <p className="text-sm text-gray-500 mb-2">Qual o valor total que a empresa tem em conta agora?</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-xs text-blue-700">
              Some todos os saldos bancarios da empresa (conta corrente, poupanca, caixa fisico) e insira o total aqui. Este valor sera o ponto de partida do seu Fluxo de Caixa.
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Saldo atual (R$) *</label>
              <input
                type="number"
                step="0.01"
                value={form.saldo_inicial}
                onChange={e => setForm({...form, saldo_inicial: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 15000,00"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(2)} className="flex-1 border border-gray-300 py-2.5 rounded-lg text-sm hover:bg-gray-50">
                Voltar
              </button>
              <button
                onClick={salvar}
                disabled={salvando || !form.saldo_inicial}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Comecar a usar!'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}