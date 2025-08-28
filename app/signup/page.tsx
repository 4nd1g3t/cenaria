// app/signup/page.tsx
import '@/components/signup/signup.css'
import LogoImage from '@/components/common/logo';
import { SignUpForm } from '@/components/signup/signup-form';
import Head from "next/head";

type SearchParams = { next?: string };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const next = sp?.next ?? '/pantry';

  return (
    <html>
      <Head>
        <title>Cenaria — Crear cuenta</title>
        <meta name="description" content="Crear cuenta en Cenaria" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <main className="shell" role="main" aria-labelledby="signup-title">        <LogoImage />
        <SignUpForm next={next} />
      <div className="footer">© {new Date().getFullYear()} Cenaria</div>
    </main>
          </body>
    </html>
  );
}
