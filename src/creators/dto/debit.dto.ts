import {IsNotEmpty, IsString } from "class-validator";

export class debitDto {
    @IsString()
    @IsNotEmpty()
    debit_amount:string   
}