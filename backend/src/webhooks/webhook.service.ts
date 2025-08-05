import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as sgMail from '@sendgrid/mail';
import { PrismaManagerService } from '../prisma-manager/prisma-manager.service';
const twilio = require('twilio');

interface Recipient {
  name: string;
  email?: string;
  phone?: string;
  customerId?: string;
  lastAppt?: Date | null;
  nextAppt?: Date | null;
}

interface CampaignState {
  campaignId: string;
  userId: string;
  provider: 'acuity' | 'square';
  slotTime: Date;
  appointmentTypeId?: number | null;
  serviceVariationId?: string | null;
  serviceVariationVersion?: number | null;
  teamMemberId?: string | null;
  locationId?: string | null;
  duration?: number | null;
  filled: boolean;
  originalCustomerEmail?: string | null;
  originalCustomerId?: string | null;
  recipients: Recipient[];
  gapletSlotId?: string | null;
  scheduledTimeouts: NodeJS.Timeout[];  // NEW
}

@Injectable()
export class NotificationService {
  private activeCampaigns = new Map<string, CampaignState>();
  private emailToCampaign = new Map<string, string>();
  private phoneToCampaign = new Map<string, string>();
  private twilioClient: any;

  private formatSenderEmail(businessName: string): string {
    return businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')   // reemplaza símbolos por guiones
      .replace(/-+/g, '-')          // colapsa guiones múltiples
      .replace(/^-|-$/g, '')        // elimina guiones extremos
      .slice(0, 30);                // máximo 30 caracteres
  }

  private buildReplyTo(campaignId: string): string {
    // Usar dirección con identificador único para respuestas (se asume parseo en inbound con "reply+")
    return `${campaignId}@${process.env.SENDGRID_REPLY_DOMAIN || 'gaplets.com'}`;
  }

  private buildFrom(businessName: string) {
    const email = `${this.formatSenderEmail(businessName)}@gaplets.com`;
    return {
      email,
      name: businessName,
    };
  }


  constructor(private readonly prisma: PrismaManagerService) {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
    this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }

 async startCampaign(provider: 'acuity' | 'square', integration: any, payload: any, gapletSlotId?: string) {
  const userId: string = integration.userId;

  // Cargar usuario y preferencias
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: { preferences: true },
  });
  if (!user) {
    console.error(`Usuario ${userId} no encontrado para campaña de notificación.`);
    return;
  }
  const preferences = user.preferences;
  const plan: string = user.role || '';

  // Límite de reemplazos según plan
  const replacementLimit =
    plan === 'STARTER' ? 20 :
    plan === 'PRO'     ? 50 :
    plan === 'PREMIUM' ? 100 :
    Infinity;
  if ((user.totalReplacements ?? 0) >= replacementLimit) {
    console.log(
      `Usuario ${userId} ha alcanzado el límite de reemplazos (${user.totalReplacements}/${replacementLimit}), no se enviará nada más.`
    );
    return;
  }

  const matchType = !!preferences?.matchAppointmentType;
  const notifyAfter = preferences?.notifyAfterMinutes ?? 0;
  const notifyBefore = preferences?.notifyBeforeMinutes ?? 0;
  // maxNotifications eliminado para incluir todos los destinatarios elegibles

  // Detalles del hueco de cita cancelada
  let slotTime: Date;
  let appointmentTypeId: number | null = null;
  let canceledCustomerEmail: string | null = null;
  let canceledCustomerId: string | null = null;
  // Detalles específicos de Square
  let serviceVariationId: string | null = null;
  let serviceVariationVersion: number | null = null;
  let teamMemberId: string | null = null;
  let locationId: string | null = null;
  let duration: number | null = null;

  if (provider === 'acuity') {
    slotTime = new Date(payload.datetime);
    appointmentTypeId = payload.appointmentTypeID ? Number(payload.appointmentTypeID) : null;
    canceledCustomerEmail = payload.email || null;
  } else {
    // Lógica Square (igual que antes)...
    let booking: any;
    if (payload.booking) {
      booking = payload.booking;
    } else if (payload.bookingId) {
      const rawBookingId: string = payload.bookingId;
      const baseBookingId: string = rawBookingId.split(':')[0];
      const bookingUrl = `https://connect.squareup.com/v2/bookings/${baseBookingId}`;
      const bookingRes = await fetch(bookingUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${integration.accessToken}` },
      });
      const bookingData = await bookingRes.json();
      if (!bookingData.booking) {
        console.error('No se pudieron obtener detalles de la reserva de Square:', bookingData);
        return;
      }
      booking = bookingData.booking;
    } else {
      console.error('No se proporcionó información de la reserva para Square.');
      return;
    }
    slotTime = new Date(booking.start_at);
    locationId = booking.location_id;
    canceledCustomerId = booking.customer_id || null;
    if (booking.appointment_segments?.length) {
      const segment = booking.appointment_segments[0];
      serviceVariationId = segment.service_variation_id || null;
      serviceVariationVersion = segment.service_variation_version || null;
      teamMemberId = segment.team_member_id || null;
      duration = segment.duration_minutes || null;
      // Obtener versión si falta...
      if (serviceVariationId && serviceVariationVersion == null) {
        try {
          const catalogRes = await fetch(
            `https://connect.squareup.com/v2/catalog/object/${serviceVariationId}`,
            { headers: { Authorization: `Bearer ${integration.accessToken}` } }
          );
          const catalogObj = await catalogRes.json();
          if (catalogObj.object) {
            serviceVariationVersion = catalogObj.object.version;
          }
        } catch {}
      }
    }
  }

  const now = new Date();
  const msUntilSlot = slotTime.getTime() - now.getTime();
  const minWindow = 2 * 60 * 60 * 1000;        // 2 horas en ms
  const maxWindow = 3 * 24 * 60 * 60 * 1000;   // 3 días en ms
  if (msUntilSlot < minWindow || msUntilSlot > maxWindow) {
    console.log(
      `Cancelación fuera de rango para notificación: faltan ${Math.round(msUntilSlot/1000/60)} minutos`
    );
    return;
  }

  // Obtener todos los clientes y su historial de citas del proveedor
  const clients: Recipient[] = [];
  const lastApptMap: Map<string, Date> = new Map();
  const nextApptMap: Map<string, Date> = new Map();
  const clientServiceTypes: Map<string, Set<string | number>> = new Map();

  // … lógica de fetch de Acuity y Square para llenar clients, lastApptMap, nextApptMap, clientServiceTypes
  if (provider === 'acuity') {
    // 1) Obtener lista de clientes de Acuity
    const clientsRes = await fetch('https://acuityscheduling.com/api/v1/clients', {
      headers: { Authorization: `Bearer ${integration.accessToken}` },
    });
    const acuityClients = await clientsRes.json();
    for (const c of acuityClients) {
      const clientId = c.id ? String(c.id) : (c.email || '');
      clients.push({
        name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Client',
        email: c.email || undefined,
        phone: c.phone || undefined,
        customerId: clientId,
      });
    }

    // 2) Historial de citas pasadas
    const nowISO = new Date().toISOString();
    const pastRes = await fetch(
      `https://acuityscheduling.com/api/v1/appointments?maxDate=${encodeURIComponent(nowISO)}`,
      { headers: { Authorization: `Bearer ${integration.accessToken}` } }
    );
    const pastAppointments = await pastRes.json();
    for (const appt of pastAppointments) {
      const clientKey = appt.clientId ? String(appt.clientId) : (appt.email || '');
      const apptDate = new Date(appt.datetime);
      const prevLast = lastApptMap.get(clientKey);
      if (!prevLast || apptDate > prevLast) lastApptMap.set(clientKey, apptDate);
      if (appt.appointmentTypeID) {
        clientServiceTypes
          .get(clientKey)
          ?.add(Number(appt.appointmentTypeID))
          || clientServiceTypes.set(clientKey, new Set([Number(appt.appointmentTypeID)]));
      }
    }

    // 3) Próximas citas futuras
    const futureRes = await fetch(
      `https://acuityscheduling.com/api/v1/appointments?minDate=${encodeURIComponent(nowISO)}`,
      { headers: { Authorization: `Bearer ${integration.accessToken}` } }
    );
    const futureAppointments = await futureRes.json();
    for (const appt of futureAppointments) {
      const clientKey = appt.clientId ? String(appt.clientId) : (appt.email || '');
      const apptDate = new Date(appt.datetime);
      const prevNext = nextApptMap.get(clientKey);
      if (!prevNext || apptDate < prevNext) nextApptMap.set(clientKey, apptDate);
      if (appt.appointmentTypeID) {
        clientServiceTypes
          .get(clientKey)
          ?.add(Number(appt.appointmentTypeID))
          || clientServiceTypes.set(clientKey, new Set([Number(appt.appointmentTypeID)]));
      }
    }

  } else if (provider === 'square') {
    // 1) Obtener lista de clientes de Square
    const customersRes = await fetch('https://connect.squareup.com/v2/customers', {
      headers: { Authorization: `Bearer ${integration.accessToken}` },
    });
    const customersData = await customersRes.json();
    const squareCustomers = customersData.customers || [];
    for (const c of squareCustomers) {
      clients.push({
        name: `${c.given_name || ''} ${c.family_name || ''}`.trim() || 'Client',
        email: c.email_address || undefined,
        phone: c.phone_number || undefined,
        customerId: c.id,
      });
    }

    const nowISO = new Date().toISOString();
    // 2) Historial de bookings pasados
    const pastSearch = await fetch('https://connect.squareup.com/v2/bookings/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: { filter: { start_at_range: { end_at: nowISO } } } }),
    });
    const pastData = await pastSearch.json();
    const pastBookings = pastData.bookings || [];
    for (const book of pastBookings) {
      if (!book.customer_id) continue;
      const start = new Date(book.start_at);
      const prevLast = lastApptMap.get(book.customer_id);
      if (!prevLast || start > prevLast) lastApptMap.set(book.customer_id, start);
      if (book.appointment_segments) {
        for (const seg of book.appointment_segments) {
          if (!clientServiceTypes.has(book.customer_id)) {
            clientServiceTypes.set(book.customer_id, new Set());
          }
          clientServiceTypes.get(book.customer_id)!.add(seg.service_variation_id);
        }
      }
    }

    // 3) Próximas bookings futuras
    const futureSearch = await fetch('https://connect.squareup.com/v2/bookings/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: { filter: { start_at_range: { start_at: nowISO } } } }),
    });
    const futureData = await futureSearch.json();
    const futureBookings = futureData.bookings || [];
    for (const book of futureBookings) {
      if (!book.customer_id) continue;
      const start = new Date(book.start_at);
      const prevNext = nextApptMap.get(book.customer_id);
      if (!prevNext || start < prevNext) nextApptMap.set(book.customer_id, start);
      if (book.appointment_segments) {
        for (const seg of book.appointment_segments) {
          if (!clientServiceTypes.has(book.customer_id)) {
            clientServiceTypes.set(book.customer_id, new Set());
          }
          clientServiceTypes.get(book.customer_id)!.add(seg.service_variation_id);
        }
      }
    }
  }

  // -------------- FILTRADO REFACTORIZADO --------------
  const eligibleRecipients: Recipient[] = clients.filter(client => {
    const idKey = client.customerId
      || client.email?.toLowerCase()
      || client.phone!;

    // Excluir al que canceló
    if (provider === 'acuity'
        && canceledCustomerEmail
        && client.email?.toLowerCase() === canceledCustomerEmail.toLowerCase()) {
      return false;
    }
    if (provider === 'square'
        && canceledCustomerId
        && client.customerId === canceledCustomerId) {
      return false;
    }

    // Filtrar por tipo de cita si corresponde
    if (matchType) {
      const services = clientServiceTypes.get(idKey) ?? new Set();
      const requiredId = provider === 'acuity'
        ? appointmentTypeId
        : serviceVariationId;
      if (requiredId && !services.has(requiredId)) {
        return false;
      }
    }

    // notifyAfter: excluir si próxima cita es antes de este umbral
    const next = nextApptMap.get(idKey);
    if (notifyAfter > 0 && next) {
      const minsUntil = (next.getTime() - now.getTime()) / 60000;
      if (minsUntil < notifyAfter) {
        return false;
      }
    }

    // notifyBefore: excluir si última cita fue más reciente que este umbral
    const last = lastApptMap.get(idKey);
    if (notifyBefore > 0 && last) {
      const minsSince = (now.getTime() - last.getTime()) / 60000;
      if (minsSince < notifyBefore) {
        return false;
      }
    }

    // Validar canal de contacto
    if (!client.email && !client.phone) {
      return false;
    }
    if (plan === 'STARTER' && !client.email) {
      return false;
    }

    client.lastAppt = last || null;
    client.nextAppt = next || null;
    return true;
  });

  if (eligibleRecipients.length === 0) {
    console.log(`No hay clientes elegibles para notificación (usuario ${userId}).`);
    return;
  }

  // ---------- ORDEN Y ENVÍO SIN LÍMITE -----------
  eligibleRecipients.sort((a, b) => {
    const aNext = a.nextAppt?.getTime() ?? Infinity;
    const bNext = b.nextAppt?.getTime() ?? Infinity;
    return aNext - bNext;
  });
  const notifyList = eligibleRecipients; // sin tope maxNotifications

  let emailList: Recipient[] = [];
  let smsList: Recipient[] = [];
  if (plan === 'STARTER') {
    emailList = notifyList.filter(c => c.email);
  } else if (plan === 'PRO' || plan === 'PREMIUM') {
    if (plan === 'PRO') {
      const phaseCap = 20;
      emailList = notifyList.slice(0, phaseCap).filter(c => c.email);
      smsList   = notifyList.slice(phaseCap, phaseCap + 5).filter(c => c.phone);
    } else {
      const phaseCaps = [15, 10];
      // Emails
      let offset = 0;
      for (const cap of phaseCaps) {
        emailList.push(...notifyList.slice(offset, offset + cap).filter(c => c.email));
        offset += cap;
      }
      // SMS
      smsList = notifyList.slice(offset, offset + 5).filter(c => c.phone);
    }
  }

  // Guardar estado de campaña
  const campaignId = gapletSlotId || crypto.randomUUID();
  const campaignState: CampaignState = {
    campaignId,
    userId,
    provider,
    slotTime,
    appointmentTypeId,
    serviceVariationId,
    serviceVariationVersion,
    teamMemberId,
    locationId,
    duration,
    filled: false,
    originalCustomerEmail: canceledCustomerEmail,
    originalCustomerId: canceledCustomerId,
    recipients: notifyList,
    gapletSlotId: gapletSlotId || null,
    scheduledTimeouts: [],
  };
  this.activeCampaigns.set(campaignId, campaignState);

  // Mapear para respuestas entrantes
  notifyList.forEach(rec => {
    if (rec.email) this.emailToCampaign.set(rec.email.toLowerCase(), campaignId);
    if (rec.phone) this.phoneToCampaign.set(rec.phone, campaignId);
  });
  this.emailToCampaign.set(campaignId, campaignId);
  if (gapletSlotId) {
    this.emailToCampaign.set(`reply+${gapletSlotId}`, campaignId);
    this.emailToCampaign.set(gapletSlotId, campaignId);
  }
  // Antes de construir los mensajes, define businessName y locationTimeZone
  let businessName = 'Your Business';      // valor por defecto
  let locationTimeZone = 'UTC';            // valor por defecto

  if (provider === 'square') {
    try {
      // Obtener nombre del negocio de Square
      const merchantsRes = await fetch('https://connect.squareup.com/v2/merchants', {
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
          'Square-Version': '2025-07-16',
        },
      });
      const merchantsData = await merchantsRes.json();
      if (
        merchantsData.merchant &&
        Array.isArray(merchantsData.merchant) &&
        merchantsData.merchant.length > 0
      ) {
        businessName = merchantsData.merchant[0].business_name;
      }

      // Obtener timezone de la ubicación
      if (locationId) {
        const locRes = await fetch(
          `https://connect.squareup.com/v2/locations/${locationId}`,
          {
            headers: {
              Authorization: `Bearer ${integration.accessToken}`,
              'Square-Version': '2025-07-16',
            },
          }
        );
        const locJson = await locRes.json();
        if (locJson.location?.timezone) {
          locationTimeZone = locJson.location.timezone;
        }
      }
    } catch (err) {
      console.warn('No se pudo obtener businessName o timezone de Square, usando valores por defecto:', err);
    }

  } else {
    // Para Acuity, intenta leer el nombre del negocio vía /me
    try {
      const acuityRes = await fetch('https://acuityscheduling.com/api/v1/me', {
        headers: { Authorization: `Bearer ${integration.accessToken}` },
      });
      const acuityData = await acuityRes.json();
      businessName = acuityData.businessName || acuityData.name || businessName;
    } catch (err) {
      console.warn('No se pudo obtener el nombre del negocio de Acuity, usando valor por defecto:', err);
    }
  }

  // ——— Construir asunto y cuerpos de mensaje ———
  const opts: Intl.DateTimeFormatOptions = {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: locationTimeZone
  };
  const slotTimeStr = new Intl.DateTimeFormat('en-US', opts).format(slotTime);

  const emailSubject = `New Appointment Slot Available at ${businessName} – ${slotTimeStr}`;
  const textPlain = `Great news! An appointment slot has just opened up at ${businessName}.\n\n` +
                    `Date & Time: ${slotTimeStr}\n\n` +
                    `To claim this slot, reply with “I will take it”.`;
  const emailBodyTemplate = `
    <!DOCTYPE html>
    <html><body style="font-family:Arial,sans-serif;color:#333;">
      <p><strong>Great news!</strong> An appointment slot has just opened at <strong>${businessName}</strong>:</p>
      <ul>
        <li><strong>Date & Time:</strong> ${slotTimeStr}</li>
        <li><strong>Location:</strong> ${businessName}</li>
      </ul>
      <p>Reply with <em>“I will take it”</em> and we’ll confirm the first response.</p>
      <hr>
      <p style="font-size:12px;color:#999;">
        You’re receiving this because you requested notifications. Reply “STOP” to unsubscribe.
      </p>
    </body></html>
  `.trim();

  const smsText = `${businessName}: New slot on ${slotTimeStr}. Reply “I will take it” to book.`;

  // ——— Envío en “waves” según plan ———
  if (plan === 'STARTER') {
    // Solo email en oleadas de 5 cada 30 min
    const waveSize = 5;
    const waveMinutes = [0, 30, 60, 90];
    waveMinutes.forEach((mins, idx) => {
      const batch = notifyList.slice(idx * waveSize, (idx + 1) * waveSize)
                              .filter(c => !!c.email);
      if (!batch.length) return;
      const t = setTimeout(() => {
        if (!this.isCampaignFilled(campaignId)) {
          this.sendEmailBatch(campaignId, batch, emailSubject, textPlain, emailBodyTemplate, userId, businessName);
        }
      }, mins * 60_000);
      campaignState.scheduledTimeouts.push(t);
    });

  } else if (plan === 'PRO') {
    // Emails y SMS en fases: primeros 100 emails en 2 oleadas, luego hasta 25 SMS
    const emailCaps = [{count: 50, delay: 0}, {count: 50, delay: 30}];
    emailCaps.forEach(({count, delay}, phase) => {
      const batch = notifyList.slice(phase * count, phase * count + count)
                              .filter(c => !!c.email);
      if (!batch.length) return;
      const t = setTimeout(() => {
        if (!this.isCampaignFilled(campaignId)) {
          this.sendEmailBatch(campaignId, batch, emailSubject, textPlain, emailBodyTemplate, userId, businessName);
        }
      }, delay * 60_000);
      campaignState.scheduledTimeouts.push(t);
    });

    // SMS: hasta 25 en una sola oleada 60 min después
    const smsBatch = notifyList.slice(100, 125).filter(c => !!c.phone);
    if (smsBatch.length) {
      const t = setTimeout(() => {
        if (!this.isCampaignFilled(campaignId)) {
          this.sendSmsBatch(campaignId, smsBatch, smsText, userId);
        }
      }, 60 * 60_000);
      campaignState.scheduledTimeouts.push(t);
    }

  } else if (plan === 'PREMIUM') {
    // Emails (2 fases: 80+80) y SMS (2 fases: 20+20)
    const emailCaps = [{count: 80, delay: 0}, {count: 80, delay: 15}];
    emailCaps.forEach(({count, delay}, phase) => {
      const batch = notifyList.slice(phase * count, phase * count + count)
                              .filter(c => !!c.email);
      if (!batch.length) return;
      const t = setTimeout(() => {
        if (!this.isCampaignFilled(campaignId)) {
          this.sendEmailBatch(campaignId, batch, emailSubject, textPlain, emailBodyTemplate, userId, businessName);
        }
      }, delay * 60_000);
      campaignState.scheduledTimeouts.push(t);
    });

    const smsCaps = [{count: 20, delay: 30}, {count: 20, delay: 45}];
    smsCaps.forEach(({count, delay}, phase) => {
      const batch = notifyList.slice(160 + phase * count, 160 + (phase + 1) * count)
                              .filter(c => c.phone);
      if (!batch.length) return;
      const t = setTimeout(() => {
        if (!this.isCampaignFilled(campaignId)) {
          this.sendSmsBatch(campaignId, batch, smsText, userId);
        }
      }, delay * 60_000);
      campaignState.scheduledTimeouts.push(t);
    });
  }

  console.log(`✅ Scheduled waves for campaign ${campaignId}`);

  console.log(
    `🚀 Started notification campaign ${campaignId} for user ${userId}`
  );
}



  
  private async resolveTimeZone(
  provider: 'square' | 'acuity',
  accessToken: string,
  locationId?: string
): Promise<string> {
  let tz = 'UTC';
  try {
    if (provider === 'square' && locationId) {
      const res = await fetch(
        `https://connect.squareup.com/v2/locations/${locationId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Square-Version': '2025-07-16'
          }
        }
      );
      const js = await res.json();
      tz = js.location?.timezone ?? tz;
    } else if (provider === 'acuity') {
      const res = await fetch(
        'https://acuityscheduling.com/api/v1/me',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const js = await res.json();
      tz = js.timezone ?? js.timeZone ?? tz;
    }
  } catch (err) {
    console.warn('Unable to resolve timezone, defaulting to UTC', err);
  }
  return tz;
}

async handleEmailReply(
  fromEmailRaw: string,
  toEmail: string,
  bodyText: string,
) {
  // 1) Parse sender
  let fromEmail = fromEmailRaw.trim();
  let fromName = '';
  const m = fromEmailRaw.match(/^(.+?)\s*<(.+)>$/);
  if (m) {
    fromName = m[1].trim();
    fromEmail = m[2].trim();
  } else {
    fromName = fromEmail.split('@')[0];
  }
  const normalized = fromEmail.toLowerCase();

  // 2) Extract campaignId
  const gapletSlotId = toEmail.split('@')[0].replace(/^reply\+/, '');
  const campaignId =
    this.emailToCampaign.get(gapletSlotId) ||
    this.emailToCampaign.get(normalized);
  if (!campaignId) return;

  // 3) Retrieve and validate campaign
  const campaign = this.activeCampaigns.get(campaignId);
  if (!campaign) return;

  // Cancel pending waves if already filled
  if (campaign.filled && campaign.scheduledTimeouts.length) {
    campaign.scheduledTimeouts.forEach(clearTimeout);
    campaign.scheduledTimeouts = [];
  }

  // 4) Load integration for timezone
  const integ = await this.prisma.connectedIntegration.findFirst({
    where: { userId: campaign.userId, provider: campaign.provider },
  });
  if (!integ) return;
  const slotTimeZone = await this.resolveTimeZone(
    campaign.provider as 'square' | 'acuity',
    integ.accessToken,
    campaign.locationId
  );

  // 5) Format appointment time
  const appointmentTime = new Intl.DateTimeFormat('en-US', {
    month:  'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: slotTimeZone,
  }).format(campaign.slotTime);

  // 6) Determine businessName
  let businessName = 'Your Business';
  try {
    if (campaign.provider === 'square') {
      const res = await fetch('https://connect.squareup.com/v2/merchants', {
        headers: { Authorization: `Bearer ${integ.accessToken}`, 'Square-Version': '2025-07-16' }
      });
      const js = await res.json();
      if (js.merchant?.length) businessName = js.merchant[0].business_name;
    } else {
      const res = await fetch('https://acuityscheduling.com/api/v1/me', {
        headers: { Authorization: `Bearer ${integ.accessToken}` }
      });
      const js = await res.json();
      businessName = js.businessName || js.name || businessName;
    }
  } catch {}

  // 7) Handle already taken
  const wasFilled = campaign.filled;
  const isOriginal = campaign.recipients.some(
    r => r.email?.toLowerCase() === normalized
  );
  if (wasFilled) {
    if (isOriginal) {
      return this.sendSlotTakenReplyEmail(
        fromEmail, fromName,
        { gapletSlotId, startAt: campaign.slotTime, timeZone: slotTimeZone },
        businessName, appointmentTime
      );
    }
    return this.sendSlotAlreadyTakenEmail(
      fromEmail, fromName,
      { gapletSlotId, startAt: campaign.slotTime, timeZone: slotTimeZone },
      businessName, appointmentTime
    );
  }

  // 8) Validate confirmation phrase
  if (!bodyText.toLowerCase().includes('i will take it')) return;

  // 9) Mark filled and clear waves
  campaign.filled = true;
  if (campaign.scheduledTimeouts.length) {
    campaign.scheduledTimeouts.forEach(clearTimeout);
    campaign.scheduledTimeouts = [];
  }
  this.activeCampaigns.set(campaignId, campaign);

  // 10) Identify winner
  const rec = campaign.recipients.find(
    r => r.email?.toLowerCase() === normalized
  );
  const winner = rec
    ? { ...rec, email: fromEmail }
    : { name: fromName, email: fromEmail };

  try {
    // Create booking and log
    await this.createAppointmentAndNotify(
      campaign, winner, {
        gapletSlotId,
        startAt: campaign.slotTime,
        locationId: campaign.locationId,
        durationMinutes: campaign.duration ?? 0,
        serviceVariationId: campaign.serviceVariationId,
        serviceVariationVersion: campaign.serviceVariationVersion!,
        teamMemberId: campaign.teamMemberId,
      }
    );

    // 11) Send confirmation email
    await this.sendConfirmationReplyEmail(
      winner.email!, winner.name,
      { gapletSlotId, startAt: campaign.slotTime, timeZone: slotTimeZone },
      businessName, appointmentTime
    );
  } catch (err) {
    console.error('Booking failed:', err);
    // Fallback slot taken
    if (isOriginal) {
      await this.sendSlotTakenReplyEmail(
        fromEmail, winner.name,
        { gapletSlotId, startAt: campaign.slotTime, timeZone: slotTimeZone },
        businessName, appointmentTime
      );
    } else {
      await this.sendSlotAlreadyTakenEmail(
        fromEmail, winner.name,
        { gapletSlotId, startAt: campaign.slotTime, timeZone: slotTimeZone },
        businessName, appointmentTime
      );
    }
  }
}






async sendConfirmationReplyEmail(
  to: string,
  name: string | null,
  slot: { gapletSlotId: string; startAt: Date; timeZone: string },
  businessName: string,
  appointmentTime: string
) {
  const first = name?.split(' ')[0] || 'Guest';
  const threadId = `<${slot.gapletSlotId}@${process.env.SENDGRID_REPLY_DOMAIN}>`;
  const from = this.buildFrom(businessName);

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
      <p>Hello <strong>${first}</strong>,</p>
      <p>Thank you for choosing <strong>${businessName}</strong>. We’re pleased to confirm your appointment:</p>
      <ul style="padding-left: 20px;">
        <li><strong>Date & Time:</strong> ${appointmentTime}</li>
      </ul>
      <p>If you need to reschedule or cancel, simply reply to this email and we’ll be happy to assist.</p>
      <p>We look forward to seeing you.</p>
      <p>Kind regards,<br>The ${businessName} Team</p>
    </div>
  `.trim();

  const textBody = `
Hello ${first},

Thank you for choosing ${businessName}. We’re pleased to confirm your appointment:

  • Date & Time: ${appointmentTime}

If you need to reschedule or cancel, simply reply to this email and we’ll be happy to assist.

We look forward to seeing you.

Kind regards,
The ${businessName} Team
`.trim();

  await sgMail.send({
    to,
    from,
    replyTo: { email: `${slot.gapletSlotId}@${process.env.SENDGRID_REPLY_DOMAIN}`, name: businessName },
    headers: { 'In-Reply-To': threadId, References: threadId },
    subject: `Re: Appointment Confirmation – ${businessName}`,
    text: textBody,
    html: htmlBody,
  });
}

// Slot taken fallback responder
async sendSlotTakenReplyEmail(
  recipientEmail: string,
  recipientName: string | null,
  slot: { gapletSlotId: string; startAt: Date; timeZone: string },
  businessName: string,
  appointmentTime: string,
  originalMsgId?: string
) {
  const firstName = recipientName?.split(' ')[0] || 'Guest';
  const threadId = originalMsgId ?? `<${slot.gapletSlotId}@${process.env.SENDGRID_REPLY_DOMAIN}>`;
  const localpart = this.formatSenderEmail(businessName);

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
      <p>Hello <strong>${firstName}</strong>,</p>
      <p>We’re sorry, but the appointment slot on <strong>${appointmentTime}</strong> is no longer available.</p>
      <p>Please reply with a few alternative dates and times, and we’ll do our best to accommodate you.</p>
      <p>Sincerely,<br>The ${businessName} Team</p>
    </div>
  `.trim();

  const textBody = `
Hello ${firstName},

We’re sorry, but the appointment slot on ${appointmentTime} is no longer available.

Please reply with a few alternative dates and times, and we’ll do our best to accommodate you.

Sincerely,
The ${businessName} Team
`.trim();

  await sgMail.send({
    to: recipientEmail,
    from: {
      email: `${localpart}@${process.env.SENDGRID_DOMAIN}`,
      name: businessName,
    },
    replyTo: {
      email: `reply+${slot.gapletSlotId}@${process.env.SENDGRID_REPLY_DOMAIN}`,
      name: businessName,
    },
    headers: {
      'In-Reply-To': threadId,
      'References': threadId,
    },
    subject: `Re: Appointment Update – ${businessName}`,
    text: textBody,
    html: htmlBody,
  });
}





async createAppointmentAndNotify(
  campaign: CampaignState,
  winner: Recipient,
  slot: {
    gapletSlotId: string;
    startAt: Date;
    locationId?: string | null;
    durationMinutes: number;
    serviceVariationId?: string | null;
    serviceVariationVersion?: number | null;
    teamMemberId?: string | null;
  }
) {
  // 1) Cargamos la integración
  const integration = await this.prisma.connectedIntegration.findFirst({
    where: {
      userId: campaign.userId,
      provider: campaign.provider,
    },
  });
  if (!integration) {
    throw new Error(
      `No ${campaign.provider} integration found for user ${campaign.userId}`
    );
  }

  // 2) Verificamos que tengamos service_variation_version
  const version = slot.serviceVariationVersion;
  if (!version) {
    throw new Error(
      `Cannot create booking: missing serviceVariationVersion for slot ${slot.gapletSlotId}`
    );
  }

  // 3) Construimos el payload de Square
  const bookingPayload = {
    booking: {
      start_at: slot.startAt,
      location_id: slot.locationId,
      customer_id: winner.customerId,
      customer_note: 'Booked via Gaplet auto-replacement',
      appointment_segments: [
        {
          duration_minutes: slot.durationMinutes,
          service_variation_id: slot.serviceVariationId,
          service_variation_version: version,
          team_member_id: slot.teamMemberId,
        },
      ],
    },
  };
  console.log(
    '⚙️ POST /v2/bookings payload:',
    JSON.stringify(bookingPayload, null, 2)
  );

  const resp = await fetch('https://connect.squareup.com/v2/bookings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${integration.accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': '2025-06-18',
    },
    body: JSON.stringify(bookingPayload),
  });
  const result = await resp.json();
  console.log('⚙️ Square booking response:', result);

  // 4) Si recibimos BAD_REQUEST “no longer available”, lanzamos SlotUnavailableError
  if (
    result.errors?.[0]?.code === 'BAD_REQUEST' &&
    result.errors[0].detail?.includes('no longer available')
  ) {
    throw new SlotUnavailableError(slot.gapletSlotId);
  }

  if (!result.booking?.id) {
    throw new Error(
      `Square booking failed: ${JSON.stringify(result)}`
    );
  }

  // 5) Marcamos el slot como tomado en la base de datos
  await this.prisma.openSlot.update({
    where: { gapletSlotId: slot.gapletSlotId },
    data: { isTaken: true, takenAt: new Date() },
  });

  // 6) Registramos el ReplacementLog
  await this.prisma.replacementLog.create({
    data: {
      userId: campaign.userId,
      clientEmail: winner.email!,
      clientPhone: winner.phone ?? null,
      clientName: winner.name ?? null,
      appointmentTime: slot.startAt,
      provider: campaign.provider,
      providerBookingId: result.booking.id,
      respondedAt: new Date(),
    },
  });

  // 7) Actualizamos métricas del usuario
  await this.prisma.user.update({
    where: { id: campaign.userId },
    data: {
      totalReplacements: { increment: 1 },
      lastReplacementAt: new Date(),
    },
  });
}


async sendSlotAlreadyTakenEmail(
  to: string,
  name: string | null,
  slot: { gapletSlotId: string; startAt: Date; timeZone: string },
  businessName: string,
  appointmentTime: string
) {
  const firstName = name?.split(' ')[0] || 'Guest';
  const threadId = `<${slot.gapletSlotId}@${process.env.SENDGRID_REPLY_DOMAIN}>`;
  const localpart = this.formatSenderEmail(businessName);

  // HTML version
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
      <p>Hello <strong>${firstName}</strong>,</p>
      <p>
        We regret to inform you that the appointment slot on
        <strong>${appointmentTime}</strong> was confirmed by another client
        before we received your response. As a result, we are unable to honor
        your request for that time.
      </p>
      <p>
        Please reply with a few alternative dates and times, and we will make
        every effort to accommodate your schedule.
      </p>
      <p>Thank you for your understanding.</p>
      <p>Sincerely,<br>The ${businessName} Team</p>
    </div>
  `.trim();

  // Plain-text fallback
  const textBody = `
Hello ${firstName},

We regret to inform you that the appointment slot on ${appointmentTime} was confirmed by another client before we received your response. As a result, we are unable to honor your request for that time.

Please reply with a few alternative dates and times, and we will make every effort to accommodate your schedule.

Thank you for your understanding.

Sincerely,
The ${businessName} Team
  `.trim();

  await sgMail.send({
    to,
    from: {
      email: `${localpart}@${process.env.SENDGRID_DOMAIN}`,
      name: businessName
    },
    replyTo: {
      email: `reply+${slot.gapletSlotId}@${process.env.SENDGRID_REPLY_DOMAIN}`,
      name: businessName
    },
    headers: {
      'In-Reply-To': threadId,
      'References': threadId
    },
    subject: `Re: Appointment Already Booked – ${businessName}`,
    text: textBody,
    html: htmlBody
  });
}

private isCampaignFilled(campaignId: string): boolean {
    const campaign = this.activeCampaigns.get(campaignId);
    return campaign ? campaign.filled : false;
  }

  private async sendEmailBatch(
  campaignId: string,
  recipients: Recipient[],
  subject: string,
  textTemplate: string,
  htmlTemplate: string,
  userId: string,
  businessName: string,
) {
  if (this.isCampaignFilled(campaignId) || recipients.length === 0) return;

  const messages = recipients.map(rec => {
    // 1) Construir saludo personalizado
    let greetingText = 'Hello,';
    let greetingHtml = '<p>Hello,</p>';
    if (rec.name && rec.name !== 'Client') {
      const firstName = rec.name.split(' ')[0];
      greetingText = `Hello ${firstName},`;
      greetingHtml = `<p>Hello <strong>${firstName}</strong>,</p>`;
    }

    // 2) Texto plano
    const textContent = `${greetingText}\n\n${textTemplate}`;
const firstName = rec.name.split(' ')[0];
    // 3) HTML (añadiendo el saludo al template)
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
      <p>Hello <strong>${firstName}</strong>,</p>
        ${htmlTemplate}
      <p>Thank you for choosing <strong>${businessName}</strong>.</p>
      <p style="font-size: 12px; color: #999;">
          The ${businessName} Team.
      </p>
      </div>
    `.trim();

    return {
      to: rec.email!,
      from: this.buildFrom(businessName),
      replyTo: this.buildReplyTo(campaignId),
      subject,
      text: textContent,
      html: htmlContent,
    };
  });

  try {
    await sgMail.send(messages);
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailSent: { increment: messages.length } },
    });
    console.log(`✅ Sent ${messages.length} emails for campaign ${campaignId}`);
  } catch (error) {
    console.error(`❌ Error sending email batch for campaign ${campaignId}:`, error);
  }
}


  private async sendSmsBatch(
    campaignId: string,
    recipients: Recipient[],
    body: string,
    userId: string,
  ) {

    
    if (this.isCampaignFilled(campaignId)) return;
    let sentCount = 0;
    for (const rec of recipients) {
      if (!rec.phone) continue;
      try {
        await this.twilioClient.messages.create({
          to: rec.phone,
          from: process.env.TWILIO_FROM_NUMBER,
          body: body,
        });
        sentCount++;
      } catch (err) {
        console.error(`❌ SMS send failed for ${rec.phone}:`, err);
      }
    }
    if (sentCount > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { smsSent: { increment: sentCount } },
      });
    }
    console.log(`✅ Sent ${sentCount} SMS for campaign ${campaignId}`);
  }


 async handleSmsReply(fromPhone: string, messageText: string) {
  const campaignId = this.phoneToCampaign.get(fromPhone);
  if (!campaignId) {
    console.warn(`No active campaign found for SMS from ${fromPhone}`);
    return;
  }

  const campaign = this.activeCampaigns.get(campaignId);
  if (!campaign) {
    console.warn(`Campaign ${campaignId} not found or already completed (SMS).`);
    return;
  }

  // 1) Prepare formatter with slot timezone
  const integForTZ = await this.prisma.connectedIntegration.findUnique({
    where: { userId: campaign.userId, provider: campaign.provider }
  });
  const slotTimeZone = integForTZ
    ? await this.resolveTimeZone(
        campaign.provider as 'square' | 'acuity',
        integForTZ.accessToken,
        campaign.locationId
      )
    : 'UTC';

  const formatter = new Intl.DateTimeFormat('en-US', {
    month:   'long', day: 'numeric', year: 'numeric',
    hour:    'numeric', minute: '2-digit', hour12: true,
    timeZone: slotTimeZone
  });
  const slotTimeStr = formatter.format(campaign.slotTime);

  // 2) If already filled, send apology
  if (campaign.filled) {
    const recipient = campaign.recipients.find(r => r.phone === fromPhone);
    let sorryText = `We’re sorry, that appointment slot on ${slotTimeStr} has just been filled by another client.`;
    if (recipient?.nextAppt) {
      const nextApptStr = formatter.format(recipient.nextAppt);
      sorryText += ` Your upcoming appointment on ${nextApptStr} is still confirmed.`;
    } else {
      sorryText += ` We hope to see you in the future. You’re always welcome to book again.`;
    }
    sorryText += ` We apologize for any inconvenience.`;

    try {
      await this.twilioClient.messages.create({
        to: fromPhone,
        from: process.env.TWILIO_FROM_NUMBER,
        body: sorryText
      });
      console.log(`Sent apology SMS to ${fromPhone}`);
    } catch (err) {
      console.error('Failed to send apology SMS:', err);
    }
    return;
  }

  // 3) Validate confirmation phrase
  if (messageText.trim().toLowerCase() !== 'i will take it') {
    console.log(`SMS from ${fromPhone} does not match confirmation phrase. Ignoring.`);
    return;
  }

  // 4) Cancel any pending waves and mark filled
  if (Array.isArray(campaign.scheduledTimeouts)) {
    for (const t of campaign.scheduledTimeouts) clearTimeout(t);
    campaign.scheduledTimeouts = [];
  }
  campaign.filled = true;
  this.activeCampaigns.set(campaignId, campaign);

  const winner = campaign.recipients.find(r => r.phone === fromPhone);
  if (!winner) {
    console.error('Winner not found for SMS responder');
    return;
  }
  console.log(`🎉 SMS responder ${fromPhone} wins campaign ${campaignId}`);

  // 5) Perform booking and capture bookingId
  let bookingId = '';
  try {
    if (campaign.provider === 'square') {
      const integration = await this.prisma.connectedIntegration.findUnique({
        where: { userId: campaign.userId, provider: 'square' }
      });
      if (!integration) throw new Error('No Square integration');
      const payload = {
        booking: {
          start_at: campaign.slotTime.toISOString(),
          location_id: campaign.locationId,
          customer_id: winner.customerId,
          customer_note: 'Booked via SMS',
          appointment_segments: [{
            duration_minutes: campaign.duration || 0,
            service_variation_id: campaign.serviceVariationId,
            service_variation_version: campaign.serviceVariationVersion || 1,
            team_member_id: campaign.teamMemberId
          }]
        }
      };
      const res = await fetch('https://connect.squareup.com/v2/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${integration.accessToken}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.booking?.id) throw new Error(`Square booking failed ${JSON.stringify(json)}`);
      bookingId = json.booking.id;
    } else {
      const [firstName, ...rest] = winner.name.split(' ');
      const integration = await this.prisma.connectedIntegration.findUnique({
        where: { userId: campaign.userId, provider: 'acuity' }
      });
      if (!integration) throw new Error('No Acuity integration');
      const resp = await fetch('https://acuityscheduling.com/api/v1/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${integration.accessToken}`
        },
        body: JSON.stringify({
          firstName,
          lastName: rest.join(' ') || undefined,
          email: winner.email || null,
          phone: winner.phone,
          datetime: campaign.slotTime,
          appointmentTypeID: campaign.appointmentTypeId
        })
      });
      const appt = await resp.json();
      if (!appt.id) throw new Error(`Acuity booking failed ${JSON.stringify(appt)}`);
      bookingId = appt.id;
    }
  } catch (err) {
    console.error('Booking error:', err);
    // fallback apology
    const errorMsg = `We received your response for ${slotTimeStr}, but the slot was no longer available. We apologize.`;
    try { await this.twilioClient.messages.create({ to: fromPhone, from: process.env.TWILIO_FROM_NUMBER, body: errorMsg }); } catch {}
    if (winner.email) {
      try {
        await sgMail.send({
          to: winner.email,
          from: `no-reply@${process.env.SENDGRID_DOMAIN}`,
          subject: `Slot Not Available`,
          text: `Hello ${winner.name.split(' ')[0]},\n\n${errorMsg}`
        });
      } catch {}
    }
    return;
  }

  // 6) Update DB: mark slot, log replacement, increment metrics
  let slot = campaign.gapletSlotId
    ? await this.prisma.openSlot.findUnique({ where: { gapletSlotId: campaign.gapletSlotId } })
    : null;
  if (!slot) {
    slot = await this.prisma.openSlot.findFirst({
      where: { userId: campaign.userId, provider: campaign.provider, startAt: campaign.slotTime }
    });
  }
  if (slot) {
    await this.prisma.openSlot.update({ where: { id: slot.id }, data: { isTaken: true, takenAt: new Date() } });
  }

  await this.prisma.replacementLog.create({
    data: {
      userId: campaign.userId,
      clientEmail: winner.email || '',
      clientPhone: winner.phone || null,
      clientName: winner.name,
      appointmentTime: campaign.slotTime,
      provider: campaign.provider,
      providerBookingId: bookingId,
      respondedAt: new Date()
    }
  });
  await this.prisma.user.update({
    where: { id: campaign.userId },
    data: { totalReplacements: { increment: 1 }, lastReplacementAt: new Date() }
  });

  // 7) Send confirmations
  try {
    await this.twilioClient.messages.create({
      to: fromPhone,
      from: process.env.TWILIO_FROM_NUMBER,
      body: `Your appointment on ${slotTimeStr} is confirmed. Thank you!`
    });
    console.log(`Sent confirmation SMS to ${fromPhone}`);
  } catch (err) {
    console.error('Failed SMS confirmation:', err);
  }
  if (winner.email) {
    try {
      await sgMail.send({
        to: winner.email,
        from: `no-reply@${process.env.SENDGRID_DOMAIN}`,
        subject: `Appointment Confirmed`,
        text: `Hello ${winner.name.split(' ')[0]},\n\nYour appointment on ${slotTimeStr} is confirmed. Thank you!`
      });
      console.log(`Sent confirmation email to ${winner.email}`);
    } catch (err) {
      console.error('Failed email confirmation:', err);
    }
  }
}


  // Métodos utilitarios para campaña
  getCampaign(campaignId: string): CampaignState | undefined {
    return this.activeCampaigns.get(campaignId);
  }

  getCampaignIdBySlotId(slotId: string): string | undefined {
    return this.emailToCampaign.get(`reply+${slotId}`) || this.emailToCampaign.get(slotId);
  }

  markCampaignFilled(campaignId: string) {
    const campaign = this.activeCampaigns.get(campaignId);
    if (campaign) {
      campaign.filled = true;
      this.activeCampaigns.set(campaignId, campaign);
    }
  }
}

class SlotUnavailableError extends Error {
  constructor(slotId: string) {
    super(`Slot ${slotId} no longer available`);
  }
  
}
