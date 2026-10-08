import { Injectable } from '@nestjs/common';
import { Repository, DeleteResult } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) { }

  async create(user: User): Promise<User> {
    return await this.userRepository.save(user);
  }

  async readAll(): Promise<User[]> {
    return await this.userRepository.find();
  }

  async update(user: User): Promise<User> {
    await this.userRepository.update(user.user_id, user);

    const updatedUser = await this.userRepository.findOneBy({
      user_id: user.user_id,
    });
    if (!updatedUser) {
      throw new Error(`User with id ${user.user_id} not found after update`);
    }

    return updatedUser;
  }

  async updateMe(
    userId: number,
    body: { username?: string; user_password?: string; preferred_language?: 'pt-PT' | 'en-US'; }
  ): Promise<User> {

    const updateData: Partial<User> = {};

    if (body.username) {
      updateData.username = body.username;
    }

    if (body.user_password) {
      const hashedPassword = await bcrypt.hash(body.user_password, 10);
      updateData.user_password = hashedPassword;
    }

    if(body.preferred_language){
      updateData.preferred_language = body.preferred_language;
    }

    await this.userRepository.update({ user_id: userId }, updateData);

    const updatedUser = await this.userRepository.findOneBy({ user_id: userId });
    if (!updatedUser) {
      throw new Error(`User with id ${userId} not found after update`);
    }

    return updatedUser;
  }


  async delete(id): Promise<DeleteResult> {
    return await this.userRepository.delete(id);
  }

  async createUser(username: string, user_email: string, user_password: string): Promise<User> {
    const hashed = await bcrypt.hash(user_password, 10);
    const user = this.userRepository.create({ username, user_email, user_password: hashed });
    return this.userRepository.save(user);
  }

  async findOneByEmail(email: string): Promise<User | undefined> {
    return (await this.userRepository.findOne({ where: { user_email: email } })) ?? undefined;
  }

  async findById(user_id: number): Promise<User | undefined> {
    return (await this.userRepository.findOne({ where: { user_id: user_id } })) ?? undefined;
  }

  async validateUser(user_email: string, user_password: string): Promise<User | undefined> {
    const user = await this.findOneByEmail(user_email);

    if (!user) {
      console.log('Usuário não encontrado:', user_email);
      return undefined;
    }

    if (!user.user_password) {
      console.log('Usuário sem password:', user_email);
      return undefined;
    }

    const match = await bcrypt.compare(user_password, user.user_password);
    if (!match) return undefined;

    return user;
  }

}
