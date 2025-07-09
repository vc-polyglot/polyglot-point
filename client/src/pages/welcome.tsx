import { toast } from "../hooks/use-toast"

export default function Welcome() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Bienvenido a Polyglot Point</h1>

      <button
        onClick={() =>
          toast({
            title: "¡Notificación lanzada!",
            description: "Este toast viene desde use-toast.ts",
          })
        }
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Probar Toast
      </button>
    </div>
  )
}
