import { SnowflakeIcon } from "@/components/icons";
import { BUSINESS_NAME } from "@/lib/config";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
          <SnowflakeIcon className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{BUSINESS_NAME}</h1>
        <p className="mt-1 text-sm text-slate-500">Every job, followed up.</p>
      </div>
      <LoginForm next={next ?? "/"} showDemo={process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN !== "false"} />
    </div>
  );
}
