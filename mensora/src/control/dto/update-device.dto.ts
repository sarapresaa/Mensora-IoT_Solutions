import { ApiProperty } from '@nestjs/swagger';

export class UpdateDeviceDto {
  @ApiProperty({
    description: 'Nome do dispositivo',
    example: 'shelly-38huwuje58fhw'
  })
  device_name?: string;

  @ApiProperty({
    description: 'Descrição do dispositivo',
    example: 'active'
  })
  device_description?: string;

  @ApiProperty({
    description: 'Id do cenário',
    example: '1'
  })
  scenary_id?: number;
}
