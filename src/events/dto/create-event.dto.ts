import { IsDate, IsEmpty, IsNotEmpty, IsObject, IsString } from "class-validator";

export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    title:string

    @IsString()
    @IsNotEmpty()
    description:string

    @IsString()
    @IsNotEmpty()
    location:string

    @IsString()
    @IsNotEmpty()
    event_date:string

    @IsString()
    @IsNotEmpty()
    category:string

    @IsString()
    @IsNotEmpty()
    registration_deadline:string

    @IsString()
    @IsNotEmpty()
    ticket_price:string

    @IsString()
    discount:string

    @IsString()
    additional_info:string

}
