export interface CustomTimer {
  id?: number;
  name: string;
  schedule: string;
  status: 'Ativo' | 'Inativo';
}
