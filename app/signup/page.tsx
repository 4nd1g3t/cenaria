// app/signup/page.tsx
import { SignUpForm } from '@/components/signup/signup-form';

type SearchParams = { next?: string };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const next = sp?.next ?? '/pantry';

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-2 text-2xl font-semibold">Crear cuenta</h1>
      <p className="mb-6 text-sm text-gray-600">
        Completa el formulario para registrarte. Después te enviaremos a{' '}
        <span className="font-mono">{next}</span>.
      </p>
      <SignUpForm next={next} />
      <p className="mt-6 text-sm text-gray-600">
        ¿Ya tienes cuenta?{' '}
        <a className="underline" href={`/signin?next=${encodeURIComponent(next)}`}>
          Inicia sesión
        </a>
      </p>
    </main>
  );
}
