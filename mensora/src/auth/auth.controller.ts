import {
  Controller,
  Post,
  Body,
  Session,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { ApiResponse } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private userService: UserService) {}

  @Post('login')
  @ApiResponse({ status: 201, description: 'login successful'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async login(
    @Body() body: { user_email: string; user_password: string },
    @Session() session: Record<string, any>,
  ) {
    const user = await this.authService.validateUser(body.user_email, body.user_password);

    if (!user) {
      return { success: false, message: 'Invalid Credentials' };
    }

    session.userId = user.user_id;

    return {
      success: true,
      message: 'Login successful',
      user: {
        id: user.user_id,
        email: user.user_email,
        user: user.username,
      },
    };
  }

  @Post('logout')
  @ApiResponse({ status: 201, description: 'logout successful'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  logout(@Session() session: Record<string, any>) {
    return new Promise((resolve, reject) => {
      session.destroy(err => {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  }

  @Get('me')
  async me(@Session() session: Record<string, any>) {
    if (!session.userId) return { loggedIn: false };

    const user = await this.userService.findById(session.userId);

    if (!user) return { loggedIn: false };

    return { 
      loggedIn: true, 
      user: {
        id: user.user_id,
        email: user.user_email,
        username: user.username,
        preferred_language: user.preferred_language,
      } 
    };
  }



}
