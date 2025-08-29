'use server'
import { redirect } from 'next/navigation'
import { API_URL } from '@/lib/config/constants'
import { getIdTokenOrRedirect } from '@/lib/auth/session'

type GenerateMenuFields = {
  persons: number
  daysMode: 'full_week' | 'weekdays'
  maxDurationMin?: number
  usePantry?: boolean
}

export async function generateMenuAction(formData: FormData) {
  // 1) Auth: ID Token desde cookie (server)
  const idToken = await getIdTokenOrRedirect("/menu")
  // 2) Parse campos del form (sin React)
  const persons = Number(formData.get('persons') ?? 2)
  const daysMode = (formData.get('daysMode') as 'full_week' | 'weekdays') ?? 'full_week'
  const maxDurationMinRaw = formData.get('maxDurationMin')
  const maxDurationMin = maxDurationMinRaw ? Number(maxDurationMinRaw) : undefined
  const usePantry = formData.get('usePantry') === 'on'

  const payload: any = {
    persons,
    daysMode,
    constraints: maxDurationMin ? { maxDurationMin } : undefined,
    usePantry,
  }

  // 3) Llamada a tu API (server→API Gateway) usando Bearer ID_TOKEN
  const r = await fetch(`${API_URL}/v1/menu`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  if (!r.ok) {
    // Opcional: leer JSON de error y mostrar un estado en /menu?error=...
    const err = await r.json().catch(() => ({}))
    console.error('POST /v1/menu failed', r.status, err)
    redirect(`/menu?error=${encodeURIComponent(err?.message ?? 'No se pudo generar el menú')}`)
  }

  const data = await r.json().catch(() => ({}))
  const id = data?.menu?.id as string | undefined
  if (!id) {
    console.error('Missing menu.id in response', data)
    redirect(`/menu?error=${encodeURIComponent('Respuesta inválida del servidor')}`)
  }

  // 4) Navegar a la vista del menú generado (SSR)
  redirect(`/menu/${id}`)
}
