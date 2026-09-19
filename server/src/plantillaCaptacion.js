// Plantilla inicial del correo de captación de prospectos (se carga en la
// config como asunto_captacion / cuerpo_captacion y desde ahí es editable en
// el panel). Vive en un .js y no en un .html porque el despliegue copia
// server/src/*.js.
//
// Es un documento HTML completo: se envía tal cual y el panel lo muestra en
// un iframe, así su <style> no se mezcla con los estilos del panel.
//
// Tono de presentación, a propósito: no saluda por el nombre ni da por hecho
// que el destinatario está obligado a declarar (la base es de posibles
// clientes, no de declarantes confirmados). Es Daniela presentándose y
// ofreciendo acompañamiento.
//
// Variables: {{fechas}} (tabla de los plazos que aún no vencen),
// {{ultimo_plazo}} ("26 de octubre") y {{baja}}. {{saludo}} sigue disponible
// en renderCorreoCaptacion para quien quiera un correo personalizado.

const ASUNTO = 'Presentación: Daniela Molina, contadora pública';

const FUENTE = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const CUERPO = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>Presentación: Daniela Molina, contadora pública</title>
<style>
  @media only screen and (max-width: 620px) {
    .cap-contenedor { width: 100% !important; }
    .cap-relleno { padding-left: 22px !important; padding-right: 22px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#fbf8f6;">

<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#fbf8f6;font-size:1px;line-height:1px;">
  Me presento y le cuento cómo acompaño a personas naturales en sus temas tributarios.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fbf8f6;">
<tr><td align="center" style="padding:24px 12px;">

<table role="presentation" class="cap-contenedor" width="600" cellpadding="0" cellspacing="0" border="0"
       style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e3ddd4;border-top:4px solid #c39a3b;border-radius:10px;font-family:${FUENTE};color:#3a3a3a;">

  <tr>
    <td class="cap-relleno" style="padding:24px 40px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="middle" style="padding-right:12px;">
            <img src="https://declaraciones-renta-pn.repolite.link/logo_DM_120.png" width="48" height="48" alt="DM"
                 style="display:block;border-radius:50%;border:0;">
          </td>
          <td valign="middle" style="font-size:14px;line-height:1.4;color:#152a45;">
            <strong>Daniela Molina Foronda</strong><br>
            <span style="color:#7b8794;">Contadora Pública · Asesora Tributaria</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td class="cap-relleno" style="padding:24px 40px 0;font-size:16px;line-height:1.65;">
      <p style="margin:0 0 16px;">Buen día,</p>
      <p style="margin:0 0 16px;">
        Mi nombre es Daniela Molina Foronda, soy contadora pública y asesora tributaria. Le escribo
        para presentarme y ponerme a su disposición ahora que está abierta la temporada de
        declaración de renta para personas naturales, con plazos hasta el {{ultimo_plazo}}.
      </p>
      <p style="margin:0 0 10px;">
        Ofrezco una <strong>asesoría personalizada que acompaña todo el proceso</strong>, de principio a fin:
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:16px;line-height:1.55;">
        <tr><td valign="top" width="22" style="color:#c39a3b;padding:4px 0;">&#9632;</td>
            <td style="padding:4px 0;">Revisar cada caso y aclarar si existe o no la obligación de declarar.</td></tr>
        <tr><td valign="top" width="22" style="color:#c39a3b;padding:4px 0;">&#9632;</td>
            <td style="padding:4px 0;">Organizar la información y los soportes necesarios, sin complicaciones.</td></tr>
        <tr><td valign="top" width="22" style="color:#c39a3b;padding:4px 0;">&#9632;</td>
            <td style="padding:4px 0;">Aplicar las deducciones y beneficios que permite la ley, para pagar lo justo.</td></tr>
        <tr><td valign="top" width="22" style="color:#c39a3b;padding:4px 0;">&#9632;</td>
            <td style="padding:4px 0;">Presentar la declaración y entregar todos los soportes.</td></tr>
      </table>
      <p style="margin:16px 0 0;">
        Todo se puede hacer a distancia, por un portal seguro, o con una conversación directa si
        así lo prefiere.
      </p>
    </td>
  </tr>

  <tr>
    <td class="cap-relleno" style="padding:26px 40px 0;">
      <p style="margin:0 0 4px;font-size:16px;color:#152a45;"><strong>Calendario DIAN: plazos que quedan</strong></p>
      <p style="margin:0 0 12px;font-size:14px;color:#5b6573;">Personas naturales, según los dos últimos dígitos de la cédula.</p>
      {{fechas}}
      <p style="margin:10px 0 0;font-size:13px;color:#7b8794;">
        Si una fecha ya pasó, la declaración todavía se puede presentar, con la menor sanción posible.
      </p>
    </td>
  </tr>

  <tr>
    <td class="cap-relleno" style="padding:26px 40px 0;font-size:16px;line-height:1.65;">
      <p style="margin:0;">
        Si usted o alguien cercano necesita orientación, con gusto le atiendo. Solo responda este
        correo o escríbame por WhatsApp.
      </p>
    </td>
  </tr>

  <tr>
    <td class="cap-relleno" style="padding:20px 40px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" bgcolor="#152a45" style="border-radius:6px;">
            <a href="https://wa.me/573117809709?text=Hola%20Daniela%2C%20me%20gustar%C3%ADa%20recibir%20orientaci%C3%B3n%20sobre%20la%20declaraci%C3%B3n%20de%20renta."
               style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:6px;font-family:${FUENTE};">
              Conversar con Daniela por WhatsApp
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td class="cap-relleno" style="padding:26px 40px 0;font-size:16px;line-height:1.6;">
      <p style="margin:0;">Cordialmente,</p>
      <p style="margin:8px 0 0;">
        <strong style="color:#152a45;">Daniela Molina Foronda</strong><br>
        <span style="font-size:14px;color:#5b6573;">Contadora Pública · Asesora Tributaria<br>
        T.P. 260769-T · 311 780 9709</span>
      </p>
    </td>
  </tr>

  <tr>
    <td class="cap-relleno" style="padding:22px 40px 28px;">
      <p style="margin:0;padding-top:14px;border-top:1px solid #efe9e1;font-size:14px;line-height:1.55;color:#5b6573;">
        <em>Un dato útil: presentar la declaración de renta fuera de plazo genera una sanción mínima
        de $524.000, aunque no haya impuesto a pagar.</em>
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
