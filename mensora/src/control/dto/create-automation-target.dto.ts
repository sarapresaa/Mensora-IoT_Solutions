import { ApiProperty } from '@nestjs/swagger';

export class CreateAutomationTargetDto {

  @ApiProperty({
    description: 'Id da automação',
    example: '1'
  })
  automation_id: number;

  @ApiProperty({
    description: 'Tipo de alvo para automação',
    example: 'device'
  })
  target_type: 'device' | 'scenary';

  @ApiProperty({
    description: 'id do dispositivos',
    example: '1'
  })
  device_id?: number;

@ApiProperty({
    description: 'id do cenário',
    example: '1'
  })
  scenary_id?: number;
}
