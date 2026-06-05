import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @IsBoolean()
  tosAccepted!: boolean;

  @IsString()
  @IsNotEmpty()
  tosVersion!: string;
}
