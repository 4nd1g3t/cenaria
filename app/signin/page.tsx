// app/signin/page.tsx
import '@/components/style/login.css'
import LogoImage from "@/components/common/logo";
import SignInForm from "@/components/signin/signin-form";
import { Metadata } from "next";

type SearchParams = { next?: string };

export const metadata: Metadata = {
  title: "Cenaria — Iniciar sesión",
  description: "Inicio de sesión en Cenaria",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const next = sp?.next ?? '/pantry';

  return (
    <>
      {/* Animated background elements */}
      <div className="bg-gradient" aria-hidden="true"></div>
      <div className="orb orb1" aria-hidden="true"></div>
      <div className="orb orb2" aria-hidden="true"></div>
      <div className="orb orb3" aria-hidden="true"></div>
      
      <main className="shell" role="main" aria-labelledby="login-title">
        <LogoImage />
        <SignInForm next={next} />
        <div className="footer">© {new Date().getFullYear()} Cenaria</div>
      </main>
    </>
  );
}