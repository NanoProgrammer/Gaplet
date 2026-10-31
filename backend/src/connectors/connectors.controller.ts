import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ConnectorsService } from './connectors.service';

class SettingsDto {
  @IsOptional() @IsString() @MaxLength(80) businessName?: string;
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
  @IsOptional() @IsString() @MaxLength(500) callbackUrl?: string;
}
class IcsDto extends SettingsDto { @IsString() @IsNotEmpty() @MaxLength(2000) url: string; }
class CsvDto { @IsString() @IsNotEmpty() csv: string; }
class CalendarDto { @IsString() @IsNotEmpty() @MaxLength(300) calendarId: string; }

const uid = (req: any): string => req.user.id;

@Controller('connectors')
@UseGuards(AuthGuard('jwt'))
export class ConnectorsController {
  constructor(private readonly svc: ConnectorsService) {}

  @Get('status') status(@Req() req: any) { return this.svc.status(uid(req)); }
  @Post('webhook/setup') setupWebhook(@Req() req: any, @Body() dto: SettingsDto) { return this.svc.setupWebhook(uid(req), dto); }
  @Post('ics') setupIcs(@Req() req: any, @Body() dto: IcsDto) { const { url, ...s } = dto; return this.svc.setupIcs(uid(req), url, s); }
  @Patch('settings') settings(@Req() req: any, @Body() dto: SettingsDto) { return this.svc.updateSettings(uid(req), dto); }
  @Get('google/calendars') calendars(@Req() req: any) { return this.svc.listGoogleCalendars(uid(req)); }
  @Post('google/calendar') calendar(@Req() req: any, @Body() dto: CalendarDto) { return this.svc.selectGoogleCalendar(uid(req), dto.calendarId); }
  @Post('clients/import') importClients(@Req() req: any, @Body() dto: CsvDto) { return this.svc.importClients(uid(req), dto.csv); }
  @Get('clients') clients(@Req() req: any, @Query('take') take?: string, @Query('skip') skip?: string) { return this.svc.listClients(uid(req), Number(take) || 50, Number(skip) || 0); }
  @Delete('clients') clearClients(@Req() req: any) { return this.svc.clearClients(uid(req)); }
  @Delete() disconnect(@Req() req: any) { return this.svc.disconnect(uid(req)); }
}

/** Public endpoint called by Zapier / Make / any system. The secret token in the URL is the credential. */
@Controller('hooks')
export class InboundHooksController {
  constructor(private readonly svc: ConnectorsService) {}

  @Post('inbound/:token')
  @HttpCode(200)
  inbound(@Param('token') token: string, @Body() body: any) { return this.svc.handleInbound(token, body); }
}
