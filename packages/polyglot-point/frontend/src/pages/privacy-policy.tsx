import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const handleGoBack = () => {
    window.history.back();
  };

  const avisoDePrivacidad = `
<b>1. InformaciÃƒÆ’Ã‚Â³n que Recopilamos</b><br><br>

<b>InformaciÃƒÆ’Ã‚Â³n que proporcionas:</b><br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ InformaciÃƒÆ’Ã‚Â³n de cuenta a travÃƒÆ’Ã‚Â©s de Google o Apple (nombre, email)<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Textos que envÃƒÆ’Ã‚Â­as para prÃƒÆ’Ã‚Â¡ctica y correcciÃƒÆ’Ã‚Â³n<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ InformaciÃƒÆ’Ã‚Â³n de pago procesada por Stripe (no almacenamos datos de tarjeta)<br><br>

<b>InformaciÃƒÆ’Ã‚Â³n automÃƒÆ’Ã‚Â¡tica:</b><br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Datos de uso y sesiÃƒÆ’Ã‚Â³n<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Tipo de dispositivo y navegador<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ DirecciÃƒÆ’Ã‚Â³n IP<br><br>

<b>2. CÃƒÆ’Ã‚Â³mo Usamos tu InformaciÃƒÆ’Ã‚Â³n</b><br><br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Proporcionar el servicio de correcciÃƒÆ’Ã‚Â³n de idiomas<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Procesar pagos y gestionar suscripciones<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Mejorar la experiencia del usuario<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Enviar comunicaciones transaccionales<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Cumplir obligaciones legales<br><br>

<b>3. Procesamiento con IA de Terceros</b><br><br>
Utilizamos servicios de inteligencia artificial de terceros para procesar y corregir tus textos.<br><br>

<b>Importante:</b><br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Estos proveedores operan bajo sus propias polÃƒÆ’Ã‚Â­ticas de privacidad<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Podemos cambiar de proveedor segÃƒÆ’Ã‚Âºn las necesidades del servicio<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ No controlamos el tratamiento de datos que estos proveedores realizan<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Tus textos pueden ser procesados en servidores fuera de MÃƒÆ’Ã‚Â©xico<br><br>

Al usar Polyglot Point aceptas que tus textos sean enviados a estos servicios externos para su procesamiento.<br><br>

<b>4. ComparticiÃƒÆ’Ã‚Â³n de Datos</b><br><br>
No vendemos tu informaciÃƒÆ’Ã‚Â³n personal. Solo compartimos con:<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Stripe (procesamiento de pagos)<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Proveedores de IA (correcciones)<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Google/Apple (autenticaciÃƒÆ’Ã‚Â³n)<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Autoridades cuando la ley lo requiera<br><br>

<b>5. Transferencias Internacionales</b><br><br>
Tus datos pueden ser transferidos y procesados fuera de MÃƒÆ’Ã‚Â©xico, incluyendo en Estados Unidos y otros paÃƒÆ’Ã‚Â­ses. Al usar el servicio aceptas estas transferencias internacionales.<br><br>

<b>6. Tus Derechos</b><br><br>
Dependiendo de tu ubicaciÃƒÆ’Ã‚Â³n, tienes derecho a:<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Acceder a tus datos personales<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Corregir datos inexactos<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Eliminar tus datos<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Exportar tus datos<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Retirar el consentimiento<br><br>

Para ejercer estos derechos, envÃƒÆ’Ã‚Â­a un correo a: <b>soporte@polyglotpoint.com</b><br><br>

<b>7. Seguridad</b><br><br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ EncriptaciÃƒÆ’Ã‚Â³n de datos en trÃƒÆ’Ã‚Â¡nsito (TLS/SSL)<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ AutenticaciÃƒÆ’Ã‚Â³n segura vÃƒÆ’Ã‚Â­a Google y Apple<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Controles de acceso y monitoreo<br><br>

Hacemos esfuerzos razonables para proteger tus datos, pero ningÃƒÆ’Ã‚Âºn sistema es completamente seguro.<br><br>

<b>8. RetenciÃƒÆ’Ã‚Â³n de Datos</b><br><br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Datos de cuenta: mientras estÃƒÆ’Ã‚Â© activa + 30 dÃƒÆ’Ã‚Â­as tras eliminaciÃƒÆ’Ã‚Â³n de cuenta<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Historial de prÃƒÆ’Ã‚Â¡ctica: 90 dÃƒÆ’Ã‚Â­as<br>
ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ Registros de pago: segÃƒÆ’Ã‚Âºn regulaciones fiscales aplicables<br><br>

<b>9. Menores de Edad</b><br><br>
El servicio no estÃƒÆ’Ã‚Â¡ destinado a menores de 13 aÃƒÆ’Ã‚Â±os. No recopilamos conscientemente informaciÃƒÆ’Ã‚Â³n de menores.<br><br>

<b>10. Cookies</b><br><br>
Utilizamos ÃƒÆ’Ã‚Âºnicamente cookies esenciales necesarias para el funcionamiento del servicio, incluyendo autenticaciÃƒÆ’Ã‚Â³n y gestiÃƒÆ’Ã‚Â³n de sesiÃƒÆ’Ã‚Â³n.<br><br>

<b>11. Usuarios en California (CCPA)</b><br><br>
Tienes derecho a saber quÃƒÆ’Ã‚Â© datos recopilamos, eliminarlos y optar por no participar en la venta de datos. No vendemos informaciÃƒÆ’Ã‚Â³n personal.<br><br>

<b>12. Usuarios en Europa (GDPR)</b><br><br>
Base legal para el procesamiento: ejecuciÃƒÆ’Ã‚Â³n de contrato, intereses legÃƒÆ’Ã‚Â­timos y consentimiento. Puedes contactarnos para ejercer tus derechos.<br><br>

<b>13. Usuarios en MÃƒÆ’Ã‚Â©xico (LFPDPPP)</b><br><br>
Como titular de datos personales tienes derecho a Acceder, Rectificar, Cancelar u Oponerte (derechos ARCO) al tratamiento de tus datos.<br><br>

Para ejercer estos derechos contacta a: <b>soporte@polyglotpoint.com</b><br>
Plazo de respuesta: mÃƒÆ’Ã‚Â¡ximo 30 dÃƒÆ’Ã‚Â­as hÃƒÆ’Ã‚Â¡biles.<br><br>

<b>14. Cambios a esta PolÃƒÆ’Ã‚Â­tica</b><br><br>
Podemos actualizar esta polÃƒÆ’Ã‚Â­tica ocasionalmente. Te notificaremos de cambios significativos por correo electrÃƒÆ’Ã‚Â³nico.<br><br>

<b>15. Contacto</b><br><br>
<b>Email:</b> soporte@polyglotpoint.com<br>
<b>Domicilio:</b> [Insertar domicilio fiscal]<br>
<b>RFC:</b> [Insertar RFC]<br>
<b>Tiempo de respuesta:</b> mÃƒÆ’Ã‚Â¡ximo 30 dÃƒÆ’Ã‚Â­as hÃƒÆ’Ã‚Â¡biles<br><br>

<div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
<b>Polyglot Point S.A. de C.V.</b><br>
Al usar Polyglot Point aceptas esta PolÃƒÆ’Ã‚Â­tica de Privacidad.<br>
VersiÃƒÆ’Ã‚Â³n 2.0 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Vigente desde Enero 2026
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
            PolÃƒÆ’Ã‚Â­tica de Privacidad
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
              ÃƒÆ’Ã…Â¡ltima actualizaciÃƒÆ’Ã‚Â³n: Enero 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}