import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Automation } from './automation.entity';
import { Device } from './device.entity';
import { Scenary } from './scenary.entity';
import { Automation_Target_Timer } from './automation_target_time.entity';

@Entity()
export class Automation_Target {
  @PrimaryGeneratedColumn()
  target_id: number;

  @ManyToOne(() => Automation, (automation) => automation.targets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'automation_id' })
  automation: Automation;

  @Column({
    type: 'enum',
    enum: ['device', 'scenary'],
  })
  target_type: 'device' | 'scenary';

  @ManyToOne(() => Device, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device?: Device;

  @ManyToOne(() => Scenary, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scenary_id' })
  scenary?: Scenary;

  @OneToMany(() => Automation_Target_Timer, (att) => att.target)
  timer: Automation_Target_Timer[];
}
