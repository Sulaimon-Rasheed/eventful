import mongoose, {Schema} from "mongoose"
import {DateTime} from "luxon"
export const walletSchema = new Schema({
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true },
    balance: { type: Number, default: 0 },
    currency: { type: String, required: true },
    transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
    createdAt: { type: String, default:DateTime.now().toFormat('LLL d, yyyy \'at\' HH:mm') },
    updatedAt: { type: String, default:DateTime.now().toFormat('LLL d, yyyy \'at\' HH:mm') },
    status: { type: String, enum: ['active', 'suspended', 'closed'], default: 'active' },
})


export interface Wallet extends mongoose.Document{
   creatorId:object
   balance:number
   currency:string
   transactions:object[]
   createdAt:string
   updatedAt:string
   status:string
}
