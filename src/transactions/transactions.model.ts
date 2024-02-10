import mongoose, {Schema} from "mongoose"

export const transactionSchema = new Schema({
    amount: { type: String, required:true},
    status:{type:String, default:"pending", enum:["pending", "success", "failed"]},
    created_date:{type:Date, default:new Date()},
    eventId:{type:Schema.Types.ObjectId, ref:"Event"},
    eventeeId:{type:Schema.Types.ObjectId, ref:"Eventee"}, 
})


export interface Transaction extends mongoose.Document{
    amount:string
    status:string
    created_date:Date 
    eventeeId:string
    eventId:string
}
