import { IsDate, IsEmpty, IsNotEmpty, IsNumber, IsObject, IsString } from "class-validator";

export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    title:string

    @IsString()
    @IsNotEmpty()
    description:string

    @IsString()
    @IsNotEmpty()
    venue:string

    @IsString()
    @IsNotEmpty()
    starting_time:string

    @IsString()
    @IsNotEmpty()
    ending_time:string

    @IsString()
    @IsNotEmpty()
    event_date:string

    @IsString()
    @IsNotEmpty()
    reminder_days:string


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
    @IsNotEmpty()
    hosting_state:string

    @IsString()
    @IsNotEmpty()
    hosting_country:string

    @IsString()
    additional_info:string

    event_image:any

}
