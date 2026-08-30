import { Module } from '@nestjs/common';
import { AdminProvisionsController } from './admin-provisions.controller';
import { CommerceController } from './commerce.controller';
import { CommerceService } from './commerce.service';

@Module({
  controllers: [CommerceController, AdminProvisionsController],
  providers: [CommerceService],
})
export class CommerceModule {}
