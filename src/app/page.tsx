import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white">
      <div className="text-center space-y-6 max-w-lg px-4">
        <h1 className="text-5xl font-bold tracking-tight">Transactly.nl</h1>
        <p className="text-gray-400 text-lg">
          Een moderne CRM om je pipeline te beheren, deals te volgen en meer business te sluiten.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium transition-colors"
          >
            Inloggen
          </Link>
          <Link
            href="/signup"
            className="px-6 py-3 rounded-lg border border-gray-700 hover:border-gray-500 font-medium transition-colors"
          >
            Aan de slag
          </Link>
        </div>
      </div>
    </main>
  );
}
