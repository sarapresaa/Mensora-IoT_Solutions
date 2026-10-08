import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Api } from '../../../api/api';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-settings-card',
  standalone: true,
  imports: [CommonModule, FormsModule,],
  templateUrl: './settings-card.html',
  styleUrls: ['./settings-card.css']
})
export class SettingsCardComponent implements OnChanges {
  @Input() open = false;
  @Input() user: any;

  @Output() close = new EventEmitter<void>();

  name = '';
  currentPassword = '';
  showCurrentPassword = false;
  isCurrentPasswordValid = false;
  isCurrentPasswordInvalid = false;
  isVerifyingPassword = false;
  password = '';
  showPassword = false;
  confirmPassword = '';
  showConfirmPassword = false;
  showConfirmModal = false;
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'warning' = 'success';

  loadingUser = false;

  constructor(
    private api: Api,
    public translate: TranslationService
  ) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['user']?.currentValue) {
      this.name = this.user.username;
    }
  }

  toggleCurrentPassword() {
    this.showCurrentPassword = !this.showCurrentPassword;
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

  verifyCurrentPassword() {
    if (!this.currentPassword || this.currentPassword.length < 6) {
      this.showNotification('Insira a palavra-passe atual', 'error');
      this.isCurrentPasswordValid = false;
      this.isCurrentPasswordInvalid = true;
      return;
    }

    if (!this.user?.email) {
      this.showNotification('Erro ao obter email do utilizador', 'error');
      return;
    }

    this.isVerifyingPassword = true;

    // Use the login endpoint to verify password - this will hash the password and compare with DB
    this.api.login({ user_email: this.user.email, user_password: this.currentPassword }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.isCurrentPasswordValid = true;
          this.isCurrentPasswordInvalid = false;
          this.showNotification('Palavra-passe verificada com sucesso', 'success');
        } else {
          this.isCurrentPasswordValid = false;
          this.isCurrentPasswordInvalid = true;
          this.showNotification('Palavra-passe incorreta', 'error');
        }
        this.isVerifyingPassword = false;
      },
      error: (err) => {
        console.error('Error verifying password', err);
        this.isCurrentPasswordValid = false;
        this.isCurrentPasswordInvalid = true;
        this.isVerifyingPassword = false;
        this.showNotification('Palavra-passe incorreta', 'error');
      }
    });
  }

  onCurrentPasswordChange() {
    this.isCurrentPasswordValid = false;
    this.isCurrentPasswordInvalid = false;
    this.password = '';
    this.confirmPassword = '';
  }

  onSave() {
    const payload: any = {};

    const newName = this.name?.trim();
    if (!newName) {
      this.showNotification(this.translate.t('nameRequired'), 'error');
      return;
    }

    if (newName !== this.user.username) {
      payload.username = newName;
    }

    if (this.password || this.confirmPassword) {
      if (!this.isCurrentPasswordValid) {
        this.showNotification('Verifique a palavra-passe atual primeiro', 'error');
        return;
      }

      if (!this.password || !this.confirmPassword) {
        this.showNotification(this.translate.t('samePassword'), 'error');
        return;
      }

      if (this.password.length < 6) {
        this.showNotification(this.translate.t('validPassword'), 'error');
        return;
      }

      if (this.password !== this.confirmPassword) {
        this.showNotification(this.translate.t('samePassword'), 'error');
        return;
      }

      this.showConfirmModal = true;
      return;
    }

    if (Object.keys(payload).length === 0) {
      this.showNotification(this.translate.t('nothingToUpdate'), 'warning');
      return;
    }

    this.performUpdate(payload);
  }

  confirmPasswordChange() {
    const payload: any = {};

    const newName = this.name?.trim();
    if (newName !== this.user.username) {
      payload.username = newName;
    }

    payload.user_password = this.password;

    this.showConfirmModal = false;
    this.performUpdate(payload);
  }

  cancelPasswordChange() {
    this.showConfirmModal = false;
  }

  performUpdate(payload: any) {
    this.api.updateMe(this.user.id, payload).subscribe({
      next: (res) => {
        console.log('Update success', res);
        this.showNotification(this.translate.t('profileUpdated'), 'success');
        setTimeout(() => {
          this.resetForm();
          this.close.emit();
        }, 1500);
      },
      error: (err) => {
        console.error('Update failed', err);
        this.showNotification(err.error?.message || this.translate.t('updateError'), 'error');
      }
    });
  }

  onCancel() {
    this.resetForm();
    this.close.emit();
  }

  private resetForm() {
    this.name = '';
    this.currentPassword = '';
    this.showCurrentPassword = false;
    this.isCurrentPasswordValid = false;
    this.isCurrentPasswordInvalid = false;
    this.isVerifyingPassword = false;
    this.password = '';
    this.showPassword = false;
    this.confirmPassword = '';
    this.showConfirmPassword = false;
    this.showConfirmModal = false;
  }
}
