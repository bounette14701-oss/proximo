import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Module global : EmailService injectable partout sans ré-import.
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
