import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from 'src/entities/user.entity';
import { ApiResponse } from '@nestjs/swagger';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) { }

  @Get()
  @ApiResponse({ status: 200, description: 'Users returned successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  read(): Promise<User[]> {
    return this.userService.readAll();
  }

  @Post('create')
  @ApiResponse({ status: 201, description: 'User created successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async create(@Body() body: { username: string, user_email: string; user_password: string }): Promise<any> {
    const existing = await this.userService.findOneByEmail(body.user_email);
    if (existing) {
      return { success: false, message: 'Email already in use' };
    }
    const newUser = await this.userService.createUser(
      body.username,
      body.user_email,
      body.user_password,
    );
    return {
      user_id: newUser.user_id,
      username: newUser.username,
      user_email: newUser.user_email,
      register_date: newUser.register_date,
      preferred_language: newUser.preferred_language,
      interface_mode: newUser.interface_mode,
      user_admin: newUser.user_admin,
    };
  }

  @Put(':id/update')
  @ApiResponse({ status: 201, description: 'User updated successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async update(@Param('id') id, @Body() user: User): Promise<any> {
    user.user_id = Number(id);
    return this.userService.update(user);
  }

  @Put('me/:id')
  @ApiResponse({ status: 201, description: 'User created successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  updateMe(@Param('id') id: number, @Body() body: any) {
    return this.userService.updateMe(Number(id), body);
  }

  @Delete(':id/delete')
  @ApiResponse({ status: 201, description: 'User deleted successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async delete(@Param('id') id): Promise<any> {
    return this.userService.delete(id);
  }

  @Post('login')
  @ApiResponse({ status: 201, description: 'User logged in successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async login(@Body() body: { user_email: string; user_password: string }) {

    const user = await this.userService.validateUser(
      body.user_email,
      body.user_password,
    );

    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }

    return {
      success: true,
      message: 'Logged in successfully',
      user: {
        id: user.user_id,
        email: user.user_email,
      },
    };
  }

  @Post('register')
  @ApiResponse({ status: 201, description: 'User registered successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async register(@Body() body: { username: string, user_email: string; user_password: string }) {

    if (!body.username || !body.user_email || !body.user_password) {
      return { success: false, message: 'All fields are required!' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(body.user_email)) {
      return { success: false, message: 'Invalid email' };
    }

    const existing = await this.userService.findOneByEmail(body.user_email);

    if (existing) {
      return {
        success: false,
        message: 'Email already in use',
      };
    }

    const newUser = await this.userService.createUser(
      body.username,
      body.user_email,
      body.user_password,
    );

    return {
      success: true,
      message: 'User created',
      user: {
        id: newUser.user_id,
        email: newUser.user_email,
        username: newUser.username,
      },
    };
  }


}
