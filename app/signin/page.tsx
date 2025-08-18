// app/signin/page.tsx
import { SignInForm } from './signin-form';

type SearchParams = { next?: string };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const next = sp?.next ?? '/despensa';

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-semibold">Ingresar</h1>
      <p className="mb-6 text-sm text-gray-600">
        Autentícate para continuar. Serás redirigido a{' '}
        <span className="font-mono">{next}</span>.
      </p>
      <SignInForm next={next} />
      <p className="mt-6 text-sm text-gray-600">
        ¿No tienes cuenta? <a className="underline" href={`/signup?next=${encodeURIComponent(next)}`}>Crear cuenta</a>
      </p>
    </main>
  );
}
