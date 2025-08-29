'use server'
import { redirect } from 'next/navigation'
import { API_URL } from '@/lib/config/constants'
import { getIdTokenOrRedirect } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import { Day } from '@/lib/types'

export async function prepareMenuAction(id: string, formData: FormData) {
  const idToken = await getIdTokenOrRedirect(`/menu/${id}`)

  const scope = (formData.get('scope') as 'all'|'weekdays'|'days') ?? 'all'
  const dryRun = formData.get('dryRun') === 'on'
  const days = formData.getAll('days') as string[] | undefined

  const payload: any = { scope, dryRun }
  if (scope === 'days' && days?.length) payload.days = days

  const r = await fetch(`${API_URL}/v1/menu/${id}/prepare`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  // Redirige con mensaje de error si algo falla
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    redirect(`/menu/${id}?error=${encodeURIComponent(err?.message ?? 'No se pudo preparar el menú')}`)
  }

  // Recarga la vista del menú (SSR)
  redirect(`/menu/${id}`)
}

export async function finalizeMenuAction(id: string, version?: number) {
  const idToken = await getIdTokenOrRedirect(`/menu/${id}`)

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'Authorization': `Bearer ${idToken}`,
  }
  if (typeof version === 'number') headers['If-Match'] = String(version)

  const r = await fetch(`${API_URL}/v1/menu/${id}/finalize`, {
    method: 'POST',
    headers,
    cache: 'no-store',
  })

  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    redirect(`/menu/${id}?error=${encodeURIComponent(err?.message ?? 'No se pudo finalizar el menú')}`)
  }

  redirect(`/menu/${id}`)
}

export async function replaceMenuRecipeAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  const day = String(formData.get('day') || '').trim() as Day;
  const personsRaw = String(formData.get('persons') || '').trim();
  const maxDurationMinRaw = String(formData.get('maxDurationMin') || '').trim();
  const avoidIngredientsRaw = String(formData.get('avoidIngredients') || '').trim();
  const usePantry = String(formData.get('usePantry') || 'on') === 'on';
  const ifMatchRaw = String(formData.get('ifMatch') || '').trim();

  if (!id) throw new Error('Missing menu id');
  if (!day) throw new Error('Select a day');

  const persons = personsRaw ? Number(personsRaw) : undefined;
  const maxDurationMin = maxDurationMinRaw ? Number(maxDurationMinRaw) : undefined;

  const constraints: Record<string, unknown> = {};
  if (maxDurationMin && Number.isFinite(maxDurationMin)) constraints.maxDurationMin = maxDurationMin;

  const avoidIngredients = avoidIngredientsRaw
    ? avoidIngredientsRaw.split(',').map(s => s.trim()).filter(Boolean)
    : undefined;
  if (avoidIngredients?.length) constraints.avoidIngredients = avoidIngredients;

  const body: Record<string, unknown> = {
    day,
    ...(persons ? { persons } : {}),
    ...(Object.keys(constraints).length ? { constraints } : {}),
    usePantry,
  };

  const idToken = await getIdTokenOrRedirect(`/menu/${id}`)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
    'content-type': 'application/json',
  };
  if (ifMatchRaw) headers['If-Match'] = ifMatchRaw;

  const res = await fetch(`${API_URL}/v1/menu/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    // intenta extraer mensaje de error coherente
    let msg = `PATCH /v1/menu/${id} failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.message) msg = `${msg}: ${j.message}`;
    } catch {}
    throw new Error(msg);
  }

  // Revalida y vuelve a la vista del menú
  revalidatePath(`/menu/${id}`);
  redirect(`/menu/${id}`);
}