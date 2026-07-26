declare module "razorpay" {
  interface RazorpayOrder {
    id: string;
    amount: number | string;
    currency: string;
  }

  interface RazorpayInstance {
    orders: {
      create: (options: {
        amount: number;
        currency: string;
        receipt?: string;
      }) => Promise<RazorpayOrder>;
    };
  }

  export default class Razorpay {
    constructor(options: { key_id: string; key_secret: string });
    orders: RazorpayInstance["orders"];
  }
}
