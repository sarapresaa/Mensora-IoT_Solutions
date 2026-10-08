import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { User } from 'src/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(private userService: UserService) {}

  async validateUser(email: string, password: string): Promise<User | undefined> {
    return await this.userService.validateUser(email, password);
  }
}
