import { Routes } from '@angular/router';
import { ControlHubComponent } from './control-hub/control-hub.component';
import { Login } from './login/login';
import { Register } from './register/register';
import { Users } from './user/user.component';
import { AuthGuard } from '../auth/auth.guard';

export const routes: Routes = [
  { path: '', component: ControlHubComponent, pathMatch: 'full', canActivate: [AuthGuard], title: 'Mensora' },
  { path: 'hub', redirectTo: '', pathMatch: 'full' },
  { path: 'login', component: Login, title: 'Login' },
  { path: 'register', component: Register, title: 'Criar Conta' },
  { path: 'users', component: Users, title: 'List of Users' },
  { path: '**', redirectTo: '' }
];
