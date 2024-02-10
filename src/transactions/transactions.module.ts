import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { transactionSchema } from './transactions.model';
import { eventeeSchema } from 'src/eventees/eventees.model';
import { eventeeVerificationSchema } from 'src/eventees/verifiedEventee.model';

@Module({
  imports:[MongooseModule.forFeature([{name:"Transaction", schema:transactionSchema}, {name:"Eventee", schema:eventeeSchema}, {name:"EventeeVerification", schema:eventeeVerificationSchema}])],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
