import { ApiProperty } from '@nestjs/swagger';

export class CreateAutomationDto {
    @ApiProperty({
    description: 'Nome da automação',
    example: 'RegadorULTRA7XPTO'
  })
  automation_name?: string;

    @ApiProperty({
    description: 'Hora de início',
    example: '12:00'
  })
  start_time?: string | null;

    @ApiProperty({
    description: 'Hora de terminação',
    example: '13:00'
  })
  end_time?: string | null;

    @ApiProperty({
    description: 'Valor de Intervalo Temporal',
    example: '5'
  })
  interval_value?: number;

    @ApiProperty({
    description: 'Unidade de intervalo Temporal',
    example: 'seconds'
  })

  interval_unit?: 'seconds' | 'minutes' | 'hours';

    @ApiProperty({
    description: 'Dias da semana (0-Domingo; 1-Segunda Feira; (...) 6-Sábado;)',
    example: '1,3,4'
  })
  weekday?: string | null;

    @ApiProperty({
    description: 'Ligar automação IFTTT (Aviso: NÃO IMPLEMENTADO)',
    example: 'OFF'
  })
  IFTTT?: 'OFF' | 'ON';

    @ApiProperty({
    description: 'acionação de automação IFTTT (Aviso: NÃO IMPLEMENTADO)',
    example: '6'
  })
  IFTTT_trigger?: number | null;

    @ApiProperty({
    description: 'Ação de automação IFTTT (Aviso: NÃO IMPLEMENTADO)',
    example: 'OFF'
  })
  IFTTT_action?: 'OFF' | 'ON';

    @ApiProperty({
    description: 'Estado de automação',
    example: 'inactive'
  })
  active?: boolean;
}
