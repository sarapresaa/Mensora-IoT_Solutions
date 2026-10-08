import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ScenaryDevice } from './scenary_device.entity';

@Entity({ name: 'Scenary' })
export class Scenary {
  @PrimaryGeneratedColumn()
  scenary_id: number;

  @ManyToOne(() => User, (user) => user.scenaries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 100, nullable: true })
  scenary_name: string;

  @Column({ type: 'text', nullable: true })
  scenary_description: string;

  @Column({ type: 'enum', enum: ['active', 'inactive'], default: 'inactive' })
  scenary_state: 'active' | 'inactive';

  @OneToMany(() => ScenaryDevice, (sd) => sd.scenary)
  scenaryDevices: ScenaryDevice[];
}
