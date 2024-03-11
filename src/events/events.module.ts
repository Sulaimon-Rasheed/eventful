import { Module} from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { eventSchema } from './events.model';
import { AuthService } from 'src/auth/auth.service';
import { MailerService } from 'src/mailer/mailer.service';
import { CreatorsService } from 'src/creators/creators.service';
import { creatorSchema } from 'src/creators/creators.model';
import { creatorVerificationSchema } from 'src/creators/verifiedCreators.model';
import { eventeeSchema } from 'src/eventees/eventees.model';
import { walletSchema } from 'src/wallets/wallets.model';
import { EventeesController } from 'src/eventees/eventees.controller';
import { EventeesService } from 'src/eventees/eventees.service';
import { eventeeVerificationSchema } from 'src/eventees/verifiedEventee.model';
import { transactionSchema } from 'src/transactions/transactions.model';
import { ConfigService } from '@nestjs/config';
import { CronService } from 'src/cron/cron.service';
import { CacheService } from 'src/cache/cache.service';

@Module({
  imports:[MongooseModule.forFeature([{name:"Event", schema:eventSchema}, {name:"Creator", schema:creatorSchema}, {name:"CreatorVerification", schema:creatorVerificationSchema}, {name:"Eventee", schema:eventeeSchema}, {name:"EventeeVerification", schema:eventeeVerificationSchema}, {name:"Transaction", schema:transactionSchema}, {name:"Wallet", schema:walletSchema}]),
],
  controllers: [EventsController, EventeesController],
  providers: [EventsService, AuthService, MailerService,  CreatorsService, EventeesService,ConfigService, CronService, CacheService],
})
export class EventsModule {}
