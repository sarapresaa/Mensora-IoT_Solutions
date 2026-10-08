import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { Automation_Target } from './automation_target.entity';

@Entity()
export class Automation {
  @PrimaryGeneratedColumn()
  automation_id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  automation_name?: string;

  @Column({ type: 'time', nullable: true, default: null })
  start_time: string | null;

  @Column({ type: 'time', nullable: true, default: null })
  end_time: string | null;

  @Column({ type: 'int', nullable: true })
  interval_value: number;

  @Column({
    type: 'enum',
    enum: ['seconds', 'minutes', 'hours'],
    default: 'seconds',
  })
  interval_unit: 'seconds' | 'minutes' | 'hours';

  @Column({ type: 'varchar', nullable: true })
  weekday: string | null;

  @Column({
  type: 'enum',
  enum: ['OFF', 'ON'],
  default: 'OFF',
  })
  IFTTT: 'OFF' | 'ON';

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  IFTTT_trigger: number | null;

  @Column({
   type: 'enum',
   enum: ['OFF', 'ON'],
   default: 'OFF',
  })
  IFTTT_action: 'OFF' | 'ON';

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => Automation_Target, (automation_target) => automation_target.automation)
  targets: Automation_Target[];
}
