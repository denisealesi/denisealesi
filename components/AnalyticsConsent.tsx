'use client'

import Script from 'next/script'
import {usePathname} from 'next/navigation'
import {useEffect, useState} from 'react'

type ConsentChoice = 'granted' | 'denied'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

const storageKey = 'denise-analytics-consent-v1'
const cookieName = 'denise_analytics_consent'
const consentEvent = 'denise:open-cookie-settings'
const copy = {
  it: {title: 'La tua privacy', description: 'Usiamo cookie analitici di Google Analytics solo con il tuo consenso, per capire come viene utilizzato il sito e migliorarlo. Puoi cambiare scelta in qualsiasi momento.', accept: 'Accetta analytics', reject: 'Rifiuta', google: 'Informazioni su Google Analytics'},
  en: {title: 'Your privacy', description: 'We use Google Analytics cookies only with your consent, to understand how the website is used and improve it. You can change your choice at any time.', accept: 'Accept analytics', reject: 'Reject', google: 'About Google Analytics'},
  es: {title: 'Tu privacidad', description: 'Usamos cookies analíticas de Google Analytics solo con tu consentimiento, para entender cómo se utiliza el sitio y mejorarlo. Puedes cambiar tu elección en cualquier momento.', accept: 'Aceptar analytics', reject: 'Rechazar', google: 'Información sobre Google Analytics'},
} as const

function getLanguage(pathname: string) {
  const language = pathname.split('/').filter(Boolean)[0]
  return language === 'en' || language === 'es' ? language : 'it'
}

function ensureGoogleTag() {
  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function gtag(..._args: unknown[]) {
    window.dataLayer.push(arguments)
  }
  return window.gtag
}

function updateGoogleConsent(choice: ConsentChoice) {
  ensureGoogleTag()('consent', 'update', {
    analytics_storage: choice,
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
}

function readSavedChoice(): ConsentChoice | null {
  const stored = window.localStorage.getItem(storageKey)
  if (stored === 'granted' || stored === 'denied') return stored

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${cookieName}=`))
    ?.split('=')[1]

  return cookie === 'granted' || cookie === 'denied' ? cookie : null
}

function persistChoice(choice: ConsentChoice) {
  window.localStorage.setItem(storageKey, choice)
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${cookieName}=${choice}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`
}

export function AnalyticsConsent() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const pathname = usePathname()
  const [choice, setChoice] = useState<ConsentChoice | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [analyticsReady, setAnalyticsReady] = useState(false)
  const text = copy[getLanguage(pathname)]

  useEffect(() => {
    const gtag = ensureGoogleTag()
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500,
    })
    gtag('set', 'ads_data_redaction', true)

    const initialChoice = readSavedChoice()
    queueMicrotask(() => {
      setChoice(initialChoice)
      setIsOpen(initialChoice === null)
    })
    if (initialChoice) updateGoogleConsent(initialChoice)
    const openSettings = () => setIsOpen(true)
    window.addEventListener(consentEvent, openSettings)
    return () => window.removeEventListener(consentEvent, openSettings)
  }, [])

  useEffect(() => {
    if (choice !== 'granted' || !measurementId || !analyticsReady) return
    const query = window.location.search.slice(1)
    window.gtag('event', 'page_view', {
      page_path: query ? `${pathname}?${query}` : pathname,
      page_location: window.location.href,
      page_title: document.title,
    })
  }, [analyticsReady, choice, measurementId, pathname])

  const saveChoice = (nextChoice: ConsentChoice) => {
    persistChoice(nextChoice)
    updateGoogleConsent(nextChoice)
    setChoice(nextChoice)
    setIsOpen(false)
    if (nextChoice === 'denied') {
      document.cookie.split(';').forEach((cookie) => {
        const name = cookie.split('=')[0].trim()
        if (name === '_ga' || name.startsWith('_ga_')) {
          document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`
          document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${window.location.hostname}; SameSite=Lax`
        }
      })
    }
  }

  return <>
    {measurementId && choice === 'granted' && <>
      <Script
        id="google-analytics"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
        onReady={() => {
          window.gtag('js', new Date())
          window.gtag('config', measurementId, {send_page_view: false, anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false})
          setAnalyticsReady(true)
        }}
      />
    </>}
    {isOpen && <div className="fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title">
      <div className="mx-auto max-w-4xl rounded-2xl border border-white/15 bg-[#1c1d26] p-5 text-white shadow-2xl sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 id="cookie-consent-title" className="font-serif text-xl">{text.title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/75">{text.description}</p>
            <a href="https://business.safety.google/privacy/" target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-blue-300 underline underline-offset-4 hover:text-blue-200">{text.google}</a>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
            <button type="button" onClick={() => saveChoice('granted')} className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#1c1d26] hover:bg-white/90">{text.accept}</button>
            <button type="button" onClick={() => saveChoice('denied')} className="rounded-full border border-white/30 px-5 py-2.5 text-sm text-white hover:bg-white/10">{text.reject}</button>
          </div>
        </div>
      </div>
    </div>}
  </>
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(consentEvent))
}
