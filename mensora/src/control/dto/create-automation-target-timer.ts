import { ApiProperty } from '@nestjs/swagger';

export class CreateAutomationTargetTimerDto {
    @ApiProperty({
    description: 'Id do alvo',
    example: '1'
    })
    target_id?: number;

    @ApiProperty({
    description: 'Id do temporizador',
    example: '1'
    })
    timer_id?: number;

    @ApiProperty({
    description: 'Id do dispositivo',
    example: '1'
    })
    device_id?: number;
}
