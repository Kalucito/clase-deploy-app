import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="text-muted-foreground">La página que buscás no existe.</p>
      <Link href="/" className={buttonVariants()}>
        Volver al tablero
      </Link>
    </main>
  );
}
