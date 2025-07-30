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

  private buildSubject(businessName: string): string {
    return `New appointment slot available at ${businessName}`;
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
    const matchType = !!preferences?.matchAppointmentType;
    const notifyBefore = preferences?.notifyBeforeMinutes ?? 0;
    const notifyAfter = preferences?.notifyAfterMinutes ?? 0;
    const maxNotifications = preferences?.maxNotificationsPerGap ?? 10;
    const plan: string = user.role || '';

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
      if (booking.appointment_segments && booking.appointment_segments.length > 0) {
        const segment = booking.appointment_segments[0];
        serviceVariationId = segment.service_variation_id || null;
        serviceVariationVersion = segment.service_variation_version || null;
        teamMemberId = segment.team_member_id || null;
        duration = segment.duration_minutes || null;
        if (serviceVariationId && serviceVariationVersion == null) {
          try {
            const catalogRes = await fetch(`https://connect.squareup.com/v2/catalog/object/${serviceVariationId}`, {
              headers: { Authorization: `Bearer ${integration.accessToken}` },
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
        if (appt.appointmentTypeID) {
          if (!clientServiceTypes.has(clientKey)) clientServiceTypes.set(clientKey, new Set());
          clientServiceTypes.get(clientKey)!.add(Number(appt.appointmentTypeID));
        }
      }
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
        if (appt.appointmentTypeID) {
          if (!clientServiceTypes.has(clientKey)) clientServiceTypes.set(clientKey, new Set());
          clientServiceTypes.get(clientKey)!.add(Number(appt.appointmentTypeID));
        }
      }
    } else if (provider === 'square') {
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
        if (book.appointment_segments) {
          for (const seg of book.appointment_segments) {
            if (seg.service_variation_id) {
              if (!clientServiceTypes.has(custId)) clientServiceTypes.set(custId, new Set());
              clientServiceTypes.get(custId)!.add(seg.service_variation_id);
            }
          }
        }
      }
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

    // Filtrar clientes según preferencias, excluyendo al cliente que canceló
    const now = new Date();
    const eligibleRecipients: Recipient[] = [];
    for (const client of clients) {
      const idKey = client.customerId || (client.email ? client.email.toLowerCase() : client.phone!);
      if (provider === 'acuity' && canceledCustomerEmail && client.email && client.email.toLowerCase() === canceledCustomerEmail.toLowerCase()) {
        continue;
      }
      if (provider === 'square' && canceledCustomerId && client.customerId === canceledCustomerId) {
        continue;
      }
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
      const lastAppt = lastApptMap.get(idKey);
      if (notifyAfter && lastAppt) {
        const minutesSinceLast = (now.getTime() - lastAppt.getTime()) / 60000;
        if (minutesSinceLast < notifyAfter) {
          continue;
        }
      }
      const nextAppt = nextApptMap.get(idKey);
      if (notifyBefore && nextAppt) {
        const minutesUntilNext = (nextAppt.getTime() - now.getTime()) / 60000;
        if (minutesUntilNext < notifyBefore) {
          continue;
        }
      }
      if (!client.email && !client.phone) {
        continue;
      }
      if (plan === 'STARTER' && !client.email) {
        continue;
      }
      client.lastAppt = lastAppt || null;
      client.nextAppt = nextAppt || null;
      eligibleRecipients.push(client);
    }

    if (eligibleRecipients.length === 0) {
      console.log(`No hay clientes elegibles para notificación (usuario ${userId}).`);
      return;
    }

    eligibleRecipients.sort((a, b) => {
      const aNext = a.nextAppt?.getTime() || Infinity;
      const bNext = b.nextAppt?.getTime() || Infinity;
      return aNext - bNext;
    });
    const notifyList = eligibleRecipients.slice(0, maxNotifications);

    let emailList: Recipient[] = [];
    let smsList: Recipient[] = [];
    if (plan === 'STARTER') {
      emailList = notifyList.filter(c => c.email);
      smsList = [];
    } else if (plan === 'PRO' || plan === 'PREMIUM') {
      if (plan === 'PRO') {
        const emailPhaseCap = Math.min(100, notifyList.length);
        emailList = notifyList.slice(0, emailPhaseCap).filter(c => c.email);
        const remainingForSms = notifyList.slice(emailPhaseCap);
        const smsPhaseCap = Math.min(25, remainingForSms.length);
        smsList = remainingForSms.slice(0, smsPhaseCap).filter(c => c.phone);
      } else if (plan === 'PREMIUM') {
        const emailPhaseCap = Math.min(160, notifyList.length);
        emailList = notifyList.slice(0, emailPhaseCap).filter(c => c.email);
        const remainingForSms = notifyList.slice(emailPhaseCap);
        const smsPhaseCap = Math.min(20, remainingForSms.length);
        smsList = remainingForSms.slice(0, smsPhaseCap).filter(c => c.phone);
      }
    }

    // Guardar estado de campaña y preparar mapping para respuestas entrantes
    const campaignId = gapletSlotId || crypto.randomUUID();
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
      gapletSlotId: gapletSlotId || null,
    };
    this.activeCampaigns.set(campaignId, campaignState);
    // Mapear info de contacto de destinatarios a campaignId
    for (const rec of notifyList) {
      if (rec.email) this.emailToCampaign.set(rec.email.toLowerCase(), campaignId);
      if (rec.phone) this.phoneToCampaign.set(rec.phone, campaignId);
    }
    // Mapear dirección de respuesta única (campaignId) para esta campaña
    this.emailToCampaign.set(campaignId, campaignId);
    if (gapletSlotId) {
      this.emailToCampaign.set(`reply+${gapletSlotId}`, campaignId);
      this.emailToCampaign.set(gapletSlotId, campaignId);
    }

    // Obtener nombre del negocio desde el proveedor para personalizar emails/SMS
    let businessName = 'your business';
    if (provider === 'square') {
      try {
        const merchantsRes = await fetch('https://connect.squareup.com/v2/merchants', {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            'Square-Version': '2025-07-16',
          },
        });
        const merchantsData = await merchantsRes.json();
        if (merchantsData.merchant && merchantsData.merchant.length > 0) {
          businessName = merchantsData.merchant[0].business_name;
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
    const locRes = await fetch(
  `https://connect.squareup.com/v2/locations/${locationId}`,
  { headers: { Authorization: `Bearer ${integration.accessToken}` } }
);
const { location } = await locRes.json();
const locationTimeZone = location.time_zone; // ej. "America/Edmonton"


    // Preparar contenido de notificación
   const opts: Intl.DateTimeFormatOptions = {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: locationTimeZone
};
const slotTimeStr = new Intl.DateTimeFormat('en-US', opts).format(slotTime);


const emailSubject = `Appointment Slot Now Available at ${businessName}`;

const emailBodyTemplate = `
Hello,

We wanted to let you know that an appointment slot has just opened up on ${slotTimeStr} at ${businessName}.  
If you’d like to claim this time, simply reply to this email with “I will take it.”  
Please note that we’ll confirm the slot with the first reply we receive.

Thank you for choosing ${businessName}. We look forward to seeing you.

Sincerely,  
The ${businessName} Team
`.trim();

const smsText = `New slot at ${businessName}: ${slotTimeStr}. Reply “I will take it” to secure this appointment.`;


    /* Enviar notificaciones según el plan del usuario */
    if (plan === 'STARTER') {
      const batchSize = 5;
      for (let i = 0; i < emailList.length; i += batchSize) {
        const batchRecipients = emailList.slice(i, i + batchSize);
        const delayMs = (i / batchSize) * 60_000;
        setTimeout(() => {
          this.sendEmailBatch(campaignId, batchRecipients, emailSubject, emailBodyTemplate, userId, businessName);
        }, delayMs);
      }
    }

    if (plan === 'PRO') {
      const emailBatchSize = 10;
      const emailIntervalMs = 5 * 60_000;
      let batchStart = 0;
      for (let wave = 0; batchStart < emailList.length && wave < 10; wave++) {
        const batchRecipients = emailList.slice(batchStart, batchStart + emailBatchSize);
        if (batchRecipients.length === 0) break;
        const delayMs = wave * emailIntervalMs;
        setTimeout(() => {
          this.sendEmailBatch(campaignId, batchRecipients, emailSubject, emailBodyTemplate, userId, businessName);
        }, delayMs);
        batchStart += batchRecipients.length;
      }
      const smsBatchSize = 5;
      const smsIntervalMs = 2 * 60_000;
      batchStart = 0;
      for (let wave = 0; batchStart < smsList.length && wave < 5; wave++) {
        const batchRecipients = smsList.slice(batchStart, batchStart + smsBatchSize);
        if (batchRecipients.length === 0) break;
        const delayMs = 50 * 60_000 + wave * smsIntervalMs;
        setTimeout(() => {
          this.sendSmsBatch(campaignId, batchRecipients, smsText, userId);
        }, delayMs);
        batchStart += batchRecipients.length;
      }
      const firstCycleCount = emailList.length + smsList.length;
      if (notifyList.length > firstCycleCount) {
        const remainingList = notifyList.slice(firstCycleCount);
        batchStart = 0;
        for (let wave = 0; batchStart < remainingList.length && wave < 10; wave++) {
          const batchRecipients = remainingList.slice(batchStart, batchStart + emailBatchSize).filter(r => r.email);
          if (batchRecipients.length === 0) break;
          const delayMs = 60 * 60_000 + wave * emailIntervalMs;
          setTimeout(() => {
            this.sendEmailBatch(campaignId, batchRecipients, emailSubject, emailBodyTemplate, userId, businessName);
          }, delayMs);
          batchStart += batchRecipients.length;
        }
        const remainingAfterEmails = remainingList.filter(r => r.email).length < remainingList.length
          ? remainingList.slice(remainingList.findIndex(r => !r.email))
          : [];
        batchStart = 0;
        for (let wave = 0; batchStart < remainingAfterEmails.length && wave < 5; wave++) {
          const batchRecipients = remainingAfterEmails.slice(batchStart, batchStart + smsBatchSize).filter(r => r.phone);
          if (batchRecipients.length === 0) break;
          const delayMs = 110 * 60_000 + wave * smsIntervalMs;
          setTimeout(() => {
            this.sendSmsBatch(campaignId, batchRecipients, smsText, userId);
          }, delayMs);
          batchStart += batchRecipients.length;
        }
        if (notifyList.length > firstCycleCount + remainingList.length) {
          const lastBatch = notifyList.slice(firstCycleCount + remainingList.length);
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
      const emailBatchSize = 10;
      const emailIntervalMs = 3 * 60_000;
      let batchStart = 0;
      for (let wave = 0; batchStart < emailList.length && wave < 16; wave++) {
        const batchRecipients = emailList.slice(batchStart, batchStart + emailBatchSize);
        if (batchRecipients.length === 0) break;
        const delayMs = wave * emailIntervalMs;
        setTimeout(() => {
          this.sendEmailBatch(campaignId, batchRecipients, emailSubject, emailBodyTemplate, userId, businessName);
        }, delayMs);
        batchStart += batchRecipients.length;
      }
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
      const firstCycleCount = emailList.length + smsList.length;
      if (notifyList.length > firstCycleCount) {
        const remainingList = notifyList.slice(firstCycleCount);
        batchStart = 0;
        for (let wave = 0; batchStart < remainingList.length && wave < 16; wave++) {
          const batchRecipients = remainingList.slice(batchStart, batchStart + emailBatchSize).filter(r => r.email);
          if (batchRecipients.length === 0) break;
          const delayMs = 60 * 60_000 + wave * emailIntervalMs;
          setTimeout(() => {
            this.sendEmailBatch(campaignId, batchRecipients, emailSubject, emailBodyTemplate, userId, businessName);
          }, delayMs);
          batchStart += batchRecipients.length;
        }
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
        if (notifyList.length > firstCycleCount + remainingList.length) {
          const lastBatch = notifyList.slice(firstCycleCount + remainingList.length);
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

  private isCampaignFilled(campaignId: string): boolean {
    const campaign = this.activeCampaigns.get(campaignId);
    return campaign ? campaign.filled : false;
  }

  private async sendEmailBatch(
    campaignId: string,
    recipients: Recipient[],
    subject: string,
    bodyTemplate: string,
    userId: string,
    businessName: string,
  ) {
    if (this.isCampaignFilled(campaignId) || recipients.length === 0) return;
    const messages = recipients.map(rec => {
      let greeting = 'Hello,';
      if (rec.name && rec.name !== 'Client') {
        const firstName = rec.name.split(' ')[0];
        greeting = `Hello ${firstName},`;
      }
      const textContent = `${greeting}\n\n${bodyTemplate}`;
      return {
        to: rec.email!,
        from: this.buildFrom(businessName),
        subject: subject,
        replyTo: this.buildReplyTo(campaignId),
        text: textContent,
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

  
  async handleEmailReply(
    fromEmailRaw: string,
    toEmail: string,
    bodyText: string,
  ) {
    // — 1) Parsear remitente
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

    // — 2) Extraer campaignId
    const gapletSlotId = toEmail.split('@')[0].replace(/^reply\+/, '');
    const campaignId =
      this.emailToCampaign.get(gapletSlotId) ||
      this.emailToCampaign.get(normalized);
    if (!campaignId) return;
    const campaign = this.activeCampaigns.get(campaignId);
    if (!campaign) return;

    // — 3) Load businessName
    let businessName = 'Your Business';
    try {
      const integ = await this.prisma.connectedIntegration.findFirst({
        where: { userId: campaign.userId, provider: campaign.provider },
      });
      if (integ) {
        if (campaign.provider === 'square') {
          const res = await fetch('https://connect.squareup.com/v2/merchants', {
            headers: { Authorization: `Bearer ${integ.accessToken}` },
          });
          const js = await res.json();
          if (js.merchant?.length) businessName = js.merchant[0].business_name;
        } else {
          const res = await fetch('https://acuityscheduling.com/api/v1/me', {
            headers: { Authorization: `Bearer ${integ.accessToken}` },
          });
          const js = await res.json();
          businessName = js.businessName || js.name || businessName;
        }
      }
    } catch { /* silent */ }
    let slotTimeZone = 'UTC';
  try {
    const integ = await this.prisma.connectedIntegration.findFirst({
      where: { userId: campaign.userId, provider: campaign.provider },
    });
    if (integ) {
      if (campaign.provider === 'square') {
        const locRes = await fetch(
          `https://connect.squareup.com/v2/locations/${campaign.locationId}`,
          { headers: { Authorization: `Bearer ${integ.accessToken}` } }
        );
        const { location } = await locRes.json();
        slotTimeZone = location.time_zone;
      } else { // acuity
        const meRes = await fetch(
          'https://acuityscheduling.com/api/v1/me',
          { headers: { Authorization: `Bearer ${integ.accessToken}` } }
        );
        const meJson = await meRes.json();
        slotTimeZone = meJson.timezone || meJson.timeZone || slotTimeZone;
      }
    }
  } catch (err) {
    console.warn('No pude obtener timezone dinámico, uso UTC', err);
  }
    // — 4) Si ya estaba filled antes de este email
    const wasFilled = this.isCampaignFilled(campaignId);
    const isOriginal = campaign.recipients.some(r => r.email?.toLowerCase() === normalized);
    if (wasFilled) {
      if (isOriginal) {
        return this.sendSlotTakenReplyEmail(
          fromEmail, fromName,
          { gapletSlotId, startAt: campaign.slotTime , timeZone: slotTimeZone }, // Timezone is not critical here
          businessName,
        );
      }
      return this.sendSlotAlreadyTakenEmail(
        fromEmail, fromName,
        { gapletSlotId, startAt: campaign.slotTime, timeZone: slotTimeZone},
        businessName,
      );
    }

    // — 5) Confirmación textual
    if (!bodyText.toLowerCase().includes('i will take it')) return;

    // — 6) Primer respondedor
    campaign.filled = true;
    this.activeCampaigns.set(campaignId, campaign);
    const rec = campaign.recipients.find(r => r.email?.toLowerCase() === normalized);
    const winner: Recipient = rec
      ? { ...rec, email: fromEmail }
      : { name: fromName, email: fromEmail };

    try {
      // — 7) Crear booking + logs
      await this.createAppointmentAndNotify(
        campaign,
        winner,
        {
          gapletSlotId,
          startAt: campaign.slotTime,
          locationId: campaign.locationId,
          durationMinutes: campaign.duration ?? 0,
          serviceVariationId: campaign.serviceVariationId,
          serviceVariationVersion: campaign.serviceVariationVersion!, // obligatorio
          teamMemberId: campaign.teamMemberId,
        },
      );
 let slotTimeZone = 'UTC';
  try {
    const integ = await this.prisma.connectedIntegration.findFirst({
      where: { userId: campaign.userId, provider: campaign.provider },
    });
    if (integ) {
      if (campaign.provider === 'square') {
        const locRes = await fetch(
          `https://connect.squareup.com/v2/locations/${campaign.locationId}`,
          { headers: { Authorization: `Bearer ${integ.accessToken}` } }
        );
        const { location } = await locRes.json();
        slotTimeZone = location.time_zone;
      } else { // acuity
        const meRes = await fetch(
          'https://acuityscheduling.com/api/v1/me',
          { headers: { Authorization: `Bearer ${integ.accessToken}` } }
        );
        const meJson = await meRes.json();
        slotTimeZone = meJson.timezone || meJson.timeZone || slotTimeZone;
      }
    }
  } catch (err) {
    console.warn('No pude obtener timezone dinámico, uso UTC', err);
  }
      
      // — 8) Confirmación en hilo
      await this.sendConfirmationReplyEmail(
        winner.email!, winner.name,
        { gapletSlotId, startAt: campaign.slotTime, timeZone: slotTimeZone },
        businessName,
      );
    } catch (err) {
       let slotTimeZone = 'UTC';
  try {
    const integ = await this.prisma.connectedIntegration.findFirst({
      where: { userId: campaign.userId, provider: campaign.provider },
    });
    if (integ) {
      if (campaign.provider === 'square') {
        const locRes = await fetch(
          `https://connect.squareup.com/v2/locations/${campaign.locationId}`,
          { headers: { Authorization: `Bearer ${integ.accessToken}` } }
        );
        const { location } = await locRes.json();
        slotTimeZone = location.time_zone;
      } else { // acuity
        const meRes = await fetch(
          'https://acuityscheduling.com/api/v1/me',
          { headers: { Authorization: `Bearer ${integ.accessToken}` } }
        );
        const meJson = await meRes.json();
        slotTimeZone = meJson.timezone || meJson.timeZone || slotTimeZone;
      }
    }
  } catch (err) {
    console.warn('No pude obtener timezone dinámico, uso UTC', err);
  }
      console.error('Booking failed:', err);
      // — 9) Fallback “slot ya ocupado”
      if (isOriginal) {
        await this.sendSlotTakenReplyEmail(
          fromEmail, winner.name,
          { gapletSlotId, startAt: campaign.slotTime, timeZone: slotTimeZone },
          businessName,
        );
      } else {
        await this.sendSlotAlreadyTakenEmail(
          fromEmail, winner.name,
          { gapletSlotId, startAt: campaign.slotTime, timeZone: slotTimeZone },
          businessName,
        );
      }
    }
  }




async sendConfirmationReplyEmail(
  to: string,
  name: string | null,
  slot: { gapletSlotId: string; startAt: Date, timeZone: string },
  businessName: string,
) {
  const first = name?.split(' ')[0] || 'Guest';
  const threadId = `<${slot.gapletSlotId}@${process.env.SENDGRID_REPLY_DOMAIN}>`;
  const from = this.buildFrom(businessName);

  
  const appointmentTime = new Intl.DateTimeFormat('en-US', {
    month:  'long',
    day:    'numeric',
    year:   'numeric',
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: slot.timeZone,
  }).format(slot.startAt);

  const body = `
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
    text: body,
  });
}


async sendSlotTakenReplyEmail(
  recipientEmail: string,
  recipientName: string | null,
  slot: { gapletSlotId: string; startAt: Date, timeZone: string },
  businessName: string,
  originalMsgId?: string
) {
  const firstName = recipientName?.split(' ')[0] || 'Guest';
  const when = new Intl.DateTimeFormat('en-US', {
    month:  'long',
    day:    'numeric',
    year:   'numeric',
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: slot.timeZone,
  }).format(slot.startAt);

  const threadId = originalMsgId ?? `<${slot.gapletSlotId}@${process.env.SENDGRID_REPLY_DOMAIN}>`;
  const localpart = this.formatSenderEmail(businessName);

  const body = `
Hello ${firstName},

We regret to inform you that the appointment slot on ${when} is no longer available.

Please reply with a few alternative dates and times, and we will do our best to accommodate your schedule.

We apologize for any inconvenience and appreciate your understanding.

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
    text: body,
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
  slot: { gapletSlotId: string; startAt: Date, timeZone: string },
  businessName: string,
) {
  const firstName = name?.split(' ')[0] || 'Guest';
  const appointmentTime = new Intl.DateTimeFormat('en-US', {
    month:  'long',
    day:    'numeric',
    year:   'numeric',
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: slot.timeZone,
  }).format(slot.startAt);

  const threadId = `<${slot.gapletSlotId}@${process.env.SENDGRID_REPLY_DOMAIN}>`;
  const from     = this.buildFrom(businessName);

  const body = `
Hello ${firstName},

We regret to inform you that the appointment slot on ${appointmentTime} was confirmed by another client before we received your response. As a result, we are unable to honor your request for that time.

Please reply with a few alternative dates and times, and we will make every effort to accommodate your schedule.

Thank you for your understanding.

Sincerely,  
The ${businessName} Team
`.trim();

  await sgMail.send({
    to,
    from,
    replyTo: {
      email: `reply+${slot.gapletSlotId}@${process.env.SENDGRID_REPLY_DOMAIN}`,
      name: businessName
    },
    headers: {
      'In-Reply-To': threadId,
      References: threadId
    },
    subject: `Re: Appointment Already Booked – ${businessName}`,
    text: body,
  });
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
    if (campaign.filled) {
      const recipient = campaign.recipients.find(r => r.phone === fromPhone);
      let sorryText = `We’re sorry, that appointment slot has just been filled by another client.`;
      if (recipient) {
        if (recipient.nextAppt) {
          sorryText += ` Your upcoming appointment on ${recipient.nextAppt.toLocaleString()} is still confirmed as scheduled.`;
        } else {
          sorryText += ` We hope to see you in the future. You're always welcome to book another appointment with us.`;
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
    if (!messageText || messageText.trim().toLowerCase() !== 'i will take it') {
      console.log(`SMS from ${fromPhone} does not match confirmation phrase. Ignoring.`);
      return;
    }
    campaign.filled = true;
    this.activeCampaigns.set(campaignId, campaign);
    const winner = campaign.recipients.find(r => r.phone === fromPhone);
    if (!winner) {
      console.error('Winner not found in campaign recipient list (SMS).');
      return;
    }
    console.log(`🎉 Client ${fromPhone} responded first via SMS for campaign ${campaignId}. Booking appointment...`);
    let businessName = 'your business';
    try {
      if (campaign.provider === 'square') {
        const integration = await this.prisma.connectedIntegration.findUnique({
          where: { userId: campaign.userId, provider: 'square' },
        });
        if (integration) {
          const merchantsRes = await fetch('https://connect.squareup.com/v2/merchants', {
            headers: {
              Authorization: `Bearer ${integration.accessToken}`,
              'Square-Version': '2025-07-16',
            },
          });
          const merchantsData = await merchantsRes.json();
          if (merchantsData.merchant && merchantsData.merchant.length > 0) {
            businessName = merchantsData.merchant[0].business_name;
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
    } catch {}
    try {
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
            email: winner.email || null,
            phone: winner.phone || fromPhone,
            datetime: campaign.slotTime,
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
      // Actualizar openSlot en DB y log de reemplazo
      let slot = null;
      if (campaign.gapletSlotId) {
        slot = await this.prisma.openSlot.findUnique({ where: { gapletSlotId: campaign.gapletSlotId } });
      }
      if (!slot) {
        slot = await this.prisma.openSlot.findFirst({
          where: { 
            userId: campaign.userId,
            provider: campaign.provider,
            startAt: campaign.slotTime,
            locationId: campaign.locationId || undefined
          }
        });
      }
      if (slot) {
        await this.prisma.openSlot.update({
          where: { id: slot.id },
          data: { isTaken: true, takenAt: new Date() },
        });
      }
      await this.prisma.replacementLog.create({
        data: {
          userId: campaign.userId,
          clientEmail: winner.email || '',
          clientPhone: winner.phone || null,
          clientName: winner.name || null,
          appointmentTime: campaign.slotTime,
          provider: campaign.provider,
          providerBookingId: '', // ID de la nueva cita (se podría obtener del resultado de la API si se necesitara)
          respondedAt: new Date(),
        },
      });
      await this.prisma.user.update({
        where: { id: campaign.userId },
        data: {
          totalReplacements: { increment: 1 },
          lastReplacementAt: new Date(),
        },
      });
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
        const firstName = winner.name.split(' ')[0];
        try {
          await sgMail.send({
            to: winner.email,
            from: `${businessName} <no-reply@${process.env.SENDGRID_DOMAIN}>`,
            subject: `Appointment Confirmed`,
            text: `Hello ${firstName},\n\nYour appointment on ${campaign.slotTime.toLocaleString()} at ${businessName} is confirmed. Thank you, and we look forward to seeing you!\n\n${businessName}`,
          });
        } catch (err) {
          console.error('Failed to send confirmation email to SMS responder:', err);
        }
      }
    } catch (error) {
      console.error('Error during booking for SMS reply:', error);
      try {
        await this.twilioClient.messages.create({
          to: fromPhone,
          from: process.env.TWILIO_FROM_NUMBER,
          body: `${businessName}: We received your response, but that ${campaign.slotTime.toLocaleString()} slot was no longer available. Sorry for the inconvenience.`,
        });
      } catch {}
      if (winner && winner.email) {
        const firstName = winner.name.split(' ')[0];
        try {
          await sgMail.send({
            to: winner.email,
            from: `${businessName} <no-reply@${process.env.SENDGRID_DOMAIN}>`,
            subject: `Appointment not available`,
            text: `Hello ${firstName},\n\nWe received your response for the open slot on ${campaign.slotTime.toLocaleString()}, but unfortunately it was no longer available. We apologize for the inconvenience.\n\n${businessName}`,
          });
        } catch {}
      }
      campaign.filled = true;
      this.activeCampaigns.set(campaignId, campaign);
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