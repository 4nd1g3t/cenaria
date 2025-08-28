'use client'
import './signin.css'
import { FormEvent, useActionState, useRef, useState } from 'react'
import { signInAction } from '@/app/signin/signin.server'
import { type AuthActionState } from '@/lib/constants'
import { redirect } from 'next/navigation'


export default function SignInForm({ next = '/pantry' }: { next?: string }) {
  const [state, formAction] = useActionState<AuthActionState, FormData>(signInAction, { ok: false })
  const [revealed, setRevealed] = useState(false)
  const submitRef = useRef<HTMLButtonElement>(null)

  if (state?.ok) {
    redirect(state.next || next);
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    submitRef.current?.setAttribute('disabled', 'true')
    submitRef.current && (submitRef.current.style.opacity = '0.7')
  }

  return (
    <form method="post" action={formAction} aria-describedby="form-help" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="email">Correo electrónico</label>
        <div className="control">
          <input id="email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="tú@correo.com" required aria-required="true" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <div className="control control-pass">
          <input id="password" name="password" type={revealed ? 'text' : 'password'} autoComplete="current-password" minLength={8} required aria-required="true" />
          <button
            type="button"
            aria-controls="password"
            aria-pressed={revealed}
            title="Mostrar/ocultar contraseña"
            className="reveal"
            onClick={() => setRevealed(v => !v)}
          >
            👁️
          </button>
        </div>
      </div>

      <div className="row">
        <label className="remember">
          <input type="checkbox" name="remember" value="1" /> Recordarme
        </label>
        <a href="/forgot" rel="nofollow">¿Olvidaste tu contraseña?</a>
      </div>

      <button className="btn" type="submit" id="submit" ref={submitRef}>Iniciar sesión</button>

      <div className="or">o</div>
      <div className="alt">
        <button className="btn btn-alt" type="button" onClick={() => (location.href = '/signup')}>Crear cuenta nueva</button>
      </div>

      <p id="form-help" className="legal">
        Al continuar aceptas los <a href="/terms">Términos</a> y <a href="/privacy">Privacidad</a>.
      </p>
    </form>

    
  )
}
