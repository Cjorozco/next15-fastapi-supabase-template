import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="text-muted-foreground">
        El enlace no existe o ya no está disponible.
      </p>
      <Link href="/" className="underline underline-offset-4">
        Volver al inicio
      </Link>
    </main>
  );
}
