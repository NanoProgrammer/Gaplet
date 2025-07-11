import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaManagerService } from 'src/prisma-manager/prisma-manager.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaManagerService) {}
  // user.service.ts
  async updateUserRole(userId: string, newRole: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });
    delete updatedUser.password; // Remove password from the response
    return updatedUser;
  }
}
