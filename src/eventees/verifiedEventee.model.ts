import * as mongoose from "mongoose"

const Schema = mongoose.Schema

export const eventeeVerificationSchema = new Schema({
    eventeeId: { type: String},
    uniqueString:{type: String},
    creation_date: { type: Date},
    expiring_date:{type:Date},
})

export interface EventeeVerification{
    creatorId:string
    uniqueString:string
    creation_date:Date
    expiring_date:Date
    
}