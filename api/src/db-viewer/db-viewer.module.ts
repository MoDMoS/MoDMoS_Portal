import { Module } from '@nestjs/common';
import { DbViewerController } from './db-viewer.controller';
import { DbViewerService } from './db-viewer.service';

@Module({
  controllers: [DbViewerController],
  providers: [DbViewerService],
})
export class DbViewerModule {}
