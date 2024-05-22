import * as mongoose from "mongoose"

const Schema = mongoose.Schema

export const adminVerificationSchema = new Schema({
    adminId: { type: String},
    uniqueString:{type: String},
    creation_date: { type: Date},
    expiring_date:{type:Date},
})

export interface AdminVerification extends mongoose.Document{
    id:string
    adminId:string
    uniqueString:string
    creation_date:Date
    expiring_date:Date
    
}