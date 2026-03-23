export class BookingCreatedEvent {
  constructor(
    public readonly appointmentId: string,
    public readonly patientId: string,
    public readonly doctorId: string,
    public readonly slotId: string,
  ) {}
}
