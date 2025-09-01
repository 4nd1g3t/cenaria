// components/signin/signin-form.tsx
'use client'
import { FormEvent, useActionState, useRef, useState, useEffect } from 'react'
import { signInAction } from '@/app/signin/signin.server'
import { type AuthActionState } from '@/lib/types'
import { redirect } from 'next/navigation'

type UiState = { loading: boolean; error?: string; ok?: boolean }

export default function SignInForm({ next = '/pantry' }: { next?: string }) {
  const [state, formAction] = useActionState<AuthActionState, FormData>(signInAction, { ok: false })
  const [revealed, setRevealed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const submitRef = useRef<HTMLButtonElement>(null)
  const [ui, setUi] = useState<UiState>({ loading: false })
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) {
      // Add small delay for UX
      setTimeout(() => {
        redirect(state.next || next);
      }, 500);
    } else if (state?.error) {
      setIsLoading(false);
    }
  }, [state, next]);

  const emailRef = useRef<HTMLInputElement>(null)
  const pwdRef = useRef<HTMLInputElement>(null)

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const email = emailRef.current?.value?.trim() || ''
    const password = pwdRef.current?.value || ''
     if (!email || !password) {
      e.preventDefault();
      setUi({ loading: false, error: 'Completa los campos requeridos.' })
      setIsLoading(false);
      return
    }
    setIsLoading(true);
  }

  return (
    <form 
      ref={formRef}
      action={formAction} 
      aria-describedby="form-help" 
      onSubmit={onSubmit}
      noValidate
    >
      {/* Show error message if exists */}
      {state?.error && (
        <div className="error-message" role="alert">
          {state.error.message}
        </div>
      )}

      {ui.error && <p className="error" role="alert">{ui.error}</p>}

      {/* Hidden field for next URL */}
      <input type="hidden" name="next" value={next} />

      <div className="field">
        <label htmlFor="email">Correo electrónico</label>
        <div className="control">
          <input 
            id="email" 
            name="email" 
            type="email" 
            ref={emailRef} 
            inputMode="email" 
            autoComplete="email" 
            placeholder="tú@correo.com" 
            required 
            aria-required="true"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <div className="control control-pass">
          <input 
            id="password" 
            name="password" 
            ref={pwdRef}
            type={revealed ? 'text' : 'password'} 
            autoComplete="current-password" 
            placeholder="••••••••"
            minLength={8} 
            required 
            aria-required="true"
            disabled={isLoading}
          />
          <button
            type="button"
            aria-controls="password"
            aria-pressed={revealed}
            title={revealed ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="reveal"
            onClick={() => setRevealed(v => !v)}
            disabled={isLoading}
          >
            {revealed ? '👁️‍🗨️' : '👁️'}
          </button>
        </div>
      </div>

      <div className="rowSign">
        <label className="remember">
          <input 
            type="checkbox" 
            name="remember" 
            value="1" 
            disabled={isLoading}
          /> 
          Recordarme
        </label>
        <a href="/forgot" rel="nofollow">¿Olvidaste tu contraseña?</a>
      </div>

      <button 
        className="btn" 
        type="submit" 
        id="submit" 
        ref={submitRef}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className="spinner" aria-hidden="true"></span>
            <span className="sr-only">Iniciando sesión...</span>
          </>
        ) : (
          'Iniciar sesión'
        )}
      </button>

      <div className="or">o</div>
      
      <div className="alt">
        <button 
          className="btn btn-alt" 
          type="button" 
          onClick={() => (location.href = '/signup')}
          disabled={isLoading}
        >
          Crear cuenta nueva
        </button>
      </div>

      <p id="form-help" className="legal">
        Al continuar aceptas los <a href="/terms">Términos</a> y <a href="/privacy">Privacidad</a>.
      </p>
    </form>
  )
}

// Add screen reader only class for accessibility
const styles = `
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}