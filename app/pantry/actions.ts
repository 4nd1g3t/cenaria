'use server';

import { revalidatePath } from 'next/cache';
import { attemptWithRefresh, extractStatus } from '@/lib/auth-session';
import {
  PantryItem,
  createPantryItem,
  updatePantryItem,
  deletePantryItem
} from '@/lib/pantry';
import { MAX_PANTRY_ITEMS } from '@/lib/constants';

type CreateResult = { item?: PantryItem | null } | null | undefined;
type UpdateResult = { item?: PantryItem | null; version?: number } | null | undefined;

/** Respuesta tipada de UPDATE */
export type UpdatePayload = { id: string; version?: number; item?: PantryItem | null };

type ActionError = { code: string; message: string; status?: number };
export type ActionState<T = unknown> = { ok: boolean; data?: T; error?: ActionError };

// -------- helpers de tipado de error ----------
function getErrorCode(e: unknown): string | undefined {
  if (e && typeof e === 'object') {
    const rec = e as Record<string, unknown>;
    return typeof rec.code === 'string' ? rec.code : undefined;
  }
  return undefined;
}

function getErrorMessage(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    return typeof m === 'string' ? m : undefined;
  }
  return undefined;
}

function getErrorStatus(e: unknown): number | undefined {
  if (e && typeof e === 'object') {
    const s = (e as Record<string, unknown>).status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}

/* ===========================
 * CREATE
 * =========================== */
export async function createItemAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState<PantryItem | null>> {
  try {
    const input = {
      name: String(formData.get('name') || '').trim(),
      quantity: Number(formData.get('quantity') ?? 0),
      unit: String(formData.get('unit') || '').trim(),
      category: (() => {
        const v = (formData.get('category') as string) || '';
        return v ? v : "otros";
      })(),
    };
    if (!input.name || input.name.length < 2) {
      return { ok: false, error: { code: 'VALIDATION', message: 'Nombre inválido' } };
    }
    if (!input.unit) {
      return { ok: false, error: { code: 'VALIDATION', message: 'Unidad requerida' } };
    }

    // Nota: si en el cliente pasas currentCount, createPantryItem validará sin red extra
    const result = (await attemptWithRefresh('/pantry', (idToken) =>
      createPantryItem({ idToken, input })
    )) as CreateResult;

    revalidatePath('/pantry');
    return { ok: true, data: result?.item ?? null };
  } catch (err: unknown) {
    // Extrae status del helper actual y además revisa campos tipados
    const status = extractStatus(err) ?? getErrorStatus(err);
    const code = getErrorCode(err) ?? (status === 409 ? 'CONFLICT' : 'ERROR');

    let message: string;
    if (code === 'PANTRY_LIMIT_EXCEEDED') {
      message = `No puedes agregar más de ${MAX_PANTRY_ITEMS} ingredientes en la despensa.`;
    } else if (status === 409) {
      message = 'Conflicto: el ítem cambió en el servidor. Refresca la lista e intenta de nuevo.';
    } else {
      message = getErrorMessage(err) ?? 'Error creando ítem';
    }

    return {
      ok: false,
      error: { code, message, status },
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
  category?: string; // string | undefined (no null)
  perishable?: boolean;
  notes?: string;
};

export async function updateItemAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState<UpdatePayload>> {
  try {
    const id = String(formData.get('id') || '');
    const versionRaw = formData.get('version');
    const version = typeof versionRaw === 'string' && versionRaw !== '' ? Number(versionRaw) : undefined;

    const patch: Patch = {};
    if (formData.has('name')) patch.name = String(formData.get('name') || '').trim();
    if (formData.has('quantity')) patch.quantity = Number(formData.get('quantity') ?? 0);
    if (formData.has('unit')) patch.unit = String(formData.get('unit') || '').trim();
    if (formData.has('category')) {
      const cat = (formData.get('category') as string) || '';
      patch.category = cat ? cat : undefined;
    }

    const result = (await attemptWithRefresh('/pantry', (idToken) =>
      updatePantryItem({ idToken, id, version, patch })
    )) as UpdateResult;

    revalidatePath('/pantry');

    const newVersion =
      (result?.item?.version != null ? result?.item?.version : result?.version) ?? version;

    const payload: UpdatePayload = {
      id,
      version: typeof newVersion === 'number' ? newVersion : undefined,
      item: result?.item ?? undefined,
    };

    return { ok: true, data: payload };
  } catch (err: unknown) {
    const status = extractStatus(err) ?? getErrorStatus(err);
    let message: string;
    if (status === 409) {
      message = 'El ítem cambió en el servidor. Refresca la lista e intenta de nuevo.';
    } else {
      message = getErrorMessage(err) ?? 'Error actualizando ítem';
    }
    return { ok: false, error: { code: status === 409 ? 'CONFLICT' : 'ERROR', message, status } };
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
    const id = String(formData.get('id') || '');
    const versionRaw = formData.get('version');
    const version = typeof versionRaw === 'string' && versionRaw !== '' ? Number(versionRaw) : undefined;

    await attemptWithRefresh('/pantry', (idToken) =>
      deletePantryItem({ idToken, id, version })
    );

    revalidatePath('/pantry');
    return { ok: true, data: { id } };
  } catch (err: unknown) {
    const status = extractStatus(err) ?? getErrorStatus(err);
    let message: string;
    if (status === 409) {
      message = 'El ítem fue modificado o eliminado por otro proceso. Refresca e intenta de nuevo.';
    } else {
      message = getErrorMessage(err) ?? 'Error eliminando ítem';
    }
    return { ok: false, error: { code: status === 409 ? 'CONFLICT' : 'ERROR', message, status } };
  }
}

export async function deleteItemActionVoid(formData: FormData): Promise<void> {
  await deleteItemAction({ ok: true }, formData);
}
