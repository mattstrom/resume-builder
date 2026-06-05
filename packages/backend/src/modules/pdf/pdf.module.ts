import { Module } from '@nestjs/common';

import { PdfController } from './pdf.controller.js';

@Module({
	controllers: [PdfController],
})
export class PdfModule {}
