import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcGstPaise, calcLineTotalPaise } from "@/lib/money";
import { createCouponDeps, validateCouponForOrder } from "@/lib/coupons";

const bodySchema = z.object({
  code: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qty: z.number().positive(),
      })
    )
    .min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();
    const productIds = body.items.map((i) => i.productId);
    const { data: products, error } = await admin
      .from("products")
      .select("id, price_paise, gst_rate, is_active")
      .in("id", productIds)
      .eq("is_active", true);

    if (error || !products?.length) {
      return NextResponse.json({ error: "Products unavailable" }, { status: 400 });
    }

    const map = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    let preGst = 0;
    for (const item of body.items) {
      const p = map.get(item.productId);
      if (!p) {
        return NextResponse.json({ error: "Invalid product in cart" }, { status: 400 });
      }
      const line = calcLineTotalPaise(item.qty, p.price_paise);
      subtotal += line;
      preGst += calcGstPaise(line, Number(p.gst_rate));
    }

    const result = await validateCouponForOrder(createCouponDeps(admin), {
      code: body.code,
      customerId: user?.id ?? null,
      subtotalPaise: subtotal,
      preDiscountGstPaise: preGst,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      pricing: {
        subtotalPaise: result.summary.subtotalPaise,
        discountPaise: result.summary.discountPaise,
        taxablePaise: result.summary.taxablePaise,
        gstPaise: result.summary.gstPaise,
        totalPaise: result.summary.totalPaise,
        couponCode: result.summary.coupon?.code ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Validation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
