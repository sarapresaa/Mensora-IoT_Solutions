import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Automation_Target } from './automation_target.entity';

@Entity()
export class Automation_Target_Timer {
  @PrimaryGeneratedColumn()
  att_id: number;

  @ManyToOne(() => Automation_Target, (target) => target.timer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_id' })
  target: Automation_Target;
  
  @Column({ type: 'int', nullable: true })
  timer_id: number;

  @Column({ type: 'int', nullable: true })
  device_id: number;
}
