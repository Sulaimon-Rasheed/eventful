import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { walletSchema } from './wallets.model';
import { creatorSchema } from 'src/creators/creators.model';
import { creatorVerificationSchema } from 'src/creators/verifiedCreators.model';


@Module({
    imports:[MongooseModule.forFeature([{name:"Wallet", schema:walletSchema}, {name:"Creator", schema:creatorSchema}, {name:"CreatorVerification", schema:creatorVerificationSchema}])],
    controllers: [],
    providers: [],
  })
  export class WalletsModule {}