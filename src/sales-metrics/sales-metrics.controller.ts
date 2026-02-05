import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { jwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SalesService } from './sales-metrics.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('upload-csv')
  @UseGuards(jwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCSV(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.salesService.processCSV(file);

    return {
      success: true,
      message: 'CSV ingested successfully',
      data: {
        insertedRows: result.inserted,
      },
    };
  }
}
