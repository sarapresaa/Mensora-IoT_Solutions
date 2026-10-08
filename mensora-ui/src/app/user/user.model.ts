export class User {
    user_id!: number;
    username!: string;
    user_email!: string;
    user_password!: string;
    register_date!: Date;
    preferred_language!: 'pt-PT' | 'en_US';
    interface_mode!: 'simple' | 'advanced';
    user_admin!: boolean;
}
