import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center mb-8">
        <SignIn afterSignInUrl="/chat" />
      </div>
    </div>
  );
}
