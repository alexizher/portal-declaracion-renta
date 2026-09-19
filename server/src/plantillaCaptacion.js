// Plantilla inicial del correo de captación de prospectos (se carga en la
// config como asunto_captacion / cuerpo_captacion y desde ahí es editable en
// el panel). Vive en un .js y no en un .html porque el despliegue copia
// server/src/*.js.
//
// Es un documento HTML completo: se envía tal cual y el panel lo muestra en
// un iframe, así su <style> no se mezcla con los estilos del panel.
//
// Variables: {{saludo}} ("Hola Ana," o "Hola," si no hay nombre),
// {{vencimiento}}, {{dias}} ("faltan 12 días"), {{digitos}}, {{baja}}.

const ASUNTO = '¿Ya presentó su declaración de renta?';

const FUENTE = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const CUERPO = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>Declaración de renta 2025</title>
<style>
  @media only screen and (max-width: 620px) {
    .cap-contenedor { width: 100% !important; }
    .cap-relleno { padding-left: 22px !important; padding-right: 22px !important; }
    .cap-titular { font-size: 24px !important; }
    .cap-col { display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#fbf8f6;">

<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#fbf8f6;font-size:1px;line-height:1px;">
  Su plazo vence el {{vencimiento}}. Revise en 1 minuto si le toca declarar y déjenos el resto a nosotros.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fbf8f6;">
<tr><td align="center" style="padding:24px 12px;">

<table role="presentation" class="cap-contenedor" width="600" cellpadding="0" cellspacing="0" border="0"
       style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e3ddd4;border-top:4px solid #c39a3b;border-radius:10px;font-family:${FUENTE};color:#3a3a3a;">

  <tr>
    <td class="cap-relleno" align="center" style="padding:28px 40px 8px;">
      <img src="https://declaraciones-renta-pn.repolite.link/logo_DM_120.png" width="64" height="64" alt="DM"
           style="display:block;border-radius:50%;border:0;">
      <p style="margin:10px 0 0;font-size:13px;letter-spacing:.4px;color:#152a45;">
        <strong>Daniela Molina Foronda</strong><br>
        <span style="color:#7b8794;">Contadora Pública · Asesora Tributaria</span>
      </p>
    </td>
  </tr>

  <tr>
    <td class="cap-relleno" style="padding:20px 40px 0;">
      <h1 class="cap-titular" style="margin:0;font-size:26px;line-height:1.25;color:#152a45;font-weight:700;">
        Su declaración de renta, presentada a tiempo y sin complicaciones
      </h1>
    </td>
  </tr>

  <tr>
    <td class="cap-relleno" style="padding:16px 40px 0;font-size:16px;line-height:1.6;">
      <p style="margin:0 0 14px;">{{saludo}}</p>
      <p style="margin:0 0 14px;">
        La DIAN ya está recibiendo las declaraciones de renta del año gravable 2025. Según los
        dos últimos dígitos de su cédula, su plazo vence el <strong>{{vencimiento}}</strong>.
      </p>
      <p style="margin:0;">
        Si le toca declarar, nosotros nos encargamos: usted nos envía sus documentos
        y le entregamos la declaración lista y presentada ante la DIAN.
      </p>
    </td>
  </tr>

  <tr>
    <td class="cap-relleno" style="padding:22px 40px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background:#152a45;border-radius:8px;">
        <tr>
          <td align="center" style="padding:18px 16px;color:#ffffff;">
            <p style="margin:0;font-size:13px;letter-spacing:.5px;color:#c39a3b;"><strong>SU FECHA LÍMITE · DÍGITOS {{digitos}}</strong></p>
            <p style="margin:6px 0 0;font-size:24px;line-height:1.2;"><strong>{{vencimiento}}</strong></p>
            <p style="margin:6px 0 0;font-size:14px;color:#d6dde8;">{{dias}}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td class="cap-relleno" style="padding:22px 40px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background:#f4f6f9;border-radius:8px;">
        <tr>
          <td style="padding:20px 22px;font-size:15px;line-height:1.55;">
            <p style="margin:0 0 10px;font-size:16px;color:#152a45;"><strong>¿Le toca declarar?</strong></p>
            <p style="margin:0 0 10px;">Debe hacerlo si en 2025 cumplió <strong>al menos una</strong> de estas condiciones:</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:15px;line-height:1.5;">
              <tr><td valign="top" width="22" style="color:#c39a3b;padding:3px 0;">&#9632;</td>
                  <td style="padding:3px 0;">Ingresos de <strong>$69.719.000</strong> o más (unos $5,8 millones al mes).</td></tr>
              <tr><td valign="top" width="22" style="color:#c39a3b;padding:3px 0;">&#9632;</td>
                  <td style="padding:3px 0;">Patrimonio de <strong>$224.096.000</strong> o más al 31 de diciembre.</td></tr>
              <tr><td valign="top" width="22" style="color:#c39a3b;padding:3px 0;">&#9632;</td>
                  <td style="padding:3px 0;">Compras con tarjeta de crédito, consumos o consignaciones de <strong>$69.719.000</strong> o más.</td></tr>
              <tr><td valign="top" width="22" style="color:#c39a3b;padding:3px 0;">&#9632;</td>
                  <td style="padding:3px 0;">Es responsable de IVA.</td></tr>
            </table>
            <p style="margin:12px 0 0;font-size:14px;color:#5b6573;">
              ¿No está seguro? Escríbanos y lo revisamos con usted, sin costo.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td class="cap-relleno" style="padding:28px 40px 0;font-size:15px;line-height:1.55;">
      <p style="margin:0 0 14px;font-size:17px;color:#152a45;"><strong>Cómo le ayudamos</strong></p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td class="cap-col" valign="top" width="50%" style="padding-right:10px;">
            <p style="margin:0 0 4px;color:#152a45;"><strong>1. Revisamos su información</strong></p>
            <p style="margin:0 0 14px;">Cruzamos sus documentos con lo que bancos y empresas le reportaron a la DIAN, para que no haya sorpresas.</p>
          </td>
          <td class="cap-col" valign="top" width="50%" style="padding-left:10px;">
            <p style="margin:0 0 4px;color:#152a45;"><strong>2. Aplicamos lo que la ley le permite</strong></p>
            <p style="margin:0 0 14px;">Deducciones y rentas exentas por dependientes, salud, vivienda o aportes voluntarios, para que pague lo justo.</p>
          </td>
        </tr>
        <tr>
          <td class="cap-col" valign="top" width="50%" style="padding-right:10px;">
            <p style="margin:0 0 4px;color:#152a45;"><strong>3. Todo desde su portal personal</strong></p>
            <p style="margin:0 0 14px;">Sube sus documentos desde el celular y ve cuáles aprobamos. Su información se guarda cifrada.</p>
          </td>
          <td class="cap-col" valign="top" width="50%" style="padding-left:10px;">
            <p style="margin:0 0 4px;color:#152a45;"><strong>4. Presentamos y le entregamos todo</strong></p>
            <p style="margin:0 0 14px;">Declaración presentada, anexo explicativo y recibo de pago (si aplica), listos para descargar.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td class="cap-relleno" style="padding:10px 40px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="border-left:4px solid #b97f7f;background:#fbf4f3;border-radius:0 8px 8px 0;">
        <tr>
          <td style="padding:14px 18px;font-size:15px;line-height:1.5;">
            Declarar tarde tiene una sanción mínima de <strong>$524.000</strong>, aunque no tenga impuesto
            a pagar. Presentarla a tiempo cuesta menos que la multa.
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td class="cap-relleno" style="padding:26px 40px 0;font-size:15px;line-height:1.55;">
      <p style="margin:0 0 8px;font-size:17px;color:#152a45;"><strong>Para empezar solo necesitamos</strong></p>
      <p style="margin:0;">
        Su cédula, su RUT (si no lo tiene, le ayudamos a sacarlo) y su clave de la DIAN.
        Con eso le enviamos la lista exacta de documentos según su caso.
      </p>
    </td>
  </tr>

  <tr>
    <td class="cap-relleno" align="center" style="padding:28px 40px 6px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" bgcolor="#152a45" style="border-radius:6px;">
            <a href="https://wa.me/573117809709?text=Hola%20Daniela%2C%20quiero%20ayuda%20con%20mi%20declaraci%C3%B3n%20de%20renta%202025."
               style="display:inline-block;padding:14px 30px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:6px;font-family:${FUENTE};">
              Quiero declarar con ustedes
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-size:14px;color:#5b6573;">
        Le respondemos por WhatsApp al <strong>311 780 9709</strong>, o simplemente responda este correo.
      </p>
    </td>
  </tr>

  <tr>
    <td class="cap-relleno" style="padding:24px 40px 28px;font-size:15px;line-height:1.55;">
      <p style="margin:0;">Cordial saludo,</p>
      <p style="margin:6px 0 0;">
        <strong style="color:#152a45;">Daniela Molina Foronda</strong><br>
        <span style="font-size:14px;color:#5b6573;">Contadora Pública · Asesora Tributaria<br>
        Tarjeta profesional 260769-T<br>
        Tel. / WhatsApp 311 780 9709</span>
      </p>
    </td>
  </tr>

</table>

<table role="presentation" class="cap-contenedor" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
  <tr>
    <td class="cap-relleno" style="padding:16px 40px 0;font-family:${FUENTE};font-size:12px;line-height:1.5;color:#8b8f96;text-align:center;">
      Recibe este correo porque sus datos hacen parte de nuestra base de contactos. Sus datos se tratan
      conforme a la Ley 1581 de 2012 y solo se usan para informarle sobre nuestros servicios tributarios.
      Si no desea recibir más mensajes, puede <a href="{{baja}}" style="color:#152a45;">darse de baja aquí</a>.
    </td>
  </tr>
</table>

</td></tr>
</table>
</body>
</html>`;

module.exports = { ASUNTO, CUERPO };
