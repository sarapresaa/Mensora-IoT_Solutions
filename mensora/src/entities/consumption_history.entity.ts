import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Device } from './device.entity';

@Entity({ name: 'Consumption_History' })
export class ConsumptionHistory {
  @PrimaryGeneratedColumn()
  history_id: number;

  @ManyToOne(() => Device, (device) => device.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  register_date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  consumption: number;

  @Column({ type: 'int' })
  operating_time: number;
}
