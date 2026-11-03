# Investigación de integraciones nativas

Fecha: 2026-11-02. Alcance: los ~75 programas del directorio (`frontend/src/data/integrations.ts`).

## Cómo leer esto (límites de la investigación)

- **No pude abrir las páginas oficiales de documentación.** El entorno de la sesión bloquea (403) los dominios de los proveedores. Todo sale de **resúmenes de búsqueda web**: documentación oficial cuando aparecía en los resultados, y muchas veces reseñas de terceros.
- Varios terceros (Supergood, usecarly, Rollout) **venden APIs no oficiales** o integraciones, así que tienen interés comercial. Los marco como "terceros".
- Por eso cada fila lleva **confianza**: `alta` = lo afirma documentación oficial del proveedor; `media` = un solo tercero o fuentes en conflicto; `baja` = no encontré nada fiable.
- **Antes de construir cada integración hay que confirmar en la documentación oficial** el nombre exacto del evento de cancelación y el endpoint de reserva.
- **No recomiendo las APIs no oficiales** (ingeniería inversa de sesiones web): suelen violar los términos del proveedor, se rompen sin aviso y ponen en riesgo las cuentas de tus clientes.

## Qué significa "completo como Square"

1. **Detectar** la cancelación (webhook, o consultas periódicas si no hay webhook).
2. **Leer** clientes e historial (para elegir a quién invitar).
3. **Reservar** el hueco en el sistema del cliente.
4. Funcionar con **muchas cuentas** a la vez.

## Tres modelos de credenciales (esto decide qué va en el `.env`)

| Modelo | Quién tramita | Dónde vive la credencial |
|---|---|---|
| **OAuth app** | Gaplets registra una app una sola vez | `.env` del backend (client id / secret) |
| **API key por cliente** | Cada negocio genera su clave en su cuenta | Se pega en el dashboard de Gaplets (hay que cifrarla en la base de datos) |
| **Acuerdo de partner** | Gaplets solicita acceso al proveedor | `.env` tras la aprobación, a veces con contrato y coste |

## Estado de implementación (actualizado)

Implementadas como **Beta**: construidas desde los resúmenes de documentación y probadas con respuestas simuladas, **no verificadas con cuentas reales**.

| Programa | Auth | Detección | Clientes | Reserva en el sistema del cliente |
|---|---|---|---|---|
| Microsoft Outlook (Graph) | OAuth | consulta de `calendarView` cada ~2 min | importación CSV | **sí** (`POST /me/events`) |
| Calendly | OAuth | `scheduled_events` activos | CSV | no (endpoint no confirmado) |
| Cliniko | API key del cliente | `individual_appointments` | **sincroniza pacientes** | no (faltan ids de profesional/tipo) |
| Clio | OAuth | `calendar_entries` | CSV | no |
| Cal.com | API key del cliente | `bookings` | CSV | no |

"Sin reserva" significa que, cuando un cliente acepta, se le confirma, se avisa al dueño por email y se llama al callback firmado para que la reserva se registre en el sistema real. No se le rechaza al cliente.

La detección usa **consulta periódica y comparación**, no webhooks, a propósito: los nombres exactos de los eventos de webhook no pude confirmarlos y esta vía no depende de ellos.

### Implementadas sin verificar (apagadas por defecto)

Jobber, Open Dental y Zoho Bookings se escribieron **de memoria**, sin documentación ni cuenta. Solo se ofrecen con `ENABLE_UNVERIFIED_PROVIDERS=true`. Cada supuesto está marcado `UNVERIFIED:` en su archivo (`backend/src/connectors/providers/`) como lista de comprobación. Si un supuesto es falso, el efecto es un error visible al conectar o sincronizar, nunca avisos falsos a clientes: una respuesta con forma inesperada se trata como error, no como "sin citas".

| Programa | Auth | Qué hay que comprobar con una cuenta real |
|---|---|---|
| Jobber | OAuth | URLs de OAuth, versión de GraphQL aceptada, consulta `visits` y su filtro, valores de `visitStatus` |
| Open Dental | clave del consultorio + clave de desarrollador de Gaplets | cabecera `ODFHIR`, campos de `/appointments`, estados, `Email` del paciente, duración por `Pattern`, zona horaria |
| Zoho Bookings | OAuth | URLs y scopes, `api_domain`, formato de fecha, forma de la respuesta de `fetchappointment`, estados |

### Wodify, PushPress, Pabau, Shopmonkey y Workiz (documentación aportada por el dueño; apagadas por defecto)

Hechas a partir de la documentación oficial que leyó el dueño en el navegador. Ninguna se ha ejecutado contra una cuenta real, así que siguen `unverified`. Cada supuesto está marcado `UNVERIFIED:` en el encabezado de su archivo.

| Programa | Cómo detecta | Lo que hay que comprobar con una cuenta real |
|---|---|---|
| Wodify | consulta `appointments/bookings/clients/search` | que `utc_appointment_start_datetime` sea filtrable; valores de `booking_status`; **no hay email de cliente**, así que quien canceló no se excluye de las invitaciones |
| PushPress | **webhook** (no existe endpoint de listar citas) | forma del payload, **verificación de firma pendiente** (solo autentica el token secreto de la URL), duración (se asume 60 min), unidad de `startTimestamp`, sin email de cliente |
| Pabau | consulta `GET /appointments` (la clave va en la ruta) | que excluya las canceladas, valores de `appointment_status`, horas locales (exige zona horaria) |
| Shopmonkey | `POST /appointment/search` (revisa siempre `success`) | cómo se marca una cancelación (borrado o `cancellationNote`), formato de fecha, forma de `customer.emails`, ids de citas recurrentes |
| Workiz | `GET /job/all/` con `only_open=false` (la clave va en la ruta) | **si devuelve trabajos futuros** (`start_date` solo filtra hacia atrás: si no los devuelve, esta integración no verá nada), forma de `data`, zona horaria del trabajo |

Ninguna reserva en el sistema del cliente: el dueño recibe un email y un callback firmado para anotarla.



El resto de los grupos A y B **no se implementó**: sin la documentación oficial tendría que inventar los endpoints.

## Veredicto por programa

Leyenda de veredicto: **A** = construir ya, acceso razonable. **B** = construible, requiere trámite o plan de pago del cliente. **C** = no hay API abierta; solo ICS / webhook / Zapier.
Detección: `WH` webhook, `POLL` consulta periódica, `—` no confirmada. Reserva: ✔ confirmada, ? no confirmada, ✘ no.

### Agenda general

| Programa | Modelo | Detección | Reserva | Veredicto | Confianza | Notas |
|---|---|---|---|---|---|---|
| Square Appointments | OAuth app | WH | ✔ | **hecho** | alta | Ya en producción. |
| Google Calendar | OAuth app | POLL (hecho) | ✔ (crea evento) | **hecho, falta probar con credenciales reales** | alta | Scope `calendar` es sensible: Google puede exigir verificación de la app (a confirmar). |
| Microsoft Outlook (Graph) | OAuth app (Azure) | WH (suscripciones que caducan: fuentes dicen ~3 a 7 días, hay que renovarlas) | ✔ (`/events`) | **A** | media | Permiso `Calendars.ReadWrite`. Conflicto entre fuentes sobre la duración de la suscripción. |
| Calendly | OAuth app o token personal | WH `invitee.canceled` | ? (no confirmé el endpoint de crear invitee) | **A** (detección) | alta en webhooks, baja en reserva | Tokens caducan en 2 h. Plan de pago del cliente probablemente requerido (a confirmar). |
| Acuity Scheduling | OAuth app (registro en `acuityscheduling.com/oauth2/register`) | WH dinámico `appointment.canceled` | ? (existe `POST /appointments`) | **B** | media | Scope único `api-v1` (acceso total). **No confirmado** que el webhook acepte token OAuth; la firma se verifica con la API key. Tu código actual usa una key global y solo sirve para 1 cuenta. |
| Cal.com | OAuth/API key | WH `BOOKING_CANCELLED` | ? | **A** | media | Firma `x-cal-signature-256`. La reserva por API no se confirmó en los resultados. |
| Microsoft Bookings | OAuth app (Graph) | — (sin webhook confirmado) | ✔ crear/cancelar | **B** | media | Solo "shared bookings". Usar v1.0, no beta. |
| Zoho Bookings | OAuth app | POLL (estado CANCEL) | ? | **A** | media | Conectores de terceros usan polling. |
| Setmore | OAuth + solicitud por email a api@setmore.com, plan Pro | POLL (sin webhooks, según un tercero) | ? | **B** | media | Documentación en Apiary, acceso manual. |
| SimplyBook.me | API key personal | WH básico (solo `booking_id`, hay que pedir los detalles por API) | ✔ (`cancelBooking`; crear no confirmado) | **B** | media | Foros indican webhooks con comportamiento irregular. |
| YouCanBook.me | API key | WH vía configuración por página; API incierta | ? | **B** | baja | Sin documentación oficial encontrada. |
| Apple Calendar (iCloud) | Contraseña de aplicación por usuario | POLL vía CalDAV | ✔ (CalDAV) | **C/B** | media | No hay API REST ni OAuth. Solo CalDAV con contraseñas específicas de app. El ICS público ya funciona hoy. |
| Squarespace Scheduling | = Acuity | | | ver Acuity | media | Es Acuity con otra marca. |
| Square Online Booking | = Square | | | ver Square | alta | |
| Zapier / Make | — | WH (ya hecho) | — | **hecho** | alta | Vía webhook de entrada y callback. |

### Belleza y bienestar (el sector que más te importa)

| Programa | Modelo | Detección | Reserva | Veredicto | Confianza | Notas |
|---|---|---|---|---|---|---|
| **Fresha** | — | — | ✘ | **C** | media | Sin API pública, sin webhooks, sin partner abierto. Solo un conector de datos de solo lectura de pago. |
| **Vagaro** | Solicitud por cuenta (Settings → Developers), ~5-7 días | WH (citas) | ✔ (citas, clientes) | **B** | media | Exige Vagaro Credit Card Processing y plan de pago; webhooks con coste (~10 USD/mes según un tercero). |
| **Booksy** | Acuerdo de partner (API alpha, claves RSA → JWT) | WH (citas) | ? | **B** | media | Solo para partners; documentación no pública. |
| **Mangomint** | Add-on de webhooks (planes Standard/Unlimited) configurado por su soporte | WH (citas creadas/actualizadas/canceladas) | ✘ | **B** (solo detección) | media | No encontré documentación de desarrollador. |
| **Boulevard** | Admin API GraphQL; acceso por sandbox, posible Enterprise | WH (cancelación no confirmada; Zapier tiene un trigger instantáneo de cancelación) | ? | **B** | media | Documentación en developers.joinblvd.com (no pude abrirla). |
| **Zenoti** | API key generada por el cliente en su backoffice | WH desigual, muchos flujos con POLL | ✔ (`create_appointment`, según un tercero) | **B** | media | Documentación oficial en docs.zenoti.com. |
| **GlossGenius** | — | — | ✘ | **C** | media | Sin API, sin Zapier, sin webhooks. Solo exportar CSV a mano. |
| **StyleSeat** | — | — | ✘ | **C** | media | Sin API. Solo exportar clientes en CSV. |
| **Schedulicity** | ? | ? | ? | **C (sin verificar)** | baja | No encontré documentación oficial. |
| **Phorest** | Acceso por solicitud (api-requests@phorest.com), Basic auth | POLL (**sin webhooks**, oficial) | ? | **B** | alta en polling | Puede cobrar cargos a integradores. Documentación en developer.phorest.com. |
| **Treatwell Connect** | Acuerdo específico de partner | — | — | **C** | media | Sin documentación pública. Se integra por reenvío de email o enlace ICS. |
| **Timely** | Token de cuenta que genera el admin | ? | ? | **C (sin verificar)** | baja | Fuentes contradictorias. |
| **Meevo** (Millennium) | Solicitud de Public API (respuesta en 1-3 días) | WH (añadidos en 2026, según un tercero) + Daily Data Stream | ? | **B** | media | API en docs.meevoapi.com (no pude abrirla). |
| **MassageBook** | ? | ? | ? | **C (sin verificar)** | baja | No encontré documentación pública. |
| **PocketSuite** | OAuth, **solo a través de Zapier** | Zapier | ? | **C** | media | La API documentada es la de su integración con Zapier. |
| **Pabau** | API key del cliente (Setup → Developer) | WH (crear/actualizar/borrar citas, clientes) | ? | **A** | alta en webhooks | Webhooks incluidos; Zapier puede requerir upgrade. |
| **Aesthetic Record** | — | — | — | **C (no investigado)** | — | No lo busqué. |

### Salud y clínicas

| Programa | Modelo | Detección | Reserva | Veredicto | Confianza | Notas |
|---|---|---|---|---|---|---|
| **Jane App** | Partner aprobado (OAuth con PKCE) | WH (fuentes en conflicto) | ✔ (citas) | **B** | media | Programa de integraciones con revisión; cada clínica tiene su propio dominio de API. |
| **SimplePractice** | — | — | ✘ | **C** | media | Sin API pública. Solo API enterprise para aseguradoras. |
| **Cliniko** | API key por usuario (Basic auth) | POLL (sin webhooks nativos) | ? | **A** | media | Docs en docs.api.cliniko.com. La clave hereda los permisos del usuario. |
| **Healthie** | API GraphQL, aprobación + sandbox | WH `appointment.deleted` (una cancelación desde la UI puede no dispararlo) | ? | **B** | media | Webhooks con firma; probar en sandbox. |
| **Tebra (Kareo)** | Clave de cliente + usuario | POLL (sin webhooks) | ✔ (insertar/actualizar/eliminar cita) | **B** | media | Web Services API 2.1 (feb 2025). |
| **Open Dental** | Developer key + customer key por consultorio | POLL | ✔ | **A** | media | La más abierta del sector dental. |
| **Dentrix / Dentrix Ascend** | Acuerdo (Henry Schein One API Exchange) | ? | ? | **B (difícil)** | media | Proceso largo, coste de kit y cuota por cliente (relato anecdótico). |
| **Eaglesoft** | Programa de partners de Patterson | ? | ? | **B (difícil)** | baja | Acceso restringido. |
| **Nextech** | OAuth con credenciales que entrega un representante | ? | ? | **B** | media | |
| **Practice Better** | ? | ? | ? | **C (sin verificar)** | baja | Solo guías de terceros. |
| **Zocdoc** | Partner (API OAuth2 con sandbox) | ? | ✔ (ciclo completo de reservas) | **B** | media | Producción exige programa de partner y un proveedor cliente real. |
| **TheraNest (Ensora)** | — | — | ✘ | **C** | media | Sin API pública. |

### Fitness

| Programa | Modelo | Detección | Reserva | Veredicto | Confianza | Notas |
|---|---|---|---|---|---|---|
| **Mindbody** | OAuth (hay que contactar a soporte de API) + API key de webhooks distinta | WH (nombres de evento exactos sin confirmar) | ? | **B** | media | API v6. Conectores de terceros ofrecen "cancelled appointment/class booking". |
| **Glofox** | Credenciales por solicitud; webhooks por solicitud aparte | WH (dominio BOOKINGS, firma HMAC) | ✔ (según un tercero) | **B** | alta en webhooks | Docs oficiales en gf-dev-docs.glofox.com. |
| **Wodify** | API key (admin) | WH sin verificar | ✔ (reservas y citas) | **A** | media | Base `api.wodify.com/v1`, cabecera `x-api-key`. |
| **PushPress** | API key | WH (según un espejo del SDK) | ? | **A** | baja | Confirmar eventos. |
| **Trainerize** | Planes Studio/Enterprise | WH (según terceros) | ? | **B** | media | Documentación tras login. |
| **TeamUp** | API key | WH (fuentes en conflicto) | ? | **B** | media | Guía oficial de webhooks en docs.goteamup.com. |
| **Zen Planner** | Partner (portal Daxko, por un representante) | WH firmados | ? | **B** | media | |
| **Momence** | El estudio crea su cliente API | WH experimentales (los activa soporte) | ✔ (bookings) | **B** | media | Tokens caducan en horas. |
| **TrueCoach** | — | — | ✘ | **C** | media | Solo Zapier en plan Pro. |

### Mascotas y veterinarias

| Programa | Modelo | Detección | Reserva | Veredicto | Confianza | Notas |
|---|---|---|---|---|---|---|
| **MoeGo** | Open API, solicitud (parece Enterprise) | WH (`APPOINTMENT_*`) | ✔ (crear, reprogramar, cancelar) | **B** | media-alta | Documentación en moegolibrary.github.io. |
| **Gingr** | API key por usuario | WH (documentados) | ? (la API oficial dice solo lectura) | **B (solo detección)** | media | Hay que contratar a un desarrollador, soporte no ayuda. |
| **DaySmart Pet** | ? | ? | ? | **C (sin verificar)** | baja | Fuentes contradictorias. |
| **PetDesk / Covetrus Pulse** | Integración propia entre ellos | — | — | **C** | baja | Sin API pública encontrada. |

### Auto

| Programa | Modelo | Detección | Reserva | Veredicto | Confianza | Notas |
|---|---|---|---|---|---|---|
| **Shopmonkey** | API key por taller | WH (en la UI) | ✔ (agendar/cancelar citas) | **A** | media | API v3, docs en shopmonkey.dev. |
| **Tekmetric** | Partner con aprobación (2-3 semanas), OAuth client credentials | WH (incluye citas) | ? | **B** | media | |
| **Shop-Ware** | Programa de partners tecnológicos; cada taller lo habilita | ? | ? | **B** | media | También disponible por Zapier. |

### Servicios del hogar

| Programa | Modelo | Detección | Reserva | Veredicto | Confianza | Notas |
|---|---|---|---|---|---|---|
| **Jobber** | OAuth app (Developer Center) | WH (tópico de visita cancelada sin confirmar) | ? | **A** | media | GraphQL. Entrega "al menos una vez": hay que deduplicar. |
| **Housecall Pro** | API key (admin) | WH (`job canceled`) solo en plan MAX | ? | **B** | media | |
| **ServiceTitan** | App en Developer Portal + acceso por tenant | WH | ? | **B** | media | OAuth client credentials. |
| **Workiz** | API key | WH (trabajos, leads, estimaciones, facturas) | ✔ (crear trabajo) | **A** | media | |
| **Booking Koala** | ? | WH (según Zapier) | ? | **C (sin verificar)** | baja | |
| **ZenMaid** | — | — | ✘ | **C** | alta | La propia empresa dice que no ofrece API pública ni webhooks. |

### Educación y profesional

| Programa | Modelo | Detección | Reserva | Veredicto | Confianza | Notas |
|---|---|---|---|---|---|---|
| **Teachworks** | API key | POLL (sin webhooks) | ✔ (crear clase) | **B** | media | |
| **TutorBird** | — | — | ✘ | **C** | media | Solo calendario ICS/Google. |
| **Opus1.io** | ? | ? | ? | **C (sin verificar)** | — | No encontré información. |
| **Clio** | OAuth app | WH `calendar_entry` (caducan, hay que renovar) | ? | **A** | alta | Docs oficiales en docs.developers.clio.com. |
| **HoneyBook / Dubsado** | — | — | ✘ | **C** | media | Solo Zapier. |
| **HubSpot Meetings** | OAuth / app privada | — | ✔ (`POST /scheduler/v3/meetings/calendar`, legado) | **C** | media | No encontré un webhook de cancelación. |

### Restaurantes, tours y eventos

| Programa | Modelo | Detección | Reserva | Veredicto | Confianza | Notas |
|---|---|---|---|---|---|---|
| **OpenTable** | Acuerdo de partner formal | ? | ✔ | **B (difícil)** | media | Fuentes en conflicto sobre apertura. |
| **Resy** | — | — | ✘ | **C** | media | Sin portal, sin webhooks. Una fuente reporta cuentas desactivadas por consultas frecuentes. |
| **Tock** | Plan Premium | — | ✘ | **C** | media | API de solo lectura. |
| **FareHarbor** | Acuerdo de partner (sin registro público) | WH (reservas creadas/actualizadas/canceladas, URL de test y producción) | ? | **B** | media | Algunos webhooks los activa el soporte. |
| **Bookeo / Rezdy** | ? | ? | ? | **C (no verificado)** | — | Mi búsqueda no devolvió nada. |

## Resumen

- **A (construir ya, acceso razonable):** Microsoft Outlook, Calendly, Cal.com, Zoho Bookings, Pabau, Cliniko, Open Dental, Wodify, PushPress, Shopmonkey, Jobber, Workiz, Clio.
- **B (construible con trámite, plan de pago o acuerdo):** Acuity, Vagaro, Booksy, Mangomint, Boulevard, Zenoti, Meevo, Phorest, Jane, Healthie, Tebra, Dentrix, Eaglesoft, Nextech, Zocdoc, Mindbody, Glofox, Trainerize, TeamUp, Zen Planner, Momence, MoeGo, Gingr, Tekmetric, Shop-Ware, Housecall Pro, ServiceTitan, Teachworks, Setmore, SimplyBook.me, Microsoft Bookings, OpenTable, FareHarbor.
- **C (sin API abierta; solo ICS / webhook / Zapier):** Fresha, GlossGenius, StyleSeat, SimplePractice, TheraNest, TrueCoach, ZenMaid, HoneyBook, Dubsado, Resy, Tock, Treatwell, PocketSuite, TutorBird, HubSpot Meetings, Apple Calendar (salvo CalDAV).
- **Sin verificar (no pude confirmar nada fiable):** Schedulicity, Timely, MassageBook, Practice Better, DaySmart Pet, PetDesk/Covetrus, Booking Koala, YouCanBook.me, Opus1, Bookeo, Rezdy, Aesthetic Record.

**Dato clave para tu mercado:** las plataformas de belleza más grandes (**Fresha, GlossGenius, StyleSeat**) no tienen API abierta. Ahí Gaplets no puede ser nativo; el camino es el calendario por enlace o la exportación de clientes. Las de belleza que sí se pueden integrar son Vagaro, Boulevard, Zenoti, Meevo, Phorest, Mangomint y Pabau, cada una con su trámite.

## Variables `.env` (credenciales de Gaplets, no las de cada cliente)

### Ya existentes
```
SQUARE_CLIENT_ID=
SQUARE_CLIENT_SECRET=
WEBHOOK_SQUARE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
ACUITY_CLIENT_ID=
ACUITY_CLIENT_SECRET=
API_BASE_URL=            # URL pública del backend
FRONTEND_ORIGIN=         # URL pública del frontend
JWT_ACCESS_SECRET=       # también firma los callbacks y el state de OAuth
```
`ACUITY_USER_ID` y `ACUITY_API_KEY` solo sirven para una cuenta; hay que reemplazarlos por el flujo OAuth por cuenta.

### Nuevas, por modelo OAuth app (se obtienen registrando una app)
```
MICROSOFT_CLIENT_ID=         # Azure portal → App registrations
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT=common
CALENDLY_CLIENT_ID=          # Calendly → Integrations → API & Webhooks
CALENDLY_CLIENT_SECRET=
CALENDLY_WEBHOOK_SIGNING_KEY=
CAL_COM_CLIENT_ID=           # o claves por usuario
CAL_COM_CLIENT_SECRET=
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
JOBBER_CLIENT_ID=            # Jobber Developer Center
JOBBER_CLIENT_SECRET=
CLIO_CLIENT_ID=
CLIO_CLIENT_SECRET=
MINDBODY_API_KEY=            # + cliente OAuth tras contactar a soporte de API
MINDBODY_WEBHOOK_API_KEY=
SERVICETITAN_CLIENT_ID=      # Developer Portal
SERVICETITAN_CLIENT_SECRET=
SERVICETITAN_APP_KEY=
```

### Por acuerdo de partner (solo tras ser aprobados)
```
VAGARO_CLIENT_ID= / VAGARO_CLIENT_SECRET=
BOOKSY_PRIVATE_KEY= / BOOKSY_KEY_ID=
JANE_CLIENT_ID= / JANE_CLIENT_SECRET=
ZOCDOC_CLIENT_ID= / ZOCDOC_CLIENT_SECRET=
MEEVO_CLIENT_ID= / MEEVO_CLIENT_SECRET=
OPEN_DENTAL_DEVELOPER_KEY=
GLOFOX_* , MOEGO_* , TEKMETRIC_*, FAREHARBOR_APP_KEY, ZENPLANNER_*  (según lo que entregue cada proveedor)
```

### Para guardar las claves de cada cliente (Cliniko, Pabau, Shopmonkey, Wodify, Workiz, Housecall Pro, Zenoti…)
No hay nada que registrar con el proveedor, pero necesitas:
```
INTEGRATION_ENCRYPTION_KEY=  # 32 bytes en base64, para cifrar las claves en la base de datos
```
**Aviso de seguridad:** hoy los tokens OAuth de `ConnectedIntegration.accessToken` y `refreshToken` se guardan **en texto plano** en la base de datos. Antes de guardar claves de más proveedores conviene cifrarlos.
