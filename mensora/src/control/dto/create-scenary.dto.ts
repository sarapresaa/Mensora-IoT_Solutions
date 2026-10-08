import { ApiProperty } from '@nestjs/swagger';

export class CreateScenaryDto {
  @ApiProperty({
    description: 'Id do utilizador',
    example: '1'
  })
  user_id: number;

  @ApiProperty({
    description: 'Nome do cenário',
    example: 'Jardim'
  })
  scenary_name: string;

  @ApiProperty({
    description: 'Descrição de cenário',
    example: 'O meu jardim'
  })
  scenary_description?: string;

  @ApiProperty({
    description: 'Estado do cenário',
    example: 'active'
  })
  scenary_state?: 'active' | 'inactive';
}
