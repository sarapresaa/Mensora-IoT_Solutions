import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { Automation_Target } from './entities/automation_target.entity';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NetworkModule } from './network/network.module';
import { ControlModule } from './control/control.module';
import { DiscoverIotService } from './discover_iot/discover_iot.service';
import { ShellyModule } from './shelly/shelly.module';
import { UserService } from './user/user.service';
import { UserController } from './user/user.controller';
import { AuthModule } from './auth/auth.module';
import { DocsModule } from './docs/docs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      database: 'mensora',
      username: 'mensora',
      password: process.env.DB_PASSWORD,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User, Automation_Target]),
    NetworkModule,
    ShellyModule,
    ControlModule,
    AuthModule,
    DocsModule,
  ],
  controllers: [AppController, UserController],
  providers: [AppService, DiscoverIotService, UserService],
})
export class AppModule {}
