import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const handleGoBack = () => {
    window.history.back();
  };

  const avisoDePrivacidad = `
<b>1. Información que Recopilamos</b><br><br>

<b>Información que proporcionas:</b><br>
– Información de cuenta a través de Google o Apple (nombre, email)<br>
– Textos que envías para práctica y corrección<br>
– Información de pago procesada por Stripe (no almacenamos datos de tarjeta)<br><br>

<b>Información automática:</b><br>
– Datos de uso y sesión<br>
– Tipo de dispositivo y navegador<br>
– Dirección IP<br><br>

<b>2. Cómo Usamos tu Información</b><br><br>
– Proporcionar el servicio de corrección de idiomas<br>
– Procesar pagos y gestionar suscripciones<br>
– Mejorar la experiencia del usuario<br>
– Enviar comunicaciones transaccionales<br>
– Cumplir obligaciones legales<br><br>

<b>3. Procesamiento con IA de Terceros</b><br><br>
Utilizamos servicios de inteligencia artificial de terceros para procesar y corregir tus textos.<br><br>

<b>Importante:</b><br>
– Estos proveedores operan bajo sus propias políticas de privacidad<br>
– Podemos cambiar de proveedor según las necesidades del servicio<br>
– No controlamos el tratamiento de datos que estos proveedores realizan<br>
– Tus textos pueden ser procesados en servidores fuera de México<br><br>

Al usar Polyglot Point aceptas que tus textos sean enviados a estos servicios externos para su procesamiento.<br><br>

<b>4. Compartición de Datos</b><br><br>
No vendemos tu información personal. Solo compartimos con:<br>
– Stripe (procesamiento de pagos)<br>
– Proveedores de IA (correcciones)<br>
– Google/Apple (autenticación)<br>
– Autoridades cuando la ley lo requiera<br><br>

<b>5. Transferencias Internacionales</b><br><br>
Tus datos pueden ser transferidos y procesados fuera de México, incluyendo en Estados Unidos y otros países. Al usar el servicio aceptas estas transferencias internacionales.<br><br>

<b>6. Tus Derechos</b><br><br>
Dependiendo de tu ubicación, tienes derecho a:<br>
– Acceder a tus datos personales<br>
– Corregir datos inexactos<br>
– Eliminar tus datos<br>
– Exportar tus datos<br>
– Retirar el consentimiento<br><br>

Para ejercer estos derechos, envía un correo a: <b>soporte@polyglotpoint.com</b><br><br>

<b>7. Seguridad</b><br><br>
– Encriptación de datos en tránsito (TLS/SSL)<br>
– Autenticación segura vía Google y Apple<br>
– Controles de acceso y monitoreo<br><br>

Hacemos esfuerzos razonables para proteger tus datos, pero ningún sistema es completamente seguro.<br><br>

<b>8. Retención de Datos</b><br><br>
– Datos de cuenta: mientras esté activa + 30 días tras eliminación de cuenta<br>
– Historial de práctica: 90 días<br>
– Registros de pago: según regulaciones fiscales aplicables<br><br>

<b>9. Menores de Edad</b><br><br>
El servicio no está destinado a menores de 13 años. No recopilamos conscientemente información de menores.<br><br>

<b>10. Cookies</b><br><br>
Utilizamos únicamente cookies esenciales necesarias para el funcionamiento del servicio, incluyendo autenticación y gestión de sesión.<br><br>

<b>11. Usuarios en California (CCPA)</b><br><br>
Tienes derecho a saber qué datos recopilamos, eliminarlos y optar por no participar en la venta de datos. No vendemos información personal.<br><br>

<b>12. Usuarios en Europa (GDPR)</b><br><br>
Base legal para el procesamiento: ejecución de contrato, intereses legítimos y consentimiento. Puedes contactarnos para ejercer tus derechos.<br><br>

<b>13. Usuarios en México (LFPDPPP)</b><br><br>
Como titular de datos personales tienes derecho a Acceder, Rectificar, Cancelar u Oponerte (derechos ARCO) al tratamiento de tus datos.<br><br>

Para ejercer estos derechos contacta a: <b>soporte@polyglotpoint.com</b><br>
Plazo de respuesta: máximo 30 días hábiles.<br><br>

<b>14. Cambios a esta Política</b><br><br>
Podemos actualizar esta política ocasionalmente. Te notificaremos de cambios significativos por correo electrónico.<br><br>

<b>15. Contacto</b><br><br>
<b>Email:</b> soporte@polyglotpoint.com<br>
<b>Domicilio:</b> [Insertar domicilio fiscal]<br>
<b>RFC:</b> [Insertar RFC]<br>
<b>Tiempo de respuesta:</b> máximo 30 días hábiles<br><br>

<div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
<b>Polyglot Point S.A. de C.V.</b><br>
Al usar Polyglot Point aceptas esta Política de Privacidad.<br>
Versión 2.0 — Vigente desde Enero 2026
</div>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            Política de Privacidad
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Polyglot Point S.A. de C.V.
          </p>
          
          <div 
            className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: avisoDePrivacidad }}
          />
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Última actualización: Enero 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}