import { Module } from '@nestjs/common';
import { EventeesService } from './eventees.service';
import { EventeesController } from './eventees.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { eventeeSchema } from './eventees.model';
import { walletSchema } from 'src/wallets/wallets.model';
import { eventeeVerificationSchema } from './verifiedEventee.model';
import { MailerService } from 'src/mailer/mailer.service';
import { AuthService } from 'src/auth/auth.service';
import { EventsModule } from 'src/events/events.module';
import { eventSchema } from 'src/events/events.model';
import { creatorSchema } from 'src/creators/creators.model';
import { EventsController } from 'src/events/events.controller';
import { EventsService } from 'src/events/events.service';
import { transactionSchema } from 'src/transactions/transactions.model';
import { ConfigService } from '@nestjs/config';
import { CronService } from 'src/cron/cron.service';
import { CacheService } from 'src/cache/cache.service';

@Module({
  imports:[EventsModule, MongooseModule.forFeature([{name:"Eventee", schema:eventeeSchema},{name:"EventeeVerification", schema:eventeeVerificationSchema}, {name:"Event", schema:eventSchema},{name:"Creator", schema:creatorSchema}, {name:"Transaction", schema:transactionSchema}, {name:"Wallet", schema:walletSchema}]),
],
  controllers: [EventeesController, EventsController],
  providers: [EventeesService, MailerService, AuthService, EventsService, ConfigService, CronService, CacheService],
})
export class EventeesModule {}
