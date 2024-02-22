import {IsNotEmpty, IsString } from "class-validator";

export class newPasswordDto {
    @IsString()
    @IsNotEmpty()
    newPassword:string   
}