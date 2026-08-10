import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hospital } from './entities/hospital.entity';

@Injectable()
export class HospitalsService {
  constructor(
    @InjectRepository(Hospital)
    private readonly hospitalRepo: Repository<Hospital>,
  ) {}

  async findAll(): Promise<Hospital[]> {
    return this.hospitalRepo.find({ where: { isActive: true } });
  }

  async findOne(id: string): Promise<Hospital> {
    const hospital = await this.hospitalRepo.findOne({ where: { id } });
    if (!hospital) throw new NotFoundException('المستشفى غير موجود');
    return hospital;
  }

  async create(data: Partial<Hospital>): Promise<Hospital> {
    const hospital = this.hospitalRepo.create(data);
    return this.hospitalRepo.save(hospital);
  }

  async update(id: string, data: Partial<Hospital>): Promise<Hospital> {
    await this.findOne(id);
    await this.hospitalRepo.update(id, data);
    return this.findOne(id);
  }

  async deactivate(id: string): Promise<void> {
    await this.findOne(id);
    await this.hospitalRepo.update(id, { isActive: false });
  }
}
