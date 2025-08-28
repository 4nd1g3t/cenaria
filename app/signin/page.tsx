// app/signin/page.tsx
import '@/components/signin/signin.css'
import LogoImage from "@/components/common/logo";
import SignInForm from "@/components/signin/signin-form";
import Head from "next/head";

type SearchParams = { next?: string };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const next = sp?.next ?? '/pantry';

  return (
    <html>
      <Head>
        <title>Cenaria — Iniciar sesión</title>
        <meta name="description" content="Inicio de sesión en Cenaria" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <main className="login-shell" role="main" aria-labelledby="login-title">
          <LogoImage />
          <SignInForm next={next} />
          <div className="footer">© {new Date().getFullYear()} Cenaria</div>
        </main>
      </body>
    </html>
  );
}
