import { ApiProperty } from '@nestjs/swagger';

export class CreateDeviceDto {
  @ApiProperty({
    description: 'Id do utilizador',
    example: '1'
  })
  user_id: number;

  @ApiProperty({
    description: 'Nome do dispositivo',
    example: 'shelly-2djfhsc342sh'
  })
  device_name: string;

  @ApiProperty({
    description: 'Descrição do dispositivo',
    example: 'active'
  })
  device_description?: string;

  @ApiProperty({
    description: 'localização do dispositivo',
    example: 'Jardim'
  })
  location?: string;

  @ApiProperty({
    description: 'Id do cenário',
    example: '1'
  })
  scenary_id?: number;

  @ApiProperty({
      description: 'Endereço IP',
      example: '192.168.1.1'
    })
  ip_address?: string;
  
  @ApiProperty({
    description: 'Tipo de dispositivo',
    example: 'Shelly'
  })
  device_type?: string;
}
