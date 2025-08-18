'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  createPantryItem,
  updatePantryItem,
  deletePantryItem,
} from '@/lib/pantry';

/** Contrato mínimo v0.1 */
export type PantryItem = {
  id: string;
  version?: number | null;
  name: string;
  quantity: number;
  unit: string;
  /** En server usamos string | undefined (no null) */
  category?: string | null;
  perishable?: boolean | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type CreateResult = { item?: PantryItem | null } | null | undefined;
type UpdateResult = { item?: PantryItem | null; version?: number } | null | undefined;

/** Estructura de respuesta tipada para UPDATE (evita any en el cliente) */
export type UpdatePayload = { id: string; version?: number; item?: PantryItem | null };

type ActionError = { code: string; message: string; status?: number };
export type ActionState<T = unknown> = { ok: boolean; data?: T; error?: ActionError };

/** cookies() es async dentro de Server Actions */
async function requireIdToken(): Promise<string> {
  const jar = await cookies();
  const token =
    jar.get('idToken')?.value ||
    jar.get('id_token')?.value ||
    jar.get('cenaria.idToken')?.value;

  if (!token) redirect('/signin?next=/despensa');
  return token!;
}

/* ===========================
 * CREATE
 * =========================== */
export async function createItemAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState<PantryItem | null>> {
  try {
    const idToken = await requireIdToken();
    const input = {
      name: String(formData.get('name') || '').trim(),
      quantity: Number(formData.get('quantity') ?? 0),
      unit: String(formData.get('unit') || '').trim(),
      // Normalizamos: si viene vacío => undefined (no null)
      category: (() => {
        const v = (formData.get('category') as string) || '';
        return v ? v : undefined;
      })(),
    };

    if (!input.name || input.name.length < 2) {
      return { ok: false, error: { code: 'VALIDATION', message: 'Nombre inválido' } };
    }
    if (!input.unit) {
      return { ok: false, error: { code: 'VALIDATION', message: 'Unidad requerida' } };
    }

    const result = (await createPantryItem({ idToken, input })) as CreateResult;
    revalidatePath('/despensa');
    return { ok: true, data: result?.item ?? null };
  } catch (err: unknown) {
    const status =
      (err as { status?: number })?.status ??
      (err as { response?: { status?: number } })?.response?.status;
    const message = (err as { message?: string })?.message ?? 'Error creando ítem';

    return {
      ok: false,
      error: {
        code: status === 409 ? 'CONFLICT' : 'ERROR',
        message,
        status,
      },
    };
  }
}

export async function createItemActionVoid(formData: FormData): Promise<void> {
  await createItemAction({ ok: true }, formData);
}

/* ===========================
 * UPDATE
 * =========================== */

type Patch = {
  name?: string;
  quantity?: number;
  unit?: string;
  category?: string;     // <- string | undefined (NO null)
  perishable?: boolean;
  notes?: string;
};

export async function updateItemAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState<UpdatePayload>> {
  try {
    const idToken = await requireIdToken();

    const id = String(formData.get('id') || '');
    const versionRaw = formData.get('version');
    const version =
      typeof versionRaw === 'string' && versionRaw !== '' ? Number(versionRaw) : undefined;

    const patch: Patch = {};
    if (formData.has('name')) patch.name = String(formData.get('name') || '').trim();
    if (formData.has('quantity')) patch.quantity = Number(formData.get('quantity') ?? 0);
    if (formData.has('unit')) patch.unit = String(formData.get('unit') || '').trim();
    if (formData.has('category')) {
      const cat = (formData.get('category') as string) || '';
      patch.category = cat ? cat : undefined; // nunca null
    }

    const result = (await updatePantryItem({
      idToken,
      id,
      version,
      patch,
    })) as UpdateResult;

    revalidatePath('/despensa');

    const newVersion =
      (result?.item?.version != null
        ? result?.item?.version
        : result?.version) ?? version;

    const payload: UpdatePayload = {
      id,
      version: typeof newVersion === 'number' ? newVersion : undefined,
      item: result?.item,
    };

    return { ok: true, data: payload };
  } catch (err: unknown) {
    const status =
      (err as { status?: number })?.status ??
      (err as { response?: { status?: number } })?.response?.status;
    const message =
      status === 409
        ? 'El ítem cambió en el servidor. Refresca la lista e intenta de nuevo.'
        : (err as { message?: string })?.message ?? 'Error actualizando ítem';

    return {
      ok: false,
      error: {
        code: status === 409 ? 'CONFLICT' : 'ERROR',
        message,
        status,
      },
    };
  }
}

export async function updateItemActionVoid(formData: FormData): Promise<void> {
  await updateItemAction({ ok: true }, formData);
}

/* ===========================
 * DELETE
 * =========================== */
export async function deleteItemAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState<{ id: string }>> {
  try {
    const idToken = await requireIdToken();

    const id = String(formData.get('id') || '');
    const versionRaw = formData.get('version');
    const version =
      typeof versionRaw === 'string' && versionRaw !== '' ? Number(versionRaw) : undefined;

    await deletePantryItem({ idToken, id, version });

    revalidatePath('/despensa');
    return { ok: true, data: { id } };
  } catch (err: unknown) {
    const status =
      (err as { status?: number })?.status ??
      (err as { response?: { status?: number } })?.response?.status;
    const message =
      status === 409
        ? 'El ítem fue modificado o eliminado por otro proceso. Refresca e intenta de nuevo.'
        : (err as { message?: string })?.message ?? 'Error eliminando ítem';

    return {
      ok: false,
      error: {
        code: status === 409 ? 'CONFLICT' : 'ERROR',
        message,
        status,
      },
    };
  }
}

export async function deleteItemActionVoid(formData: FormData): Promise<void> {
  await deleteItemAction({ ok: true }, formData);
}
