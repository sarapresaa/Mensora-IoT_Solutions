import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { DocsService } from './docs.service';
import * as fs from 'fs';

@ApiTags('docs')
@Controller('docs')
export class DocsController {
  constructor(private readonly DocsService: DocsService) {}

  @Get('pdf')
  async getPdf(@Res() res: Response) {
    try {
      // Gera o PDF e retorna o caminho
      const pdfPath = await this.DocsService.generatePdf();

      // Verifica se o PDF existe
      if (!fs.existsSync(pdfPath)) {
        return res.status(500).json({
          message: 'PDF não foi gerado',
        });
      }

      // Define cabeçalhos
      res.setHeader('Content-Disposition', 'attachment; filename=api-docs.pdf');
      res.setHeader('Content-Type', 'application/pdf');

      // Envia o ficheiro
      return res.download(pdfPath, 'api-docs.pdf');
    } catch (err) {
      console.error('PDF ERROR:', err);
      return res.status(500).json({
        message: 'Erro ao gerar PDF',
        error: err?.message || err,
      });
    }
  }
}