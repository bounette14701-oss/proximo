import { Module } from '@nestjs/common';
import { IncidentsModule } from '../incidents/incidents.module';
import { InvitationsModule } from '../invitations/invitations.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [IncidentsModule, InvitationsModule],
  controllers: [AdminController],
})
export class AdminModule {}
