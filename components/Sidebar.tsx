'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const icons = {
  home: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>,
  clientes: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  receber: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 2v20M17 7H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  pagar: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
  fluxo: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  dre: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  relatorios: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  config: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  suporte: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  sair: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chevron: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>,
  toggle: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
}

const menuItems = [
  { label: 'Home', icon: 'home', href: '/dashboard' },
  { label: 'Clientes e Fornecedores', icon: 'clientes', href: '/dashboard/clientes' },
  { label: 'Contas a Receber', icon: 'receber', href: '/dashboard/contas-receber', separador: true },
  { label: 'Contas a Pagar', icon: 'pagar', href: '/dashboard/contas-pagar' },
  { label: 'Fluxo de Caixa', icon: 'fluxo', href: '/dashboard/fluxo-caixa', sub: [
    { label: 'Mensal', href: '/dashboard/fluxo-caixa' },
    { label: 'Diario', href: '/dashboard/fluxo-caixa-diario' },
  ]},
  { label: 'DRE', icon: 'dre', href: '/dashboard/dre', separador: true },
  { label: 'Relatorios', icon: 'relatorios', href: '/dashboard/relatorios' },
  { label: 'Configuracoes', icon: 'config', href: '/dashboard/configuracoes', separador: true, sub: [
  { label: 'Geral', href: '/dashboard/configuracoes' },
  { label: 'Categorias', href: '/dashboard/configuracoes/categorias' },
]},  { label: 'Suporte', icon: 'suporte', href: '/dashboard/suporte' },
]

export default function Sidebar({ usuario, nomeEmpresa, logoUrl }: { usuario: any, nomeEmpresa?: string, logoUrl?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuAberto, setMenuAberto] = useState(false)
  const [subAberto, setSubAberto] = useState<string | null>(null)
  const [recolhido, setRecolhido] = useState(false)

  const sair = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navegar = (href: string) => {
    router.push(href)
    setMenuAberto(false)
  }

  const ativo = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const iniciais = (nomeEmpresa || usuario?.email || 'DM')
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()

  const sizeMap: Record<number, string> = { 7: 'w-7 h-7', 8: 'w-8 h-8', 9: 'w-9 h-9' }

const LogoAvatar = ({ size = 9 }: { size?: number }) => {
  const sizeClass = sizeMap[size] ?? 'w-9 h-9'
  return (
    <div className={`${sizeClass} rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden`}>
      {logoUrl ? (
        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
      ) : (
        <span className="text-xs">{iniciais}</span>
      )}
    </div>
  )
}

  const MenuItem = ({ item }: { item: any }) => {
    const isAtivo = ativo(item.href)
    const temSub = item.sub && item.sub.length > 0
    const subEstaAberto = subAberto === item.href

    return (
      <div>
        {item.separador && !recolhido && <div className="mx-4 my-2 border-t border-gray-700" />}
        {item.separador && recolhido && <div className="my-2 border-t border-gray-700" />}
        <button
          onClick={() => {
            if (recolhido) { setRecolhido(false); navegar(item.href); return }
            if (temSub) setSubAberto(subEstaAberto ? null : item.href)
            else navegar(item.href)
          }}
          title={recolhido ? item.label : ''}
          className={`flex items-center justify-between w-full px-4 py-2.5 text-sm transition-all duration-150 ${
            isAtivo ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          } ${recolhido ? 'justify-center px-0' : ''}`}
        >
          <div className={`flex items-center gap-3 ${recolhido ? 'justify-center w-full' : ''}`}>
            <span className={isAtivo ? 'text-white' : 'text-gray-400'}>
              {icons[item.icon as keyof typeof icons]}
            </span>
            {!recolhido && <span className="font-medium">{item.label}</span>}
          </div>
          {temSub && !recolhido && (
            <span className={`transition-transform duration-200 ${subEstaAberto ? 'rotate-180' : ''} ${isAtivo ? 'text-white' : 'text-gray-500'}`}>
              {icons.chevron}
            </span>
          )}
        </button>
        {temSub && subEstaAberto && !recolhido && (
          <div className="bg-gray-900 py-1">
            {item.sub.map((s: any) => (
              <button
                key={s.href}
                onClick={() => navegar(s.href)}
                className={`flex items-center w-full pl-12 pr-4 py-2 text-xs transition ${
                  pathname === s.href ? 'text-blue-400 font-medium' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="mr-2">—</span>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* SIDEBAR DESKTOP */}
      <aside className={`hidden md:flex flex-col min-h-screen bg-gray-800 text-white fixed left-0 top-0 z-40 transition-all duration-300 ${recolhido ? 'w-16' : 'w-60'}`}>

        {/* Header */}
        <div className={`bg-gray-900 border-b border-gray-700 flex items-center ${recolhido ? 'justify-center py-4 px-2' : 'px-4 py-5 justify-between'}`}>
          {!recolhido && (
            <div className="flex items-center gap-3 overflow-hidden flex-1">
              <LogoAvatar size={9} />
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{nomeEmpresa || 'DM Solucoes'}</p>
                <p className="text-xs text-gray-400 truncate">{usuario?.email}</p>
              </div>
            </div>
          )}
          {recolhido && <LogoAvatar size={8} />}
          <button
            onClick={() => setRecolhido(!recolhido)}
            className={`text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-700 transition flex-shrink-0 ${recolhido ? 'mt-2' : ''}`}
            title={recolhido ? 'Expandir menu' : 'Recolher menu'}
          >
            {icons.toggle}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
          {menuItems.map(item => (
            <MenuItem key={item.href} item={item} />
          ))}
        </nav>

        {/* Sair */}
        <div className="border-t border-gray-700 p-3">
          <button
            onClick={sair}
            title={recolhido ? 'Sair' : ''}
            className={`flex items-center gap-3 w-full py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition ${recolhido ? 'justify-center px-0' : 'px-3'}`}
          >
            <span>{icons.sair}</span>
            {!recolhido && 'Sair'}
          </button>
        </div>
      </aside>

      {/* HEADER MOBILE */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 text-white px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          <LogoAvatar size={7} />
          <span className="text-sm font-semibold truncate max-w-36">{nomeEmpresa || 'DM Solucoes'}</span>
        </div>
        <button onClick={() => setMenuAberto(!menuAberto)} className="text-gray-300 hover:text-white p-1">
          {menuAberto ? (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          )}
        </button>
      </header>

      {/* MENU MOBILE */}
      {menuAberto && (
        <div className="md:hidden fixed top-12 left-0 right-0 bottom-16 z-40 bg-gray-800 overflow-y-auto">
          <nav className="py-2">
            {menuItems.map(item => (
              <MenuItem key={item.href} item={item} />
            ))}
            <div className="border-t border-gray-700 mx-4 my-2" />
            <button onClick={sair} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700">
              <span>{icons.sair}</span>
              Sair
            </button>
          </nav>
        </div>
      )}

      {/* MENU INFERIOR MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-700 flex justify-around px-1 py-1">
        {[
          { href: '/dashboard', icon: 'home', label: 'Home' },
          { href: '/dashboard/contas-receber', icon: 'receber', label: 'Receber' },
          { href: '/dashboard/contas-pagar', icon: 'pagar', label: 'Pagar' },
          { href: '/dashboard/dre', icon: 'dre', label: 'DRE' },
          { href: '/dashboard/configuracoes', icon: 'config', label: 'Config' },
        ].map(item => (
          <button
            key={item.href}
            onClick={() => navegar(item.href)}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition ${
              ativo(item.href) ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {icons[item.icon as keyof typeof icons]}
            <span style={{fontSize:'10px'}} className="mt-0.5">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}