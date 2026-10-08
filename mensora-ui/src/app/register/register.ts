import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Api } from '../api/api';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  name = '';
  email = '';
  password = '';
  showPassword = false;
  confirmPassword = '';
  showConfirmPassword = false;

  isDarkMode = signal(true);

  // Toast notification properties
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'warning' = 'success';

  constructor(
    private router: Router,
    private api: Api,
    public translate: TranslationService,
  ) { }

  toggleDarkMode() {
    this.isDarkMode.set(!this.isDarkMode());
    if (!this.isDarkMode()) {
      document.body.classList.add('darkmode');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.body.classList.remove('darkmode');
      document.documentElement.style.colorScheme = 'light';
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  showNotification(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 4000);
  }

  onRegister() {

    if (!this.name.trim() || !this.email.trim() || !this.password || !this.confirmPassword) {
      this.showNotification('Todos os campos são obrigatórios', 'error');
      return;
    }

    if (this.password.length < 6) {
      this.showNotification(this.translate.t('validPassword'), 'error');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.showNotification('As palavras-passe precisam de ser iguais', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.showNotification('Insira um email válido', 'error');
      return;
    }

    this.api.registerUser({ username: this.name, user_email: this.email, user_password: this.password }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.showNotification('Registo efetuado com sucesso', 'success');
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1500);
        } else {
          this.showNotification(res.message, 'error');
        }
      },
      error: (err) => {
        console.error('Error registering user', err);
        this.showNotification('Algo correu mal, tente novamente', 'error');
      }
    });
  }
}
