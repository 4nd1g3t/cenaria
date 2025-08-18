'use client';

import * as React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { signUpAction, type AuthActionState } from '@/app/signup/signup.server';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      disabled={pending}
    >
      {pending ? 'Creando cuenta…' : 'Crear cuenta'}
    </button>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action] = useFormState<AuthActionState, FormData>(signUpAction, { ok: false });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <label className="block">
        <span className="mb-1 block text-sm text-gray-700">Nombre completo</span>
        <input
          name="fullName"
          required
          minLength={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder="Nombre Apellido"
        />
      </label>

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
          minLength={8}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder="••••••••"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-gray-700">Confirmar contraseña</span>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder="••••••••"
        />
      </label>

      {state?.error ? (
        <p className="text-sm text-red-600">
          {state.error.message || 'No se pudo crear la cuenta.'}
        </p>
      ) : null}

      <SubmitBtn />
    </form>
  );
}
