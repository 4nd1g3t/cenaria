'use client';
import './signup.css'
import { useActionState, useState, useRef } from 'react';
import { signUpAction } from '@/app/signup/signup.server';
import { redirect, useRouter } from 'next/navigation'
import { API_URL, type AuthActionState } from '@/lib/config/constants';

type UiState = { loading: boolean; error?: string; ok?: boolean }

export function SignUpForm({ next = '/pantry' }: { next?: string }) {
  // Con React 19: useActionState(prevState, formData)
  const [state, formAction] = useActionState<AuthActionState, FormData>(signUpAction,{ ok: false });
  const [showPwd1, setShowPwd1] = useState(false)
  const [showPwd2, setShowPwd2] = useState(false)
  const [agree, setAgree] = useState(false)
  const [ui, setUi] = useState<UiState>({ loading: false })
  const router = useRouter()

  if(state){
    if (state.ok) {
      redirect(state.next || next);
    }else{
      console.log("error")
    }
  }

  const fullNameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const pwdRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const fullName = fullNameRef.current?.value?.trim() || ''
    const email = emailRef.current?.value?.trim() || ''
    const password = pwdRef.current?.value || ''
    const confirm = confirmRef.current?.value || ''
    if (!fullName || !email || !password) {
      e.preventDefault();
      setUi({ loading: false, error: 'Completa los campos requeridos.' })
      return
    }
    if (password !== confirm) {
      e.preventDefault();
      setUi({ loading: false, error: 'Las contraseñas no coinciden.' })
      confirmRef.current?.focus()
      return
    }
    if (!agree) {
      e.preventDefault();
      setUi({ loading: false, error: 'Debes aceptar Términos y Privacidad.' })
      return
    }
    setUi({ loading: true })
    /*if (!result?.ok) {
      setUi({ loading: false, error: result?.error?.message || 'No se pudo crear la cuenta.' })
      return
    }

    /*try {
      const r = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
        cache: 'no-store',
      })
 
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        const msg =
          err?.message ||
          (r.status === 409
            ? 'El correo ya está registrado.'
            : 'No se pudo crear la cuenta.')
        setUi({ loading: false, error: msg })
        return
      }

      setUi({ loading: false, ok: true })
      // Tras crear la cuenta: llevar a /signin (o directo a /despensa según tu flujo)
      router.push('/signin?created=1')
    } catch (e) {
      setUi({ loading: false, error: 'Error de red. Inténtalo de nuevo.' })
    }*/
  }

  return (
    <form action={formAction} onSubmit={onSubmit} aria-describedby="form-help" noValidate>
      <div className="field">
        <label htmlFor="fullName">Nombre completo</label>
        <div className="control">
          <input id="fullName" ref={fullNameRef} name="fullName" type="text" autoComplete="name" placeholder="Nombre y Apellido" required />
        </div>
      </div>

      <div className="field">
        <label htmlFor="email">Correo electrónico</label>
        <div className="control">
          <input id="email" ref={emailRef} name="email" type="email" inputMode="email" autoComplete="email" placeholder="tú@correo.com" required />
        </div>
      </div>

      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <div className="control control-pass">
          <input id="password" ref={pwdRef} name="password" type={showPwd1 ? 'text' : 'password'} autoComplete="new-password" minLength={8} required />
          <button type="button" className="reveal" aria-controls="password" aria-pressed={showPwd1} title="Mostrar/ocultar contraseña" onClick={() => setShowPwd1(v => !v)}>
            👁️
          </button>
        </div>
        <div className="hint">Mínimo 8 caracteres. Recomendado: mayúsculas, minúsculas y números.</div>
      </div>

      <div className="field">
        <label htmlFor="confirm">Confirmar contraseña</label>
        <div className="control control-pass">
          <input id="confirm" ref={confirmRef} name="confirm" type={showPwd2 ? 'text' : 'password'} autoComplete="new-password" minLength={8} required />
          <button type="button" className="reveal" aria-controls="confirm" aria-pressed={showPwd2} title="Mostrar/ocultar contraseña" onClick={() => setShowPwd2(v => !v)}>
            👁️
          </button>
        </div>
      </div>

      <label className="row remember" style={{ alignItems: 'flex-start', gap: 8 }}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ accentColor: 'var(--primary)', marginTop: 3 }} />
        <span>
          Acepto los <a href="/terms">Términos</a> y la <a href="/privacy">Privacidad</a>.
        </span>
      </label>

      {ui.error && <p className="error" role="alert">{ui.error}</p>}
      {ui.ok && <p className="ok" role="status">Cuenta creada. Redirigiendo…</p>}

      <button className="btn" type="submit" disabled={ui.loading}>
        {ui.loading ? 'Creando…' : 'Crear cuenta'}
      </button>

      <button className="btn btn-alt" type="button" onClick={() => router.push('/signin')}>
        ¿Ya tienes cuenta? Inicia sesión
      </button>

      <p id="form-help" className="legal">
        Usamos tu email para crear la cuenta y enviarte notificaciones esenciales.
      </p>
    </form>
  )
}
