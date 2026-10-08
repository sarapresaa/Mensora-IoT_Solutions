import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Api } from '../api/api';
import { AuthService } from '../../auth/auth.service';
import { TranslationService } from '../services/translation.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email = '';
  password = '';
  showPassword = false;
  rememberMe = false;

  isDarkMode = signal(true);
  selectedLanguage = signal<'pt' | 'en'>('pt');

  // Toast notification properties
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'warning' = 'success';
  isEnglish(): boolean {
    return this.selectedLanguage() === 'en';
  }

  constructor(
    private router: Router,
    private api: Api,
    private authService: AuthService,
    public translate: TranslationService,
  ) {
    this.translate.language$.subscribe(lang => {
      this.selectedLanguage.set(lang);
    });
  }

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

  showNotification(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 4000);
  }

  onLogin() {
    if (!this.email.trim() || !this.password) {
      this.showNotification(this.translate.t('fillFields'), 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.showNotification(this.translate.t('validEmail'), 'error');
      return;
    }

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.showNotification('Login efetuado com sucesso', 'success');
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 1000);
      },
      error: (err) => {
        this.showNotification(err.message || this.translate.t('invalidCred'), 'error');
      }
    });
  }
}
