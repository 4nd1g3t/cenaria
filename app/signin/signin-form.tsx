'use client';

import * as React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { signInAction, type AuthActionState } from '@/app/signin/signin.server';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      disabled={pending}
    >
      {pending ? 'Ingresando…' : 'Ingresar'}
    </button>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useFormState<AuthActionState, FormData>(signInAction, { ok: false });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="mb-1 block text-sm text-gray-700">Correo</span>
        <input
          name="email"
          type="email"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder="tucorreo@dominio.com"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-gray-700">Contraseña</span>
        <input
          name="password"
          type="password"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder="••••••••"
        />
      </label>

      {state?.error ? (
        <p className="text-sm text-red-600">
          {state.error.message || 'No se pudo iniciar sesión.'}
        </p>
      ) : null}

      <SubmitBtn />

      <div className="pt-4 text-center">
        <a href="/signout" className="text-sm text-gray-600 underline">
          ¿Olvidaste cerrar sesión antes? Cerrar sesión
        </a>
      </div>
    </form>
  );
}
