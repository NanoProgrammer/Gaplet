import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as sgMail from '@sendgrid/mail';
import { PrismaManagerService } from '../prisma-manager/prisma-manager.service';
const twilio = require('twilio');

interface Recipient {
  name: string;
  email?: string;
  phone?: string;
  customerId?: string;    // ID interno del cliente en el proveedor (Square customer.id, Acuity client ID)
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
}

@Injectable()
export class NotificationService {
  // Campañas activas almacenadas en memoria
  private activeCampaigns = new Map<string, CampaignState>();
  // Mapas de búsqueda rápida de campaña por email/phone (para manejar respuestas)
  private emailToCampaign = new Map<string, string>();
  private phoneToCampaign = new Map<string, string>();

  // Cliente Twilio y configuración de SendGrid
  private twilioClient: any;

  constructor(private readonly prisma: PrismaManagerService) {
    // Inicializar API de SendGrid y Twilio
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
    this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }

  /**
   * Inicia una campaña de notificaciones por una cita cancelada.
   * Obtiene los clientes del proveedor, los filtra según las preferencias del usuario, y programa lotes de notificación.
   */
  async startCampaign(provider: 'acuity' | 'square', integration: any, payload: any) {
    const userId: string = integration.userId;

    // Cargar usuario con preferencias y determinar su plan (role: 'starter', 'pro' o 'premium')
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });
    if (!user) {
      console.error(`Usuario ${userId} no encontrado para campaña de notificación.`);
      return;
    }
    const preferences = user.preferences;
    const matchType: boolean = !!preferences.matchAppointmentType;
    const notifyBefore = preferences.notifyBeforeMinutes ?? 0;
    const notifyAfter = preferences.notifyAfterMinutes ?? 0;
    const maxNotifications = preferences.maxNotificationsPerGap ?? 10;
    const plan: string = user.role || 'starter';

    // Detalles de la cita cancelada
    let slotTime: Date;
    let appointmentTypeId: number | null = null;
    let canceledCustomerEmail: string | null = null;
    let canceledCustomerId: string | null = null;
    // Datos específicos de Square para reprogramar
    let serviceVariationId: string | null = null;
    let serviceVariationVersion: number | null = null;
    let teamMemberId: string | null = null;
    let locationId: string | null = null;
    let duration: number | null = null;

    if (provider === 'acuity') {
      // Acuity: payload contiene la info de la cita cancelada
      slotTime = new Date(payload.datetime);
      appointmentTypeId = payload.appointmentTypeID ? Number(payload.appointmentTypeID) : null;
      canceledCustomerEmail = payload.email || null;
    } else {
      // Square: usar bookingId para obtener detalles completos de la reserva cancelada
      const bookingId: string = payload.bookingId;
      const bookingUrl = `https://connect.squareup.com/v2/bookings/${bookingId}`;
      const bookingRes = await fetch(bookingUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${integration.accessToken}` },
      });
      const bookingData = await bookingRes.json();
      if (!bookingData.booking) {
        console.error('No se pudieron obtener detalles de la reserva de Square:', bookingData);
        return;
      }
      const booking = bookingData.booking;
      slotTime = new Date(booking.start_at);
      locationId = booking.location_id;
      canceledCustomerId = booking.customer_id || null;
      if (booking.appointment_segments && booking.appointment_segments.length > 0) {
        const segment = booking.appointment_segments[0];
        serviceVariationId = segment.service_variation_id || null;
        serviceVariationVersion = segment.service_variation_version || null;
        teamMemberId = segment.team_member_id || null;
        duration = segment.duration_minutes || null;
        // Si falta service_variation_version, obtener la última versión del catálogo
        if (serviceVariationId && serviceVariationVersion == null) {
          try {
            const catalogRes = await fetch(`https://connect.squareup.com/v2/catalog/object/${serviceVariationId}`, {
              headers: { 'Authorization': `Bearer ${integration.accessToken}` },
            });
            const catalogObj = await catalogRes.json();
            if (catalogObj.object) {
              serviceVariationVersion = catalogObj.object.version;
            }
          } catch (err) {
            console.warn('No se pudo obtener la versión de la variación de servicio:', err);
          }
        }
      }
    }

    // Obtener todos los clientes y su historial de citas del proveedor
    const clients: Recipient[] = [];
    const lastApptMap: Map<string, Date> = new Map();
    const nextApptMap: Map<string, Date> = new Map();
    const clientServiceTypes: Map<string, Set<string | number>> = new Map();

    if (provider === 'acuity') {
      // Listar clientes de Acuity
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
      // Citas pasadas (hasta ahora)
      const nowISO = new Date().toISOString();
      const pastRes = await fetch(`https://acuityscheduling.com/api/v1/appointments?maxDate=${encodeURIComponent(nowISO)}`, {
        headers: { Authorization: `Bearer ${integration.accessToken}` },
      });
      const pastAppointments = await pastRes.json();
      for (const appt of pastAppointments) {
        const clientKey = appt.clientId ? String(appt.clientId) : (appt.email || '');
        const apptDate = new Date(appt.datetime);
        const prevLast = lastApptMap.get(clientKey);
        if (!prevLast || apptDate > prevLast) {
          lastApptMap.set(clientKey, apptDate);
        }
        // Guardar tipos de servicio utilizados por este cliente
        if (appt.appointmentTypeID) {
          if (!clientServiceTypes.has(clientKey)) clientServiceTypes.set(clientKey, new Set());
          clientServiceTypes.get(clientKey)!.add(Number(appt.appointmentTypeID));
        }
      }
      // Citas futuras (desde ahora)
      const futureRes = await fetch(`https://acuityscheduling.com/api/v1/appointments?minDate=${encodeURIComponent(nowISO)}`, {
        headers: { Authorization: `Bearer ${integration.accessToken}` },
      });
      const futureAppointments = await futureRes.json();
      for (const appt of futureAppointments) {
        const clientKey = appt.clientId ? String(appt.clientId) : (appt.email || '');
        const apptDate = new Date(appt.datetime);
        const prevNext = nextApptMap.get(clientKey);
        if (!prevNext || apptDate < prevNext) {
          nextApptMap.set(clientKey, apptDate);
        }
        // Guardar tipos de servicio para próximas citas también
        if (appt.appointmentTypeID) {
          if (!clientServiceTypes.has(clientKey)) clientServiceTypes.set(clientKey, new Set());
          clientServiceTypes.get(clientKey)!.add(Number(appt.appointmentTypeID));
        }
      }
    } else if (provider === 'square') {
      // Listar clientes de Square (Customer Directory)
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
          customerId: c.id || undefined,
        });
      }
      // Buscar reservas pasadas (start_at <= now)
      const nowISO = new Date().toISOString();
      const searchPastRes = await fetch('https://connect.squareup.com/v2/bookings/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: { filter: { start_at_range: { end_at: nowISO } } },
        }),
      });
      const pastData = await searchPastRes.json();
      const pastBookings = pastData.bookings || [];
      for (const book of pastBookings) {
        const custId = book.customer_id;
        if (!custId) continue;
        const start = new Date(book.start_at);
        const prevLast = lastApptMap.get(custId);
        if (!prevLast || start > prevLast) {
          lastApptMap.set(custId, start);
        }
        // Tipos de servicio usados por este cliente en citas pasadas
        if (book.appointment_segments) {
          for (const seg of book.appointment_segments) {
            if (seg.service_variation_id) {
              if (!clientServiceTypes.has(custId)) clientServiceTypes.set(custId, new Set());
              clientServiceTypes.get(custId)!.add(seg.service_variation_id);
            }
          }
        }
      }
      // Buscar reservas futuras (start_at >= now)
      const searchFutureRes = await fetch('https://connect.squareup.com/v2/bookings/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: { filter: { start_at_range: { start_at: nowISO } } },
        }),
      });
      const futureData = await searchFutureRes.json();
      const futureBookings = futureData.bookings || [];
      for (const book of futureBookings) {
        const custId = book.customer_id;
        if (!custId) continue;
        const start = new Date(book.start_at);
        const prevNext = nextApptMap.get(custId);
        if (!prevNext || start < prevNext) {
          nextApptMap.set(custId, start);
        }
        // Tipos de servicio de próximas citas
        if (book.appointment_segments) {
          for (const seg of book.appointment_segments) {
            if (seg.service_variation_id) {
              if (!clientServiceTypes.has(custId)) clientServiceTypes.set(custId, new Set());
              clientServiceTypes.get(custId)!.add(seg.service_variation_id);
            }
          }
        }
      }
    }

    // Filtrar clientes según preferencias, omitiendo al cliente que canceló
    const now = new Date();
    const eligibleRecipients: Recipient[] = [];
    for (const client of clients) {
      // Identificador único del cliente para las tablas (prefiere customerId, sino email o teléfono)
      const idKey = client.customerId || (client.email ? client.email.toLowerCase() : client.phone!);
      // Saltar el cliente que canceló la cita
      if (provider === 'acuity' && canceledCustomerEmail && client.email && client.email.toLowerCase() === canceledCustomerEmail.toLowerCase()) {
        continue;
      }
      if (provider === 'square' && canceledCustomerId && client.customerId === canceledCustomerId) {
        continue;
      }
      // Si se exige tipo de cita coincidente, filtrar clientes que no hayan tenido este servicio
      if (matchType) {
        if (provider === 'acuity') {
          if (appointmentTypeId && (!clientServiceTypes.get(idKey) || !clientServiceTypes.get(idKey)!.has(appointmentTypeId))) {
            continue;
          }
        } else if (provider === 'square') {
          if (serviceVariationId && (!clientServiceTypes.get(idKey) || !clientServiceTypes.get(idKey)!.has(serviceVariationId))) {
            continue;
          }
        }
      }
      // Si notifyAfter está definido, asegurar que pasó suficiente tiempo desde su última cita
      const lastAppt = lastApptMap.get(idKey);
      if (notifyAfter && lastAppt) {
        const minutesSinceLast = (now.getTime() - lastAppt.getTime()) / 60000;
        if (minutesSinceLast < notifyAfter) {
          continue;
        }
      }
      // Si notifyBefore está definido, asegurar que su próxima cita esté suficientemente lejana
      const nextAppt = nextApptMap.get(idKey);
      if (notifyBefore && nextAppt) {
        const minutesUntilNext = (nextAppt.getTime() - now.getTime()) / 60000;
        if (minutesUntilNext < notifyBefore) {
          continue;
        }
      }
      // Requiere al menos un método de contacto
      if (!client.email && !client.phone) {
        continue;
      }
      // Plan Starter: solo notifica por email (descartar sin email)
      if (plan === 'starter' && !client.email) {
        continue;
      }
      // Si pasó todos los filtros, agregar a elegibles
      client.lastAppt = lastAppt || null;
      client.nextAppt = nextAppt || null;
      eligibleRecipients.push(client);
    }

    if (eligibleRecipients.length === 0) {
      console.log(`No hay clientes elegibles para notificación (usuario ${userId}).`);
      return;
    }

    // Limitar notificaciones totales al máximo definido por el usuario
    eligibleRecipients.sort((a, b) => {
      const aNext = a.nextAppt?.getTime() || Infinity;
      const bNext = b.nextAppt?.getTime() || Infinity;
      return aNext - bNext;
    });
    const notifyList = eligibleRecipients.slice(0, maxNotifications);

    // Separar destinatarios en grupos de Email vs SMS (para evitar duplicados a la misma persona)
    let emailList: Recipient[] = [];
    let smsList: Recipient[] = [];
    if (plan === 'starter') {
      // Starter: solo email
      emailList = notifyList.filter(c => c.email);
      smsList = [];
    } else if (plan === 'pro' || plan === 'premium') {
      if (plan === 'pro') {
        // Pro: fase 1 (email) y fase 2 (SMS)
        const emailPhaseCap = Math.min(100, notifyList.length);
        emailList = notifyList.slice(0, emailPhaseCap).filter(c => c.email);
        const remainingForSms = notifyList.slice(emailPhaseCap);
        const smsPhaseCap = Math.min(25, remainingForSms.length);
        smsList = remainingForSms.slice(0, smsPhaseCap).filter(c => c.phone);
      } else if (plan === 'premium') {
        // Premium: fase 1 (email) y fase 2 (SMS) con mayores límites iniciales
        const emailPhaseCap = Math.min(160, notifyList.length);
        emailList = notifyList.slice(0, emailPhaseCap).filter(c => c.email);
        const remainingForSms = notifyList.slice(emailPhaseCap);
        const smsPhaseCap = Math.min(20, remainingForSms.length);
        smsList = remainingForSms.slice(0, smsPhaseCap).filter(c => c.phone);
      }
    }

    // Guardar el estado de la campaña y configurar accesos rápidos para respuestas
    const campaignId = crypto.randomUUID();
    const campaignState: CampaignState = {
      campaignId,
      userId,
      provider,
      slotTime,
      appointmentTypeId: appointmentTypeId || null,
      serviceVariationId: serviceVariationId || null,
      serviceVariationVersion: serviceVariationVersion || null,
      teamMemberId: teamMemberId || null,
      locationId: locationId || null,
      duration: duration || null,
      filled: false,
      originalCustomerEmail: canceledCustomerEmail || null,
      originalCustomerId: canceledCustomerId || null,
      recipients: notifyList,
    };
    this.activeCampaigns.set(campaignId, campaignState);
    // Mapear email y teléfono de cada destinatario a esta campaña (para identificar respuestas entrantes)
    for (const rec of notifyList) {
      if (rec.email) this.emailToCampaign.set(rec.email.toLowerCase(), campaignId);
      if (rec.phone) this.phoneToCampaign.set(rec.phone, campaignId);
    }

    // Determinar nombre del negocio para personalizar mensajes
    let businessName = 'your business';
    if (provider === 'square') {
      try {
        const merchRes = await fetch('https://connect.squareup.com/v2/merchants/me', {
          headers: { Authorization: `Bearer ${integration.accessToken}` },
        });
        const merchData = await merchRes.json();
        if (merchData.merchant && merchData.merchant.business_name) {
          businessName = merchData.merchant.business_name;
        }
      } catch (err) {
        console.warn('No se pudo obtener el nombre del negocio de Square:', err);
      }
    } else if (provider === 'acuity') {
      try {
        const acuityRes = await fetch('https://acuityscheduling.com/api/v1/me', {
          headers: { Authorization: `Bearer ${integration.accessToken}` },
        });
        const acuityData = await acuityRes.json();
        if (acuityData.businessName) {
          businessName = acuityData.businessName;
        } else if (acuityData.name) {
          businessName = acuityData.name;
        }
      } catch (err) {
        console.warn('No se pudo obtener el nombre del negocio de Acuity:', err);
      }
    }

    const slotTimeStr = slotTime.toLocaleString();
    const emailSubject = `📅 ${businessName} has an open appointment slot available!`;
    const emailText =
      `Hello,\n\n` +
      `An appointment on ${slotTimeStr} just opened up at ${businessName}. ` +
      `If you would like to take this slot, **please reply to this email with "I will take it"**.\n` +
      `The first response will be booked for the appointment. If you're interested, please respond quickly!\n\n` +
      `Thank you,\n${businessName}`;
    const smsText = `${businessName}: An appointment on ${slotTimeStr} is now available. Reply "I will take it" to claim it.`;

    // Generar dirección única de reply-to para respuestas por email (SendGrid Inbound Parse)
    const replyToken = crypto.randomUUID();
    const replyAddress = `${replyToken}@${process.env.SENDGRID_REPLY_DOMAIN}`;
    this.emailToCampaign.set(replyToken, campaignId);

    /* Programar envíos en lotes usando temporizadores (setTimeout) según el plan */
    if (plan === 'STARTER') {
      // Starter: enviar emails en lotes de 5, separados por 1 minuto
      const batchSize = 5;
      for (let i = 0; i < emailList.length; i += batchSize) {
        const batchRecipients = emailList.slice(i, i + batchSize);
        const delayMs = (i / batchSize) * 60_000;  // 0 min, 1 min, 2 min, ...
        setTimeout(() => {
          this.sendEmailBatch(campaignId, batchRecipients, emailSubject, emailText, replyAddress, userId);
        }, delayMs);
      }
      // (Plan Starter no envía SMS)
    }

    if (plan === 'PRO') {
      // Pro: Fase 1 - oleadas de emails por 50 minutos (cada 5 min, lotes de 10)
      const emailBatchSize = 10;
      const emailIntervalMs = 5 * 60_000;
      let batchStart = 0;
      for (let wave = 0; batchStart < emailList.length && wave < 10; wave++) {
        const batchRecipients = emailList.slice(batchStart, batchStart + emailBatchSize);
        if (batchRecipients.length === 0) break;
        const delayMs = wave * emailIntervalMs;
        setTimeout(() => {
          this.sendEmailBatch(campaignId, batchRecipients, emailSubject, emailText, replyAddress, userId);
        }, delayMs);
        batchStart += batchRecipients.length;
      }
      // Fase 2 - oleadas de SMS por 10 minutos (cada 2 min, lotes de 5), empezando después de 50 min
      const smsBatchSize = 5;
      const smsIntervalMs = 2 * 60_000;
      batchStart = 0;
      for (let wave = 0; batchStart < smsList.length && wave < 5; wave++) {
        const batchRecipients = smsList.slice(batchStart, batchStart + smsBatchSize);
        if (batchRecipients.length === 0) break;
        const delayMs = 50 * 60_000 + wave * smsIntervalMs;  // inicia a los 50 min
        setTimeout(() => {
          this.sendSmsBatch(campaignId, batchRecipients, smsText, userId);
        }, delayMs);
        batchStart += batchRecipients.length;
      }
      // Si quedan clientes sin notificar tras la primera hora, iniciar segundo ciclo de notificaciones
      const firstCycleCount = emailList.length + smsList.length;
      if (notifyList.length > firstCycleCount) {
        const remainingList = notifyList.slice(firstCycleCount);
        // Fase 3 - segundo ciclo de emails (otros 50 min)
        batchStart = 0;
        for (let wave = 0; batchStart < remainingList.length && wave < 10; wave++) {
          const batchRecipients = remainingList.slice(batchStart, batchStart + emailBatchSize).filter(r => r.email);
          if (batchRecipients.length === 0) break;
          const delayMs = 60 * 60_000 + wave * emailIntervalMs;  // inicia a los 60 min
          setTimeout(() => {
            this.sendEmailBatch(campaignId, batchRecipients, emailSubject, emailText, replyAddress, userId);
          }, delayMs);
          batchStart += batchRecipients.length;
        }
        // Fase 4 - segundo ciclo de SMS (otros 10 min)
        const remainingAfterEmails = remainingList.filter(r => r.email).length < remainingList.length
          ? remainingList.slice(remainingList.findIndex(r => !r.email))
          : [];
        batchStart = 0;
        for (let wave = 0; batchStart < remainingAfterEmails.length && wave < 5; wave++) {
          const batchRecipients = remainingAfterEmails.slice(batchStart, batchStart + smsBatchSize).filter(r => r.phone);
          if (batchRecipients.length === 0) break;
          const delayMs = 110 * 60_000 + wave * smsIntervalMs;  // inicia a los 110 min
          setTimeout(() => {
            this.sendSmsBatch(campaignId, batchRecipients, smsText, userId);
          }, delayMs);
          batchStart += batchRecipients.length;
        }
        // Fase 5 - clientes restantes (si aún quedan) vía SMS individual cada 2 min desde los 120 min
        const secondCycleCount = remainingList.length;
        if (notifyList.length > firstCycleCount + secondCycleCount) {
          const lastBatch = notifyList.slice(firstCycleCount + secondCycleCount);
          lastBatch.filter(r => r.phone).forEach((rec, index) => {
            const delayMs = 120 * 60_000 + index * (2 * 60_000);
            setTimeout(() => {
              this.sendSmsBatch(campaignId, [rec], smsText, userId);
            }, delayMs);
          });
        }
      }
    }

    if (plan === 'PREMIUM') {
      // Premium: Fase 1 - oleadas rápidas de email (cada 3 min por ~48 min, ~16 lotes de 10)
      const emailBatchSize = 10;
      const emailIntervalMs = 3 * 60_000;
      let batchStart = 0;
      for (let wave = 0; batchStart < emailList.length && wave < 16; wave++) {
        const batchRecipients = emailList.slice(batchStart, batchStart + emailBatchSize);
        if (batchRecipients.length === 0) break;
        const delayMs = wave * emailIntervalMs;
        setTimeout(() => {
          this.sendEmailBatch(campaignId, batchRecipients, emailSubject, emailText, replyAddress, userId);
        }, delayMs);
        batchStart += batchRecipients.length;
      }
      // Fase 2 - oleadas rápidas de SMS (cada 3 min por ~12 min, ~4 lotes de 5), empezando después de 48 min
      const smsBatchSize = 5;
      const smsIntervalMs = 3 * 60_000;
      batchStart = 0;
      for (let wave = 0; batchStart < smsList.length && wave < 4; wave++) {
        const batchRecipients = smsList.slice(batchStart, batchStart + smsBatchSize);
        if (batchRecipients.length === 0) break;
        const delayMs = 48 * 60_000 + wave * smsIntervalMs;
        setTimeout(() => {
          this.sendSmsBatch(campaignId, batchRecipients, smsText, userId);
        }, delayMs);
        batchStart += batchRecipients.length;
      }
      // Segundo ciclo (si sigue disponible el cupo tras ~60 min)
      const firstCycleCount = emailList.length + smsList.length;
      if (notifyList.length > firstCycleCount) {
        const remainingList = notifyList.slice(firstCycleCount);
        // Fase 3 - segundo ciclo de emails (~16 oleadas de 3 min, 60-108 min)
        batchStart = 0;
        for (let wave = 0; batchStart < remainingList.length && wave < 16; wave++) {
          const batchRecipients = remainingList.slice(batchStart, batchStart + emailBatchSize).filter(r => r.email);
          if (batchRecipients.length === 0) break;
          const delayMs = 60 * 60_000 + wave * emailIntervalMs;
          setTimeout(() => {
            this.sendEmailBatch(campaignId, batchRecipients, emailSubject, emailText, replyAddress, userId);
          }, delayMs);
          batchStart += batchRecipients.length;
        }
        // Fase 4 - segundo ciclo de SMS (~4 oleadas de 3 min, 108-120 min)
        const remainingAfterEmails = remainingList.filter(r => r.email).length < remainingList.length
          ? remainingList.slice(remainingList.findIndex(r => !r.email))
          : [];
        batchStart = 0;
        for (let wave = 0; batchStart < remainingAfterEmails.length && wave < 4; wave++) {
          const batchRecipients = remainingAfterEmails.slice(batchStart, batchStart + smsBatchSize).filter(r => r.phone);
          if (batchRecipients.length === 0) break;
          const delayMs = 108 * 60_000 + wave * smsIntervalMs;
          setTimeout(() => {
            this.sendSmsBatch(campaignId, batchRecipients, smsText, userId);
          }, delayMs);
          batchStart += batchRecipients.length;
        }
        // Fase 5 - SMS individuales cada 2 min a partir de 120 min si aún quedan pendientes
        const secondCycleCount = remainingList.length;
        if (notifyList.length > firstCycleCount + secondCycleCount) {
          const lastBatch = notifyList.slice(firstCycleCount + secondCycleCount);
          lastBatch.filter(r => r.phone).forEach((rec, index) => {
            const delayMs = 120 * 60_000 + index * (2 * 60_000);
            setTimeout(() => {
              this.sendSmsBatch(campaignId, [rec], smsText, userId);
            }, delayMs);
          });
        }
      }
    }

    console.log(`🚀 Started notification campaign ${campaignId} for user ${userId}: notifying up to ${notifyList.length} clients.`);
  }

  /** Verifica si una campaña ya fue llenada (para omitir envíos posteriores). */
  private isCampaignFilled(campaignId: string): boolean {
    const campaign = this.activeCampaigns.get(campaignId);
    return campaign ? campaign.filled : false;
  }

  /** Enviar un lote de correos electrónicos (llamado por los temporizadores programados). */
  private async sendEmailBatch(
    campaignId: string,
    recipients: Recipient[],
    subject: string,
    body: string,
    replyTo: string,
    userId: string,
  ) {
    // No enviar si el cupo ya fue tomado
    if (this.isCampaignFilled(campaignId)) return;
    if (!recipients.length) return;
    // Preparar mensajes de email para SendGrid
    const messages = recipients.map(rec => ({
      to: rec.email!,
      from: `${process.env.SENDGRID_FROM_NAME || 'Appointments'} <${process.env.SENDGRID_FROM_EMAIL}>`,
      subject: subject,
      text: body,
      replyTo: replyTo,
    }));
    try {
      await sgMail.send(messages);
      // Actualizar contador de emails enviados del usuario en BD
      await this.prisma.user.update({
        where: { id: userId },
        data: { emailSent: { increment: messages.length } },
      });
      console.log(`✅ Sent ${messages.length} emails for campaign ${campaignId}`);
    } catch (error) {
      console.error(`❌ Error sending email batch for campaign ${campaignId}:`, error);
    }
  }

  /** Enviar un lote de mensajes SMS (llamado por los temporizadores programados). */
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

  /**
   * Manejar una respuesta por email entrante de un cliente.
   * Si el cuerpo contiene la frase de confirmación, intenta reservar la cita para ese cliente.
   */
  async handleEmailReply(fromEmail: string, toEmail: string, bodyText: string) {
    const normalizedFrom = fromEmail.toLowerCase();
    // Determinar a qué campaña corresponde este email (por reply token único o email del remitente)
    let campaignId = this.emailToCampaign.get(toEmail.split('@')[0]);
    if (!campaignId) {
      campaignId = this.emailToCampaign.get(normalizedFrom);
    }
    if (!campaignId) {
      console.warn(`No active campaign found for email reply to ${toEmail}`);
      return;
    }
    const campaign = this.activeCampaigns.get(campaignId);
    if (!campaign) {
      console.warn(`Campaign ${campaignId} not found or already completed.`);
      return;
    }
    // Si el cupo ya fue tomado por otro, enviar disculpa
    if (campaign.filled) {
      const recipient = campaign.recipients.find(r => r.email && r.email.toLowerCase() === normalizedFrom);
      let apology = `Hi, thank you for your quick response. Unfortunately, that appointment slot has already been taken by another client. `;
      if (recipient) {
        if (recipient.nextAppt) {
          apology += `Your upcoming appointment on ${recipient.nextAppt.toLocaleString()} remains scheduled as planned. `;
        } else {
          apology += `We hope to see you in the future. You can still book another appointment with us. `;
        }
      }
      apology += `Thank you for understanding.`;
      try {
        await sgMail.send({
          to: fromEmail,
          from: `Appointments <no-reply@${process.env.SENDGRID_DOMAIN}>`,
          subject: `Appointment slot no longer available`,
          text: apology,
        });
        console.log(`Sent apology email to ${fromEmail} (slot already filled).`);
      } catch (err) {
        console.error('Failed to send apology email:', err);
      }
      return;
    }
    // Verificar frase de confirmación
    if (!bodyText || bodyText.toLowerCase().includes('i will take it') === false) {
      console.log(`Email from ${fromEmail} does not contain the confirmation phrase. Ignoring.`);
      return;
    }
    // Marcar el cupo como tomado
    campaign.filled = true;
    this.activeCampaigns.set(campaignId, campaign);
    const winner = campaign.recipients.find(r => r.email && r.email.toLowerCase() === normalizedFrom);
    if (!winner) {
      console.error('Winner not found in campaign recipient list (email).');
      return;
    }
    console.log(`🎉 Client ${winner.email} responded first for campaign ${campaignId}. Booking appointment...`);
    // Obtener nombre del negocio para comunicaciones
    let businessName = 'your business';
    try {
      if (campaign.provider === 'square') {
        const integration = await this.prisma.connectedIntegration.findUnique({
          where: { userId: campaign.userId, provider: 'square' },
        });
        if (integration) {
          const merchRes = await fetch('https://connect.squareup.com/v2/merchants/me', {
            headers: { Authorization: `Bearer ${integration.accessToken}` },
          });
          const merchData = await merchRes.json();
          if (merchData.merchant && merchData.merchant.business_name) {
            businessName = merchData.merchant.business_name;
          }
        }
      } else if (campaign.provider === 'acuity') {
        const integration = await this.prisma.connectedIntegration.findUnique({
          where: { userId: campaign.userId, provider: 'acuity' },
        });
        if (integration) {
          const acuityRes = await fetch('https://acuityscheduling.com/api/v1/me', {
            headers: { Authorization: `Bearer ${integration.accessToken}` },
          });
          const acuityData = await acuityRes.json();
          if (acuityData.businessName) {
            businessName = acuityData.businessName;
          } else if (acuityData.name) {
            businessName = acuityData.name;
          }
        }
      }
    } catch {
      // Si falla la consulta, usar nombre por defecto ('your business')
    }
    try {
      // Reservar la cita en el proveedor para el ganador
      if (campaign.provider === 'acuity') {
        // Crear nueva cita en Acuity
        const names = winner.name.split(' ');
        const firstName = names[0] || 'Valued';
        const lastName = names.slice(1).join(' ') || 'Client';
        const integration = await this.prisma.connectedIntegration.findUnique({
          where: { userId: campaign.userId, provider: 'acuity' },
        });
        if (!integration) throw new Error('No Acuity integration found for booking');
        const createRes = await fetch('https://acuityscheduling.com/api/v1/appointments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${integration.accessToken}`,
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email: winner.email,
            phone: winner.phone || '',
            datetime: campaign.slotTime.toISOString().slice(0, 16), // formato YYYY-MM-DDThh:mm
            appointmentTypeID: campaign.appointmentTypeId,
          }),
        });
        const apptCreated = await createRes.json();
        if (!apptCreated.id) {
          throw new Error(`Acuity booking failed: ${JSON.stringify(apptCreated)}`);
        }
      } else if (campaign.provider === 'square') {
        // Crear nueva reserva en Square
        const integration = await this.prisma.connectedIntegration.findUnique({
          where: { userId: campaign.userId, provider: 'square' },
        });
        if (!integration) throw new Error('No Square integration found for booking');
        const newBooking = {
          start_at: campaign.slotTime.toISOString(),
          location_id: campaign.locationId,
          customer_id: winner.customerId,
          customer_note: 'Booked via gap notification',
          appointment_segments: [
            {
              duration_minutes: campaign.duration || 0,
              service_variation_id: campaign.serviceVariationId,
              service_variation_version: campaign.serviceVariationVersion || 1,
              team_member_id: campaign.teamMemberId,
            },
          ],
        };
        const createRes = await fetch('https://connect.squareup.com/v2/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${integration.accessToken}`,
          },
          body: JSON.stringify({ booking: newBooking }),
        });
        const result = await createRes.json();
        if (!result.booking) {
          throw new Error(`Square booking failed: ${JSON.stringify(result)}`);
        }
      }
      // Actualizar métricas del usuario por reemplazo exitoso
      await this.prisma.user.update({
        where: { id: campaign.userId },
        data: {
          totalReplacements: { increment: 1 },
          lastReplacementAt: new Date(),
        },
      });
      // Notificar al cliente ganador con una confirmación
      const confirmationMsg = `Hi ${winner.name.split(' ')[0]},\n\nGood news! Your appointment on ${campaign.slotTime.toLocaleString()} is confirmed. Thank you for taking the slot. We look forward to seeing you!\n\n${businessName}`;
      try {
        await sgMail.send({
          to: winner.email!,
          from: `${businessName} <no-reply@${process.env.SENDGRID_DOMAIN}>`,
          subject: `Your appointment on ${campaign.slotTime.toLocaleString()} is confirmed`,
          text: confirmationMsg,
        });
      } catch (err) {
        console.error('Failed to send confirmation email:', err);
      }
      if (winner.phone) {
        try {
          await this.twilioClient.messages.create({
            to: winner.phone,
            from: process.env.TWILIO_FROM_NUMBER,
            body: `${businessName}: Your appointment on ${campaign.slotTime.toLocaleString()} is confirmed. Thank you!`,
          });
        } catch (err) {
          console.error('Failed to send confirmation SMS:', err);
        }
      }
    } catch (error) {
      console.error('Error during booking for email reply:', error);
      // Si la reserva falló o el cupo ya no estaba disponible, informar al cliente
      const failMsg = `Hi, we received your response for the ${campaign.slotTime.toLocaleString()} slot, but unfortunately we couldn't book it (it may have already been taken). We're sorry about that.`;
      try {
        await sgMail.send({
          to: fromEmail,
          from: `${businessName} <no-reply@${process.env.SENDGRID_DOMAIN}>`,
          subject: `Appointment not available`,
          text: failMsg,
        });
      } catch { /* ignorar */ }
      if (winner && winner.phone) {
        try {
          await this.twilioClient.messages.create({
            to: winner.phone,
            from: process.env.TWILIO_FROM_NUMBER,
            body: `${businessName}: Sorry, the slot at ${campaign.slotTime.toLocaleString()} was no longer available. We apologize for the inconvenience.`,
          });
        } catch { /* ignorar */ }
      }
      // Marcar la campaña como llena para detener notificaciones adicionales
      campaign.filled = true;
      this.activeCampaigns.set(campaignId, campaign);
    }
  }

  /**
   * Manejar una respuesta por SMS entrante de un cliente.
   * Si el mensaje coincide con la frase de confirmación, reserva la cita si sigue disponible.
   */
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
    if (campaign.filled) {
      // Cupo ya tomado, enviar disculpa por SMS
      const recipient = campaign.recipients.find(r => r.phone === fromPhone);
      let sorryText = `We’re sorry, that appointment slot has just been filled by another client.`;
      if (recipient) {
        if (recipient.nextAppt) {
          sorryText += ` Your upcoming appointment on ${recipient.nextAppt.toLocaleString()} is still confirmed as scheduled.`;
        } else {
          sorryText += ` We hope to serve you another time. Feel free to book another appointment with us.`;
        }
      }
      try {
        await this.twilioClient.messages.create({
          to: fromPhone,
          from: process.env.TWILIO_FROM_NUMBER,
          body: sorryText,
        });
        console.log(`Sent apology SMS to ${fromPhone} (slot already filled).`);
      } catch (err) {
        console.error('Failed to send apology SMS:', err);
      }
      return;
    }
    // Solo proceder si el SMS es exactamente "I will take it"
    if (!messageText || messageText.trim().toLowerCase() !== 'i will take it') {
      console.log(`SMS from ${fromPhone} does not match confirmation phrase. Ignoring.`);
      return;
    }
    // Marcar el cupo como tomado por este respondiente
    campaign.filled = true;
    this.activeCampaigns.set(campaignId, campaign);
    const winner = campaign.recipients.find(r => r.phone === fromPhone);
    if (!winner) {
      console.error('Winner not found in campaign recipient list (SMS).');
      return;
    }
    console.log(`🎉 Client ${fromPhone} responded first via SMS for campaign ${campaignId}. Booking appointment...`);
    // Obtener nombre del negocio para mensajes de confirmación
    let businessName = 'your business';
    try {
      if (campaign.provider === 'square') {
        const integration = await this.prisma.connectedIntegration.findUnique({
          where: { userId: campaign.userId, provider: 'square' },
        });
        if (integration) {
          const merchRes = await fetch('https://connect.squareup.com/v2/merchants/me', {
            headers: { Authorization: `Bearer ${integration.accessToken}` },
          });
          const merchData = await merchRes.json();
          if (merchData.merchant && merchData.merchant.business_name) {
            businessName = merchData.merchant.business_name;
          }
        }
      } else if (campaign.provider === 'acuity') {
        const integration = await this.prisma.connectedIntegration.findUnique({
          where: { userId: campaign.userId, provider: 'acuity' },
        });
        if (integration) {
          const acuityRes = await fetch('https://acuityscheduling.com/api/v1/me', {
            headers: { Authorization: `Bearer ${integration.accessToken}` },
          });
          const acuityData = await acuityRes.json();
          if (acuityData.businessName) {
            businessName = acuityData.businessName;
          } else if (acuityData.name) {
            businessName = acuityData.name;
          }
        }
      }
    } catch { /* ignorar errores */ }
    try {
      // Reservar la cita para el ganador
      if (campaign.provider === 'acuity') {
        const names = winner.name.split(' ');
        const firstName = names[0] || 'Valued';
        const lastName = names.slice(1).join(' ') || 'Client';
        const integration = await this.prisma.connectedIntegration.findUnique({
          where: { userId: campaign.userId, provider: 'acuity' },
        });
        if (!integration) throw new Error('No Acuity integration for booking');
        const createRes = await fetch('https://acuityscheduling.com/api/v1/appointments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${integration.accessToken}`,
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email: winner.email || `${fromPhone}@example.com`,  // usar email ficticio si no hay
            phone: winner.phone || fromPhone,
            datetime: campaign.slotTime.toISOString().slice(0, 16),
            appointmentTypeID: campaign.appointmentTypeId,
          }),
        });
        const apptCreated = await createRes.json();
        if (!apptCreated.id) {
          throw new Error(`Acuity booking failed: ${JSON.stringify(apptCreated)}`);
        }
      } else if (campaign.provider === 'square') {
        const integration = await this.prisma.connectedIntegration.findUnique({
          where: { userId: campaign.userId, provider: 'square' },
        });
        if (!integration) throw new Error('No Square integration for booking');
        const newBooking = {
          start_at: campaign.slotTime.toISOString(),
          location_id: campaign.locationId,
          customer_id: winner.customerId,
          customer_note: 'Booked via SMS response',
          appointment_segments: [
            {
              duration_minutes: campaign.duration || 0,
              service_variation_id: campaign.serviceVariationId,
              service_variation_version: campaign.serviceVariationVersion || 1,
              team_member_id: campaign.teamMemberId,
            },
          ],
        };
        const createRes = await fetch('https://connect.squareup.com/v2/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${integration.accessToken}`,
          },
          body: JSON.stringify({ booking: newBooking }),
        });
        const result = await createRes.json();
        if (!result.booking) {
          throw new Error(`Square booking failed: ${JSON.stringify(result)}`);
        }
      }
      // Reserva exitosa – actualizar métricas de reemplazo
      await this.prisma.user.update({
        where: { id: campaign.userId },
        data: {
          totalReplacements: { increment: 1 },
          lastReplacementAt: new Date(),
        },
      });
      // Enviar confirmación al ganador por SMS (y email si disponible)
      const confirmText = `${businessName}: Your appointment on ${campaign.slotTime.toLocaleString()} is confirmed. Thank you!`;
      try {
        await this.twilioClient.messages.create({
          to: fromPhone,
          from: process.env.TWILIO_FROM_NUMBER,
          body: confirmText,
        });
      } catch (err) {
        console.error('Failed to send confirmation SMS:', err);
      }
      if (winner.email) {
        try {
          await sgMail.send({
            to: winner.email,
            from: `${businessName} <no-reply@${process.env.SENDGRID_DOMAIN}>`,
            subject: `Appointment Confirmed`,
            text: `Hello ${winner.name.split(' ')[0]},\n\nThis is a confirmation that your appointment on ${campaign.slotTime.toLocaleString()} has been successfully booked. Thank you!\n\n${businessName}`,
          });
        } catch (err) {
          console.error('Failed to send confirmation email to SMS responder:', err);
        }
      }
    } catch (error) {
      console.error('Error during booking for SMS reply:', error);
      // Notificar al cliente que el cupo ya no está disponible
      try {
        await this.twilioClient.messages.create({
          to: fromPhone,
          from: process.env.TWILIO_FROM_NUMBER,
          body: `${businessName}: We received your response, but the slot was no longer available. Sorry for the inconvenience.`,
        });
      } catch { /* ignorar */ }
      if (winner && winner.email) {
        try {
          await sgMail.send({
            to: winner.email,
            from: `${businessName} <no-reply@${process.env.SENDGRID_DOMAIN}>`,
            subject: `Appointment not available`,
            text: `Hi ${winner.name.split(' ')[0]},\n\nWe received your response for the open slot at ${campaign.slotTime.toLocaleString()}, but unfortunately it was no longer available. We apologize for the inconvenience.\n\n${businessName}`,
          });
        } catch { /* ignorar */ }
      }
      // Marcar la campaña como llena para evitar más notificaciones
      campaign.filled = true;
      this.activeCampaigns.set(campaignId, campaign);
    }
  }
}
