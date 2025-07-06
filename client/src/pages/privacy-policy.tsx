import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  const handleGoBack = () => {
    setLocation("/conversation-simple");
  };

  const avisoDePrivacidad = `
<b>Información que recolectamos</b><br>
– Email (si se proporciona), país, idioma.<br>
– Datos técnicos: IP, tipo de dispositivo, duración de sesiones, idioma usado.<br>
– Se genera voz mediante sistemas de texto a voz (TTS); <b>no se graba ni almacena la voz del usuario.</b><br><br>

<b>Cómo usamos la información</b><br>
– Personalizar la experiencia del usuario.<br>
– Análisis de uso para mejorar el funcionamiento y diseño de la app.<br><br>

<b>Compartición de datos</b><br>
– Solo con proveedores estrictamente necesarios (servicio de alojamiento, sistemas de texto a voz, analítica técnica).<br>
– <b>No vendemos datos personales.</b><br><br>

<b>Seguridad</b><br>
– Todas las comunicaciones están protegidas mediante cifrado HTTPS.<br>
– Acceso a datos limitado y controlado internamente.<br><br>

<b>Derechos del usuario</b><br>
– El usuario puede acceder, corregir o eliminar sus datos.<br>
– Puede solicitar la eliminación completa de su cuenta y sus registros.<br>
– Puede retirar permisos en cualquier momento.<br><br>

<b>Conservación de datos</b><br>
– La información se conserva solo durante el tiempo necesario para el uso de la app.<br>
– Los datos anónimos se retienen hasta por 2 años para análisis técnico.<br><br>

<b>Actualizaciones</b><br>
– Este aviso puede cambiar con el tiempo.<br>
– Cualquier cambio será notificado en esta misma vista.
`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            onClick={handleGoBack}
            variant="ghost"
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>

          {/* Logo */}
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold leading-tight" style={{ color: '#1E88E5' }}>
              Polyglot
            </div>
            <div className="text-2xl font-bold leading-tight -mt-1" style={{ color: '#4CAF50' }}>
              Point
            </div>
          </div>

          <div className="w-16"></div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Aviso de Privacidad — Polyglot Point
          </h1>
          
          <div 
            className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: avisoDePrivacidad }}
          />
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Última actualización: {new Date().toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
