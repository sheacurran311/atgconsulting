import { SignIn, SignUp } from "@clerk/react";
import { basePath } from "@/lib/clerk";

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-ink-50 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-xl text-center mb-8">
        <p className="section-eyebrow mb-3">ATG Consulting</p>
        <h1 className="text-3xl font-extrabold text-canvas-text">Practical AI, built around you.</h1>
        <p className="mt-3 text-canvas-text">Access your account, or explore your next AI workflow.</p>
      </div>
      {children}
      <p className="mt-7 text-center text-sm text-canvas-text">
        Just looking for a free plan? <a href={`${basePath}/start`} className="font-semibold text-canvas-text underline">No account needed.</a>
      </p>
    </main>
  );
}

export function SignInPage() {
  return <AuthShell><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></AuthShell>;
}

export function SignUpPage() {
  return <AuthShell><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></AuthShell>;
}
