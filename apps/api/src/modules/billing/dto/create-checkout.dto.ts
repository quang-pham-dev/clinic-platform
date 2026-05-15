import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['basic', 'pro', 'enterprise'])
  plan: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['monthly', 'annual'])
  billingCycle: string;
}
