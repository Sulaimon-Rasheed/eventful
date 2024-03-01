import { Module, forwardRef } from '@nestjs/common';
import { CreatorsService } from './creators.service';
import { CreatorsController } from './creators.controller';
import { MulterModule } from '@nestjs/platform-express';
import { MongooseModule } from '@nestjs/mongoose';
import { creatorSchema } from './creators.model';
import { MailerModule } from 'src/mailer/mailer.module';
import { MailerService } from 'src/mailer/mailer.service';
import { creatorVerificationSchema } from './verifiedCreators.model';
import { AuthService } from 'src/auth/auth.service';
import { EventsModule } from 'src/events/events.module';
import { EventsService } from 'src/events/events.service';
import { EventsController } from 'src/events/events.controller';
import { eventSchema } from 'src/events/events.model';
import mongoose from 'mongoose';
import { EventeesModule } from 'src/eventees/eventees.module';
import { EventeesController } from 'src/eventees/eventees.controller';
import { EventeesService } from 'src/eventees/eventees.service';
import { eventeeSchema } from 'src/eventees/eventees.model';
import { eventeeVerificationSchema } from 'src/eventees/verifiedEventee.model';
import { transactionSchema } from 'src/transactions/transactions.model';
import { SocialmediaService } from 'src/socialmedia/socialmedia.service';
import { Auth0Service } from 'src/auth/auth0.service';
import { ConfigService } from '@nestjs/config';
import { CronService } from 'src/cron/cron.service';
import { CacheService } from 'src/cache/cache.service';
// import { QrcodescannerService } from 'src/qrcodescanner/qrcodescanner.service';
// import { QrcodescannerController } from 'src/qrcodescanner/qrcodescanner.controller';


@Module({
  imports:[EventsModule,EventeesModule,
   MongooseModule.forFeature([{name:"Creator", schema:creatorSchema},{name:"Event", schema:eventSchema},{name:"CreatorVerification", schema:creatorVerificationSchema}, {name:"Eventee", schema:eventeeSchema}, {name:"EventeeVerification", schema:eventeeVerificationSchema}, {name:"Transaction", schema:transactionSchema}]),
  MulterModule.register({dest:"uploads/"})
  ],
  controllers: [CreatorsController, EventsController, EventeesController],
  providers: [CreatorsService, MailerService, AuthService, EventsService, EventeesService, SocialmediaService, Auth0Service, ConfigService, CronService, CacheService],
})
export class CreatorsModule {}
