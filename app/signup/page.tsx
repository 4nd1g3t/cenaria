// app/signup/page.tsx
import '@/components/style/login.css'
import LogoImage from '@/components/common/logo';
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
    <>
      <div className="bg-gradient" aria-hidden="true"></div>
      <div className="orb orb1" aria-hidden="true"></div>
      <div className="orb orb2" aria-hidden="true"></div>
      <div className="orb orb3" aria-hidden="true"></div>
      <main className="shell" role="main" aria-labelledby="signup-title">        
          <LogoImage />
          <SignUpForm next={next} />
      <div className="footer">© {new Date().getFullYear()} Cenaria</div>
      </main>
    </>
  );
}
