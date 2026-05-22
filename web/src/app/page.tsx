import Link from "next/link";

export default function PaginaPrincipal() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold sm:text-4xl">
        Plataforma de gestión documental
      </h1>
      <p className="max-w-md text-gray-600 dark:text-gray-400">
        Sube tus documentos y deja que se clasifiquen automáticamente como
        públicos o confidenciales, con el acceso protegido según su contenido.
      </p>
      <div className="flex gap-3">
        <Link
          href="/registro"
          className="rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
        >
          Crear cuenta
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-gray-300 px-5 py-2.5 font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Iniciar sesión
        </Link>
      </div>
    </main>
  );
}
