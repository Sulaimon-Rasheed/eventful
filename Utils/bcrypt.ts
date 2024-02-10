import * as bcrypt from "bcrypt"

export async function encodePassword(rawPassword:string){
    let hashedPassword =await bcrypt.hash(rawPassword, 10)
    return hashedPassword 
}

export async function validateEncodedString(password:string, hashedPassword:string){
    let compare = await bcrypt.compare(password, hashedPassword)
    return compare
}