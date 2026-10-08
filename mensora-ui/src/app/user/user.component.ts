import { Api } from '../api/api';
import { Component, OnInit } from '@angular/core';
import { User } from './user.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css'],
})
export class Users implements OnInit {

  displayedColumns: string[] = [
    'user_id',
    'username',
    'user_email',
    'user_password',
    'register_date',
    'preferred_language',
    'interface_mode',
    'user_admin'
  ];

  dataSource: User[] = [];
  user: User = {} as User;

  constructor(private api: Api) {}

  ngOnInit() {
    this.refreshUsers();
  }

  refreshUsers() {
    this.api.readUsers().subscribe((result: User[]) => {
      this.dataSource = result;
    });
  }

  selectUser(user: User) {
    this.user = { ...user };
  }

  newUser() {
    this.user = {} as User;
  }

  createUser(f: any) {
    this.api.createUser(f.value).subscribe((result: User) => {
      this.dataSource = [...this.dataSource, result];
      this.newUser();
      f.resetForm();
    });
  }

  updateUser(f: any) {
    f.value.user_id = this.user.user_id;
    this.api.updateUser(f.value).subscribe((updatedUser: User) => {
      this.dataSource = this.dataSource.map(u =>
        u.user_id === updatedUser.user_id ? updatedUser : u
      );
      this.newUser();
      f.resetForm();
    });
  }


  deleteUser(id: number) {
    this.api.deleteUser(id).subscribe(() => {
      this.dataSource = this.dataSource.filter(u => u.user_id !== id);
    });
  }
}
