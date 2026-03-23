import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Appointment } from '../entities/appointment.entity';

@Injectable()
export class AppointmentsRepository extends Repository<Appointment> {
  constructor(private dataSource: DataSource) {
    super(Appointment, dataSource.createEntityManager());
  }

  /**
   * Add custom repository methods here instead of cluttering the Service
   */
  async findWithDetails(id: string): Promise<Appointment | null> {
    return this.findOne({
      where: { id },
      relations: [
        'slot',
        'doctor',
        'doctor.user',
        'doctor.user.profile',
        'patient',
        'patient.profile',
        'auditLogs',
      ],
    });
  }
}
