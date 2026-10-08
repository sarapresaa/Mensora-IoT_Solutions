import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Device } from './device.entity';
import { Scenary } from './scenary.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  user_id: number;

  @Column({ length: 100 })
  username: string;

  @Column({ length: 150, unique: true })
  user_email: string;

  @Column({ length: 255 })
  user_password: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  register_date: Date;

  @Column({ type: 'enum', enum: ['pt-PT', 'en-US'], default: 'pt-PT' })
  preferred_language: 'pt-PT' | 'en-US';

  @Column({ type: 'enum', enum: ['simple', 'advanced'], default: 'simple' })
  interface_mode: 'simple' | 'advanced';

  @Column({ default: false })
  user_admin: boolean;

  @OneToMany(() => Device, (device) => device.user)
  devices: Device[];

  @OneToMany(() => Scenary, (scenary) => scenary.user)
  scenaries: Scenary[];
}
