export class CreatePaymentDto {
  subscriptionId?: string;
  amount: number;
  paymentMethod: string;
  description?: string;
  metadata?: any;
}