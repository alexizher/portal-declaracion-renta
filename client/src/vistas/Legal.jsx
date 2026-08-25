// Páginas públicas de Términos y Condiciones y Política de tratamiento de
// datos personales. Sin login (igual que /portal): cualquiera con el enlace
// las puede leer, incluso antes de tener un token de portal.
// Redactadas en lenguaje sencillo a propósito: el público es el cliente
// normal (no técnico), no un abogado ni un ingeniero.

function CascaronLegal({ titulo, children }) {
  return (
    <div className="portal">
      <header className="barra portal-barra">
        <img src="/logo_DM.svg" alt="DM" className="logo" />
        <h1>
          Declaración de Renta
          <span className="portal-sub">{titulo}</span>
        </h1>
      </header>
      <main className="portal-cuerpo legal-cuerpo">{children}</main>
      <footer className="portal-pie-marca">
        <p>
          <strong>Daniela Molina Foronda</strong>
          <br />
          Contadora Pública · Tarjeta profesional 260769-T
        </p>
        <p>Tel. 311 780 9709 · daniforo1@gmail.com</p>
        <p className="portal-pie-legal">
          <a href="/terminos">Términos y condiciones</a> ·{' '}
          <a href="/privacidad">Política de tratamiento de datos</a>
        </p>
      </footer>
    </div>
  );
}

export function Terminos() {
  return (
    <CascaronLegal titulo="Términos y condiciones">
      <div className="tarjeta legal-tarjeta">
        <h2>Términos y condiciones de uso del portal</h2>
        <p className="tenue">Versión 3 · Última actualización: 16 de agosto de 2026.</p>

        <p>
          Este portal es una herramienta de <strong>Daniela Molina Foronda</strong>, Contadora
          Pública (tarjeta profesional 260769-T), para que sus clientes entreguen los documentos
          de su declaración de renta de forma más ordenada y segura que por correo o WhatsApp. Al
          usar tu enlace personal — subir un documento, guardar tu clave de la DIAN o actualizar
          tus datos — aceptas lo que dice este documento.
        </p>

        <h3>1. Qué es (y qué no es) el portal</h3>
        <p>
          El portal es gratuito y hace parte del servicio de asesoría tributaria que ya contrataste
          con tu contadora; no es un servicio aparte ni tiene costo adicional. Los honorarios y
          condiciones de tu declaración se acuerdan directamente con ella, no aquí.
        </p>
        <p>Con el portal puedes:</p>
        <ul>
          <li>Ver la lista de documentos que te piden y su estado (por subir, en revisión,
            aprobado o para corregir).</li>
          <li>Subir esos documentos, o cualquier otro que quieras agregar, en PDF, foto o archivo
            de Office, hasta 15 MB por archivo.</li>
          <li>Dejar guardada tu clave de la DIAN, si quieres, para que tu contadora presente la
            declaración por ti (ver punto 4).</li>
          <li>Recibir avisos del estado de tus documentos y de tu fecha límite ante la DIAN.</li>
          <li>Descargar tu declaración ya presentada, el anexo y el recibo de pago.</li>
          <li>Actualizar tu propio correo y celular de contacto.</li>
        </ul>
        <p>
          El portal no revisa ni prepara tu declaración por sí solo: eso lo sigue haciendo tu
          contadora. Es solo el canal para intercambiar documentos e información.
        </p>

        <h3>2. Tu enlace personal</h3>
        <p>
          Entras al portal con un enlace que te llega a tu correo, sin usuario ni contraseña. Eso
          significa que <strong>cualquiera que tenga ese enlace puede ver y subir documentos como
          si fueras tú</strong>, así que:
        </p>
        <ul>
          <li>No lo reenvíes ni lo compartas con nadie que no deba verlo.</li>
          <li>Avísale a tu contadora si crees que alguien más lo obtuvo, para desactivarlo y
            enviarte uno nuevo.</li>
          <li>Mantén tu correo actualizado, porque es donde te llega ese enlace y todos los avisos.</li>
        </ul>
        <p>
          Si lo pierdes, puedes pedir que te lo reenvíen escribiendo tu cédula en{' '}
          <code>/portal</code>. Por seguridad, siempre se envía al correo que ya tenemos
          registrado, nunca a uno distinto que escribas ahí.
        </p>

        <h3>3. Que los documentos sean tuyos y reales</h3>
        <p>
          Los documentos que subas deben ser tuyos, reales y estar vigentes. Tu contadora revisa
          que estén completos y legibles, pero no puede verificar por otros medios que la
          información dentro de ellos sea correcta — esa responsabilidad es tuya.
        </p>

        <h3>4. Tu clave de la DIAN</h3>
        <p>Dejarla guardada en el portal es completamente opcional. Si la dejas:</p>
        <ul>
          <li>Autorizas a tu contadora a usarla <strong>únicamente</strong> para presentar tu
            declaración de renta y trámites directamente relacionados con ella, no para nada más.</li>
          <li>Puedes actualizarla o pedir que se borre cuando quieras, sin dar explicaciones,
            escribiendo al contacto del punto 8.</li>
        </ul>
        <p>
          Te recomendamos cambiar tu clave de la DIAN una vez termine el proceso de tu declaración,
          sobre todo si la compartiste por este medio. El detalle de cómo se protege está en la{' '}
          <a href="/privacidad">política de tratamiento de datos</a>.
        </p>

        <h3>5. Los documentos siguen siendo tuyos</h3>
        <p>
          Los documentos que subes son tuyos; el portal solo los guarda para poder trabajar tu
          declaración. El diseño, el nombre y el software del portal son de tu contadora, y usarlo
          no te da ningún derecho sobre ellos.
        </p>

        <h3>6. Si el portal falla</h3>
        <p>
          A veces puede haber caídas breves por mantenimiento o fallas fuera de nuestro control. Si
          no logras subir algo a tiempo por eso, escríbele directamente a tu contadora para no
          perder tu plazo ante la DIAN — el portal no reemplaza esa comunicación directa.
        </p>

        <h3>7. Si algo cambia</h3>
        <p>
          Si estos términos cambian de forma importante para ti, actualizamos la fecha arriba y te
          avisamos por correo.
        </p>

        <h3>8. Contacto</h3>
        <p>
          Cualquier duda sobre estos términos: <strong>Daniela Molina Foronda</strong> ·
          311 780 9709 · daniforo1@gmail.com.
        </p>
      </div>
    </CascaronLegal>
  );
}

export function Privacidad() {
  return (
    <CascaronLegal titulo="Política de tratamiento de datos">
      <div className="tarjeta legal-tarjeta">
        <h2>Política de tratamiento de datos personales</h2>
        <p className="tenue">
          Versión 3 · Última actualización: 16 de agosto de 2026 · Conforme a la Ley 1581 de 2012
          de protección de datos personales (Colombia).
        </p>

        <p>
          <strong>Responsable de tus datos:</strong> Daniela Molina Foronda, Contadora Pública,
          tarjeta profesional 260769-T. Tel. 311 780 9709 · daniforo1@gmail.com.
        </p>

        <h3>1. Qué información pedimos</h3>
        <ul>
          <li>Tus datos de contacto: nombre, cédula, correo electrónico y celular.</li>
          <li>Los documentos que subes para tu declaración: certificados, extractos, información
            exógena y demás soportes que tú decidas cargar.</li>
          <li>Si quieres, tu clave de ingreso a www.dian.gov.co.</li>
        </ul>
        <p>
          No te pedimos información de salud, religión, orientación sexual ni otros datos
          "sensibles". Si alguno de tus documentos llegara a mencionar algo así por su propia
          naturaleza (por ejemplo, un certificado de incapacidad), lo tratamos con la misma
          reserva que el resto de tu información y solo para tu declaración.
        </p>

        <h3>2. Para qué la usamos</h3>
        <p>
          Únicamente para preparar y presentar tu declaración de renta: revisar tus documentos,
          calcular tu impuesto, avisarte del estado de cada documento y de tu fecha límite, y
          entregarte tu declaración presentada, el anexo y el recibo de pago.
        </p>

        <h3>3. Tu correo: para qué sí y para qué no</h3>
        <p>
          Tu correo electrónico se usa <strong>exclusivamente</strong> para enviarte avisos de tu
          contadora relacionados con tu declaración: el enlace de tu portal, cuándo un documento
          fue aprobado o necesita corrección, recordatorios de tu fecha límite ante la DIAN, y la
          entrega de tu declaración presentada, tu anexo y tu recibo de pago.
        </p>
        <p>
          <strong>No lo usamos para publicidad ni boletines</strong>, no se lo damos a otras
          empresas para que te contacten, y nadie fuera de la plataforma y tu contadora lo usa
          para escribirte. Nunca vas a recibir por este correo algo que no venga de Daniela o de
          avisos automáticos del propio portal.
        </p>

        <h3>4. Dónde queda guardada tu información</h3>
        <p>
          Todo lo que envías al portal viaja protegido (conexión segura, la misma que usan los
          bancos y las páginas de pagos en línea) y se guarda en un servidor privado, sin acceso
          público:
        </p>
        <ul>
          <li>Los documentos que subes se guardan en una carpeta privada que <strong>no tiene
            dirección pública</strong>: nadie puede entrar a verlos escribiendo una URL. Solo salen
            a través del panel de tu contadora, que tiene su propia clave de acceso.</li>
          <li>Tu clave de la DIAN, si la dejas, se guarda <strong>cifrada</strong> — es decir,
            convertida en un código ilegible que ni siquiera alguien con acceso directo al
            servidor podría leer. El portal nunca la vuelve a mostrar en pantalla; solo tu
            contadora puede verla, desde su panel con clave propia, y solo para presentar tu
            declaración.</li>
          <li>Los formularios abiertos al público (como pedir que te reenvíen tu enlace) están
            protegidos contra robots automatizados y contra intentos repetidos de adivinar datos.</li>
        </ul>
        <p>
          Nadie fuera de Daniela y la persona que le da soporte técnico a la plataforma tiene
          acceso a tu información. No se comparte con bancos, aseguradoras, otros clientes ni
          ninguna otra entidad, salvo que una autoridad como la DIAN lo exija por ley.
        </p>
        <p className="tenue">
          Para operar el portal usamos un par de proveedores externos de confianza (quien nos da el
          hosting y quien nos ayuda a enviar los correos); solo procesan lo mínimo necesario para
          que la plataforma funcione y no pueden usar tu información para nada distinto a eso.
        </p>

        <h3>5. Cuánto tiempo se guarda</h3>
        <p>
          Tus documentos y tu clave de la DIAN se guardan mientras dure tu relación con tu
          contadora y el tiempo razonable después en que la DIAN pueda pedir soportes de tu
          declaración. Puedes pedir que se borren antes, cuando quieras (ver el punto 6).
        </p>

        <h3>6. Tus derechos</h3>
        <p>Como dueño de tus datos, en cualquier momento puedes:</p>
        <ul>
          <li>Conocer, actualizar y corregir tus datos de contacto (el botón de lápiz junto a tu
            nombre en el portal es para eso).</li>
          <li>Pedir que se actualice o se borre tu clave de la DIAN.</li>
          <li>Pedir que se borren los documentos que subiste, una vez ya no sean necesarios para tu
            declaración.</li>
          <li>Preguntar qué información tuya tenemos guardada.</li>
          <li>Retirar tu autorización para que sigamos tratando tus datos.</li>
          <li>Poner una queja ante la Superintendencia de Industria y Comercio si sientes que no
            estamos cuidando bien tu información.</li>
        </ul>
        <p>
          Para cualquiera de estos puntos, escríbenos a <strong>daniforo1@gmail.com</strong> o al
          311 780 9709, con tu nombre y cédula. Te respondemos en máximo 10 días hábiles si es una
          simple consulta, o 15 días hábiles si es una solicitud de corrección o borrado.
        </p>

        <h3>7. Si esta política cambia</h3>
        <p>
          Si cambiamos algo importante en cómo tratamos tu información, actualizamos la fecha
          arriba y te avisamos por correo antes de que aplique.
        </p>
      </div>
    </CascaronLegal>
  );
}
