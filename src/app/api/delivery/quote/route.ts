import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateDelivery, isBorzoConfigured } from "@/lib/borzo/client";

const bodySchema = z.object({
  phone: z.string().min(8),
  fullName: z.string().optional(),
  address: z.object({
    line1: z.string().min(3),
    line2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    pincode: z.string().regex(/^\d{6}$/),
  }),
  totalWeightKg: z.number().positive().optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!isBorzoConfigured()) {
      return NextResponse.json(
        {
          error:
            "Delivery is not configured yet. Choose pickup, or set BORZO_API_TOKEN and BORZO_SHOP_PHONE.",
        },
        { status: 503 }
      );
    }

    const body = bodySchema.parse(await request.json());
    const result = await calculateDelivery({
      customerPhone: body.phone,
      customerName: body.fullName,
      address: body.address,
      totalWeightKg: body.totalWeightKg,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      deliveryFeePaise: result.data.deliveryFeePaise,
      paymentAmountPaise: result.data.paymentAmountPaise,
      points: result.data.points,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Quote failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
