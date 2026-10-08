import { ApiProperty } from '@nestjs/swagger';

export class UpdateScenaryStateDto {
  @ApiProperty({
    description: 'Estado do cenário',
    example: 'active'
  })
  scenary_state: 'active' | 'inactive';
}
