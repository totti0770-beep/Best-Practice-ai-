import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Or } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
  ) {}

  async create(data: Partial<Notification>): Promise<Notification> {
    return this.notifRepo.save(this.notifRepo.create(data));
  }

  async findForUser(userId: string, role: string, hospitalId: string) {
    return this.notifRepo.find({
      where: [
        { userId, isRead: false },
        { hospitalId, targetRole: role, isRead: false },
      ],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.notifRepo.update({ id }, { isRead: true, readAt: new Date() });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifRepo.update({ userId, isRead: false }, { isRead: true, readAt: new Date() });
  }
}
