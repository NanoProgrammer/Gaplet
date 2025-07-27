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
    return `📅 New appointment slot available at ${businessName}`;
  }

  constructor(private readonly prisma: PrismaManagerService) {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
    this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }

  async startCampaign(provider: 'acuity' | 'square', integration: any, payload: any) {
    const userId: string = integration.userId;

    // Load user and preferences
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });
    if (!user) {
      console.error(`Usuario ${userId} no encontrado para campaña de notificación.`);
      return;
    }
    const preferences = user.preferences;
    const matchType = !!preferences.matchAppointmentType;
    const notifyBefore = preferences.notifyBeforeMinutes ?? 0;
    const notifyAfter = preferences.notifyAfterMinutes ?? 0;
    const maxNotifications = preferences.maxNotificationsPerGap ?? 10;
    const plan: string = user.role || '';

    // Details of the canceled appointment slot
    let slotTime: Date;
    let appointmentTypeId: number | null = null;
    let canceledCustomerEmail: string | null = null;
    let canceledCustomerId: string | null = null;
    // Square-specific details
    let serviceVariationId: string | null = null;
    let serviceVariationVersion: number | null = null;
    let teamMemberId: string | null = null;
    let locationId: string | null = null;
    let duration: number | null = null;

    if (provider === 'acuity') {
      // Acuity: payload contains canceled appointment info
      slotTime = new Date(payload.datetime);
      appointmentTypeId = payload.appointmentTypeID ? Number(payload.appointmentTypeID) : null;
      canceledCustomerEmail = payload.email || null;
    } else {
      // Square: obtener detalles de la reserva ya sea del payload o desde la API
      let booking: any;
      if (payload.booking) {
        // Si el payload ya incluye la info completa de la reserva (webhook), úsala directamente
        booking = payload.booking;
      } else if (payload.bookingId) {
        // Si no, obtener detalles de la reserva mediante la API de Square usando bookingId
        const rawBookingId: string = payload.bookingId;
        // Eliminar sufijo de versión (e.g., ":1") si está presente en el bookingId
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
      // Extraer datos de horario y servicio de la reserva obtenida
      slotTime = new Date(booking.start_at);
      locationId = booking.location_id;
      canceledCustomerId = booking.customer_id || null;
      if (booking.appointment_segments && booking.appointment_segments.length > 0) {
        const segment = booking.appointment_segments[0];
        serviceVariationId = segment.service_variation_id || null;
        serviceVariationVersion = segment.service_variation_version || null;
        teamMemberId = segment.team_member_id || null;
        duration = segment.duration_minutes || null;
        // Si service_variation_version no vino, obtener la versión actual del catálogo
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

    // Retrieve all clients and their appointment history from the provider
    const clients: Recipient[] = [];
    const lastApptMap: Map<string, Date> = new Map();
    const nextApptMap: Map<string, Date> = new Map();
    const clientServiceTypes: Map<string, Set<string | number>> = new Map();

    if (provider === 'acuity') {
      // List Acuity clients
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
      // Past appointments (up to now)
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
        // Track service types this client has had
        if (appt.appointmentTypeID) {
          if (!clientServiceTypes.has(clientKey)) clientServiceTypes.set(clientKey, new Set());
          clientServiceTypes.get(clientKey)!.add(Number(appt.appointmentTypeID));
        }
      }
      // Future appointments (from now on)
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
        // Track service types for upcoming appointments as well
        if (appt.appointmentTypeID) {
          if (!clientServiceTypes.has(clientKey)) clientServiceTypes.set(clientKey, new Set());
          clientServiceTypes.get(clientKey)!.add(Number(appt.appointmentTypeID));
        }
      }
    } else if (provider === 'square') {
      // List Square customers
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
      // Past bookings (start_at <= now)
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
        // Track service variations the customer has had
        if (book.appointment_segments) {
          for (const seg of book.appointment_segments) {
            if (seg.service_variation_id) {
              if (!clientServiceTypes.has(custId)) clientServiceTypes.set(custId, new Set());
              clientServiceTypes.get(custId)!.add(seg.service_variation_id);
            }
          }
        }
      }
      // Future bookings (start_at >= now)
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
        // Track service variations of upcoming appointments
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

    // Filter clients based on user preferences, excluding the client who canceled
    const now = new Date();
    const eligibleRecipients: Recipient[] = [];
    for (const client of clients) {
      const idKey = client.customerId || (client.email ? client.email.toLowerCase() : client.phone!);
      // Skip the client who canceled
      if (provider === 'acuity' && canceledCustomerEmail && client.email && client.email.toLowerCase() === canceledCustomerEmail.toLowerCase()) {
        continue;
      }
      if (provider === 'square' && canceledCustomerId && client.customerId === canceledCustomerId) {
        continue;
      }
      // If matching appointment type is required, skip clients who haven't had this service
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
      // If notifyAfter is set, ensure enough time has passed since their last appointment
      const lastAppt = lastApptMap.get(idKey);
      if (notifyAfter && lastAppt) {
        const minutesSinceLast = (now.getTime() - lastAppt.getTime()) / 60000;
        if (minutesSinceLast < notifyAfter) {
          continue;
        }
      }
      // If notifyBefore is set, ensure their next appointment is far enough in the future
      const nextAppt = nextApptMap.get(idKey);
      if (notifyBefore && nextAppt) {
        const minutesUntilNext = (nextAppt.getTime() - now.getTime()) / 60000;
        if (minutesUntilNext < notifyBefore) {
          continue;
        }
      }
      // Require at least one contact method
      if (!client.email && !client.phone) {
        continue;
      }
      // sTARTER plan: only email (skip if no email)
      if (plan === 'STARTER' && !client.email) {
        continue;
      }
      // Passed all filters
      client.lastAppt = lastAppt || null;
      client.nextAppt = nextAppt || null;
      eligibleRecipients.push(client);
    }

    if (eligibleRecipients.length === 0) {
      console.log(`No hay clientes elegibles para notificación (usuario ${userId}).`);
      return;
    }

    // Limit total notifications to the user-defined maximum
    eligibleRecipients.sort((a, b) => {
      const aNext = a.nextAppt?.getTime() || Infinity;
      const bNext = b.nextAppt?.getTime() || Infinity;
      return aNext - bNext;
    });
    const notifyList = eligibleRecipients.slice(0, maxNotifications);

    // Separate recipients into Email vs SMS groups
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

    // Save campaign state and prepare reply-to mapping for responses
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
    // Map recipient contact info to campaignId for incoming responses
    for (const rec of notifyList) {
      if (rec.email) this.emailToCampaign.set(rec.email.toLowerCase(), campaignId);
      if (rec.phone) this.phoneToCampaign.set(rec.phone, campaignId);
    }
    // Map unique reply-to address (using campaignId) to this campaign
    this.emailToCampaign.set(campaignId, campaignId);

    // Determine business name via provider API (OAuth token must have proper scope)
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

    // Prepare notification content
    const slotTimeStr = slotTime.toLocaleString();
    const emailSubject = this.buildSubject(businessName);
    const emailBodyTemplate =
      `We hope you're doing well. An appointment on ${slotTimeStr} has just become available at ${businessName}. ` +
      `If you are interested in taking this slot, please reply to this email with "I will take it".\n` +
      `Please note that the appointment will be offered to the first client who responds, so if you'd like to claim it, please reply as soon as possible.\n\n` +
      `Thank you,\n${businessName}`;
    const smsText = `${businessName}: An appointment on ${slotTimeStr} just opened up. Reply "I will take it" to claim it.`;

    /* Schedule notification batches according to the user's plan */
    if (plan === 'STARTER') {
      // Starter: email in batches of 5, 1 minute apart
      const batchSize = 5;
      console.log('✉️ Email list:', emailList);
      for (let i = 0; i < emailList.length; i += batchSize) {
        const batchRecipients = emailList.slice(i, i + batchSize);
        const delayMs = (i / batchSize) * 60_000;
        setTimeout(() => {
          this.sendEmailBatch(campaignId, batchRecipients, emailSubject, emailBodyTemplate, userId, businessName);
        }, delayMs);
      }
      // No SMS for starter plan
    }

    if (plan === 'PRO') {
      // Phase 1: Email waves for 50 minutes (every 5 min, batches of 10)
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
      // Phase 2: SMS waves for 10 minutes (every 2 min, batches of 5), starting after 50 min
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
      // Phase 3: Second cycle of emails (if recipients remain after first hour)
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
        // Phase 4: Second cycle of SMS (if any remaining)
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
        // Phase 5: Any final remaining recipients via individual SMS every 2 min from 120 min mark
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
      // Phase 1: Rapid email waves (every 3 min for ~48 min, batches of 10)
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
      // Phase 2: Rapid SMS waves (every 3 min for ~12 min, batches of 5), starting after 48 min
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
      // Phase 3: Second cycle of emails (60-108 min)
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
        // Phase 4: Second cycle of SMS (108-120 min)
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
        // Phase 5: Individual SMS every 2 min from 120 min if any still remain
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

  // Check if a campaign slot has already been filled (to skip further sends)
  private isCampaignFilled(campaignId: string): boolean {
    const campaign = this.activeCampaigns.get(campaignId);
    return campaign ? campaign.filled : false;
  }

  // Send a batch of emails (triggered by scheduled timeouts)
  private async sendEmailBatch(
    campaignId: string,
    recipients: Recipient[],
    subject: string,
    bodyTemplate: string,
    userId: string,
    businessName: string,
  ) {
    if (this.isCampaignFilled(campaignId) || !recipients.length) return;
    const messages = recipients.map(rec => {
      // Personalize greeting if possible
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

  // Send a batch of SMS messages (triggered by scheduled timeouts)
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

  // Handle an incoming email reply from a client
  async handleEmailReply(fromEmail: string, toEmail: string, bodyText: string) {
    const normalizedFrom = fromEmail.toLowerCase();
    let campaignId = this.emailToCampaign.get(toEmail.split('@')[0]);
    if (!campaignId) {
      campaignId = this.emailToCampaign.get(normalizedFrom);
    }
    if (!campaignId) {
      console.warn(`No active campaign found for email reply to ${toEmail}`);
      console.log('📨 [Email Reply] from:', fromEmail);
console.log('📨 [Email Reply] to:', toEmail);
console.log('🔍 [Lookup] key from toEmail:', toEmail.split('@')[0]);
console.log('🔍 [Lookup] campaignId from map:', campaignId);

      return;
    }
    const campaign = this.activeCampaigns.get(campaignId);
    if (!campaign) {
      console.warn(`Campaign ${campaignId} not found or already completed.`);
      return;
    }
    // If slot already filled by someone else, send apology
    if (campaign.filled) {
      const recipient = campaign.recipients.find(r => r.email && r.email.toLowerCase() === normalizedFrom);
      // Construct apology message
      let apologyMessage = `Hello${recipient && recipient.name && recipient.name !== 'Client' ? ' ' + recipient.name.split(' ')[0] : ''},\n\n`;
      apologyMessage += `Thank you for your quick response. Unfortunately, that appointment slot has already been filled by another client.\n`;
      if (recipient) {
        if (recipient.nextAppt) {
          apologyMessage += `Your upcoming appointment on ${recipient.nextAppt.toLocaleString()} is still confirmed as scheduled.\n`;
        } else {
          apologyMessage += `We hope to see you in the future, and you're always welcome to schedule another appointment with us.\n`;
        }
      }
      apologyMessage += `\nThank you for understanding,\n`;
      // We will include businessName in the from and signature
      let businessName = 'your business';
      if (campaign.provider === 'square' || campaign.provider === 'acuity') {
        // Attempt to retrieve businessName for branding the email
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
        } catch {
          // If API call fails, use default 'your business'
        }
      }
      apologyMessage += `${businessName}`;
      try {
        await sgMail.send({
          to: fromEmail,
          from: `${businessName} <no-reply@${process.env.SENDGRID_DOMAIN}>`,
          subject: `Appointment slot no longer available`,
          text: apologyMessage,
        });
        console.log(`Sent apology email to ${fromEmail} (slot already filled).`);
      } catch (err) {
        console.error('Failed to send apology email:', err);
      }
      return;
    }
    // Verify confirmation phrase in the reply
    console.log('📝 Raw body text:', bodyText);
console.log('📝 Lowercased:', bodyText?.toLowerCase());
console.log('✅ Contains confirmation?', bodyText?.toLowerCase().includes('i will take it'));

    if (!bodyText || bodyText.toLowerCase().includes('i will take it') === false) {
      console.log(`Email from ${fromEmail} does not contain the confirmation phrase. Ignoring.`);
      return;
    }
    // Mark slot as taken
    campaign.filled = true;
    this.activeCampaigns.set(campaignId, campaign);
    const winner = campaign.recipients.find(r => r.email && r.email.toLowerCase() === normalizedFrom);
    if (!winner) {
      console.error('Winner not found in campaign recipient list (email).');
      return;
    }
    console.log(`🎉 Client ${winner.email} responded first for campaign ${campaignId}. Booking appointment...`);
    // Determine businessName for confirmation messages
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
    } catch {
      // use default if fails
    }
    try {
      // Book the appointment for the winner
      if (campaign.provider === 'acuity') {
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
      // Update user metrics for successful replacement
      await this.prisma.user.update({
        where: { id: campaign.userId },
        data: {
          totalReplacements: { increment: 1 },
          lastReplacementAt: new Date(),
        },
      });
      // Send confirmation to the winner
      const firstName = winner.name ? winner.name.split(' ')[0] : '';
      const confirmationMsg = `Hello${firstName ? ' ' + firstName : ''},\n\n` +
        `Good news! Your appointment on ${campaign.slotTime.toLocaleString()} at ${businessName} has been confirmed. ` +
        `Thank you for taking the open slot. We look forward to seeing you!\n\n` +
        `${businessName}`;
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
      // Notify the client that the slot could not be booked
      const firstName = winner && winner.name ? winner.name.split(' ')[0] : '';
      const failMsg = `Hello${firstName ? ' ' + firstName : ''},\n\n` +
        `We received your response for the open appointment slot on ${campaign.slotTime.toLocaleString()}, but unfortunately we were unable to book it because it was no longer available. ` +
        `We apologize for the inconvenience.\n\n` +
        `${businessName}`;
      try {
        await sgMail.send({
          to: fromEmail,
          from: `${businessName} <no-reply@${process.env.SENDGRID_DOMAIN}>`,
          subject: `Appointment not available`,
          text: failMsg,
        });
      } catch { /* ignore */ }
      if (winner && winner.phone) {
        try {
          await this.twilioClient.messages.create({
            to: winner.phone,
            from: process.env.TWILIO_FROM_NUMBER,
            body: `${businessName}: We received your response, but that ${campaign.slotTime.toLocaleString()} slot was already taken. Sorry for the inconvenience.`,
          });
        } catch { /* ignore */ }
      }
      // Mark campaign as filled to stop further notifications
      campaign.filled = true;
      this.activeCampaigns.set(campaignId, campaign);
    }
  }

  // Handle an incoming SMS reply from a client
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
      // Slot already taken, send apology via SMS
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
    // Only proceed if the SMS exactly matches the confirmation phrase
    if (!messageText || messageText.trim().toLowerCase() !== 'i will take it') {
      console.log(`SMS from ${fromPhone} does not match confirmation phrase. Ignoring.`);
      return;
    }
    // Mark slot as taken by this responder
    campaign.filled = true;
    this.activeCampaigns.set(campaignId, campaign);
    const winner = campaign.recipients.find(r => r.phone === fromPhone);
    if (!winner) {
      console.error('Winner not found in campaign recipient list (SMS).');
      return;
    }
    console.log(`🎉 Client ${fromPhone} responded first via SMS for campaign ${campaignId}. Booking appointment...`);
    // Determine businessName for confirmation communications
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
    } catch { /* ignore errors */ }
    try {
      // Book the appointment for the SMS winner
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
            email: winner.email || `${fromPhone}@example.com`,
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
      // Update metrics for successful replacement
      await this.prisma.user.update({
        where: { id: campaign.userId },
        data: {
          totalReplacements: { increment: 1 },
          lastReplacementAt: new Date(),
        },
      });
      // Send confirmation to the winner (SMS and email if available)
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
      // Notify the client that the slot was not available
      try {
        await this.twilioClient.messages.create({
          to: fromPhone,
          from: process.env.TWILIO_FROM_NUMBER,
          body: `${businessName}: We received your response, but that ${campaign.slotTime.toLocaleString()} slot was no longer available. Sorry for the inconvenience.`,
        });
      } catch { /* ignore */ }
      if (winner && winner.email) {
        const firstName = winner.name.split(' ')[0];
        try {
          await sgMail.send({
            to: winner.email,
            from: `${businessName} <no-reply@${process.env.SENDGRID_DOMAIN}>`,
            subject: `Appointment not available`,
            text: `Hello ${firstName},\n\nWe received your response for the open slot on ${campaign.slotTime.toLocaleString()}, but unfortunately it was no longer available. We apologize for the inconvenience.\n\n${businessName}`,
          });
        } catch { /* ignore */ }
      }
      // Mark campaign as filled to prevent further notifications
      campaign.filled = true;
      this.activeCampaigns.set(campaignId, campaign);
    }
  }
}
