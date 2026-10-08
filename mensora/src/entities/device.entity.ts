import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn
} from 'typeorm';
import { User } from './user.entity';
import { ConsumptionHistory } from './consumption_history.entity';
import { ScenaryDevice } from './scenary_device.entity';

@Entity({ name: 'Device' })
export class Device {
  @PrimaryGeneratedColumn()
  device_id: number;

  @ManyToOne(() => User, (user) => user.devices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 100, nullable: true })
  device_name: string;

  @Column({ length: 45, nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  device_description: string;

  @Column({ length: 150, nullable: true })
  location: string;

  @Column({ default: false })
  device_state: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  current_consumption: number;

  @Column({ type: 'int', default: 0 })
  total_operating_time: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_consumption: number;

  @Column({ type: 'text', nullable: true })
  device_type: string;

  @OneToMany(() => ConsumptionHistory, (history) => history.device)
  history: ConsumptionHistory[];

  @OneToMany(() => ScenaryDevice, (sd) => sd.device)
  scenaryDevices: ScenaryDevice[];
}
