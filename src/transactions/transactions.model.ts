import mongoose, {Schema} from "mongoose"
import {DateTime} from "luxon"
export const transactionSchema = new Schema({
    amount: { type: String, required:true},
    status:{type:String, default:"pending", enum:["pending", "success", "failed"]},
    type:{type:String, default:"undefined", enum:["credit", "debit"]},
    created_date:{type:String, default:DateTime.now().toFormat('LLL d, yyyy \'at\' HH:mm')},
    eventId:{type:Schema.Types.ObjectId, ref:"Event"},
    eventeeId:{type:Schema.Types.ObjectId, ref:"Eventee"}, 
    creatorId:{type:Schema.Types.ObjectId, ref:"Creator"}, 
})


export interface Transaction extends mongoose.Document{
    amount:string
    status:string
    type:string
    created_date:string 
    eventeeId:string
    eventId:string
    creatorId:string
}
