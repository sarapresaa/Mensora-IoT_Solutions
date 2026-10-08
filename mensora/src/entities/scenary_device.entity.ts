import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Scenary } from './scenary.entity';
import { Device } from './device.entity';

@Entity({ name: 'Scenary_Device' })
export class ScenaryDevice {
  @PrimaryColumn()
  scenary_id: number;

  @PrimaryColumn()
  device_id: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ManyToOne(() => Scenary, (scenary) => scenary.scenaryDevices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scenary_id' })
  scenary: Scenary;

  @ManyToOne(() => Device, (device) => device.scenaryDevices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'device_id' })
  device: Device;
}
