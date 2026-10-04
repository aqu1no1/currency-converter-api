import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LocalizedQueryDto {
  @ApiPropertyOptional({ example: 'en', description: 'Idioma das mensagens (pt-BR ou en)' })
  @IsOptional()
  @IsString()
  lang?: string;
}
