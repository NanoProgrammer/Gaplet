// src/auth/dto/create-user-preference.dto.ts
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class CreateUserPreferenceDto {
  @IsOptional()
  @IsBoolean()
  matchAppointmentType?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  notifyBeforeMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  notifyAfterMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxNotificationsPerGap?: number;
}
