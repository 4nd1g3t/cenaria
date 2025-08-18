// src/app/despensa/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createPantryItem, deletePantryItem, updatePantryItem } from "@/lib/pantry";
import { getIdTokenOrRedirect } from "@/lib/auth";

const CreateSchema = z.object({
  name: z.string().min(2, "Nombre demasiado corto"),
  quantity: z.coerce.number().min(0, "Debe ser ≥ 0"),           // ← requerido
  unit: z.string().min(1, "Unidad requerida"),                  // ← requerido
  category: z.string().trim().optional(),
});

export async function createAction(formData: FormData) {
  const idToken = await getIdTokenOrRedirect();

  const parsed = CreateSchema.safeParse({
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
    category: formData.get("category"),
    // perishable: formData.get("perishable"),
    // notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors } as const;
  }

  await createPantryItem({ idToken, input: parsed.data });
  revalidatePath("/despensa");
  return { ok: true } as const;
}

const UpdateSchema = z.object({
  id: z.string().min(1),
  version: z.coerce.number().optional(),   // ✅ usar versión
  name: z.string().optional(),
  quantity: z.coerce.number().optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
  // perishable: z.coerce.boolean().optional(),
  // notes: z.string().max(240).optional(),
});

export async function updateAction(formData: FormData) {
  const idToken = await getIdTokenOrRedirect();
  const parsed = UpdateSchema.safeParse({
    id: formData.get("id"),
    version: formData.get("version"),     // ✅ leer versión del form
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
    category: formData.get("category"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.flatten().fieldErrors } as const;

  const { id, version, ...patch } = parsed.data;
  await updatePantryItem({ idToken, id, version, patch });  // ✅ sin etag
  revalidatePath("/despensa");
  return { ok: true } as const;
}

export async function deleteAction(formData: FormData) {
  const idToken = await getIdTokenOrRedirect();
  const id = String(formData.get("id") ?? "");
  const versionRaw = formData.get("version");                   // ✅
  const version = versionRaw ? Number(versionRaw) : undefined;  // ✅
  if (!id) return { ok: false, error: { id: ["Requerido"] } } as const;

  await deletePantryItem({ idToken, id, version });             // ✅ sin etag
  revalidatePath("/despensa");
  return { ok: true } as const;
}

export async function createActionVoid(formData: FormData): Promise<void> {
  await createAction(formData);         // ignora el valor de retorno
}

export async function updateActionVoid(formData: FormData): Promise<void> {
  await updateAction(formData);
}

export async function deleteActionVoid(formData: FormData): Promise<void> {
  await deleteAction(formData);
}