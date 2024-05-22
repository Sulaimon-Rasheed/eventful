import { Module } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { AdminsController } from './admins.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { adminSchema } from './admins.model';
import { adminVerificationSchema } from './adminVerification.model';
import { MailerService } from 'src/mailer/mailer.service';
import { AuthService } from 'src/auth/auth.service';
import { creatorSchema } from 'src/creators/creators.model';
import { walletSchema } from 'src/wallets/wallets.model';
import { eventeeSchema } from 'src/eventees/eventees.model';
import { eventSchema } from 'src/events/events.model';
import { transactionSchema } from 'src/transactions/transactions.model';

@Module({
  imports:[MongooseModule.forFeature([
    {name:"Admin", schema:adminSchema}, 
    {name:"AdminVerification", schema:adminVerificationSchema}, 
    {name:"Creator", schema:creatorSchema}, 
    {name:"Wallet", schema:walletSchema},
    {name:"Eventee", schema:eventeeSchema},
    {name:"Event", schema:eventSchema},
    {name:"Transaction", schema:transactionSchema},
  ])],
  controllers: [AdminsController],
  providers: [AdminsService, MailerService, AuthService],
})
export class AdminsModule {}
