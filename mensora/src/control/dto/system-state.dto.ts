import { ApiProperty } from '@nestjs/swagger';

export class SystemStateDto {
  @ApiProperty({
    description: 'Estado do sistema',
    example: '1'
  })
  active: boolean;

  @ApiProperty({
    description: 'Modo do sistema',
    example: 'basic'
  })
  mode?: string;
}
