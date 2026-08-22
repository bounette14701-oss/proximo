import { Module } from '@nestjs/common';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

/**
 * Installation initiale : vérifie si l'installation est requise et
 * crée l'administrateur + la résidence au premier lancement.
 */
@Module({
  controllers: [SetupController],
  providers: [SetupService],
})
export class SetupModule {}
