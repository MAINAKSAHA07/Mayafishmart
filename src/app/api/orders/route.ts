import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcGstPaise, calcLineTotalPaise } from "@/lib/money";
import { createCouponDeps, validateCouponForOrder } from "@/lib/coupons";
import { resolveCustomerId } from "@/lib/guest-customer";
import { generatePickupCode } from "@/lib/pickup";
import { getRazorpay, isRazorpayConfigured } from "@/lib/payments/razorpay";
import { isBorzoConfigured } from "@/lib/borzo/client";
import { bookBorzoForOrder, quoteDeliveryFee } from "@/lib/borzo/book";

const addressSchema = z.object({
  line1: z.string().min(3),
  line2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/),
});

const bodySchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid().or(z.string().min(1)),
          qty: z.number().positive(),
        })
      )
      .min(1),
    customer: z.object({
      fullName: z.string().min(2),
      email: z.string().email(),
      phone: z.string().min(8),
      address: addressSchema,
    }),
    fulfillment: z.enum(["pickup", "delivery"]).default("pickup"),
    pickupSlot: z.string().optional(),
    paymentMethod: z.enum(["razorpay", "counter", "cod"]),
    couponCode: z.string().optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.fulfillment === "pickup" && (!val.pickupSlot || val.pickupSlot.trim().length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pickup slot is required",
        path: ["pickupSlot"],
      });
    }
  });

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = bodySchema.parse(json);
    const fulfillment = body.fulfillment;
    const pickupSlot =
      fulfillment === "delivery"
        ? body.pickupSlot?.trim() || "ASAP delivery"
        : body.pickupSlot!.trim();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { customerId } = await resolveCustomerId({
      userId: user?.id ?? null,
      email: body.customer.email,
      phone: body.customer.phone,
      fullName: body.customer.fullName,
    });

    const admin = createAdminClient();

    const { data: existingAddress } = await admin
      .from("customer_addresses")
      .select("id")
      .eq("customer_id", customerId)
      .eq("is_primary", true)
      .maybeSingle();

    if (existingAddress) {
      await admin
        .from("customer_addresses")
        .update({
          line1: body.customer.address.line1,
          line2: body.customer.address.line2 || null,
          city: body.customer.address.city,
          state: body.customer.address.state,
          pincode: body.customer.address.pincode,
        })
        .eq("id", existingAddress.id);
    } else {
      await admin.from("customer_addresses").insert({
        customer_id: customerId,
        line1: body.customer.address.line1,
        line2: body.customer.address.line2 || null,
        city: body.customer.address.city,
        state: body.customer.address.state,
        pincode: body.customer.address.pincode,
        is_primary: true,
      });
    }

    const productIds = body.items.map((i) => i.productId);
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (productIds.some((id) => !uuidRe.test(id))) {
      return NextResponse.json(
        {
          error:
            "Your cart has outdated items. Clear the cart and add products again from Today's catch.",
        },
        { status: 400 }
      );
    }

    const { data: products, error: productsError } = await admin
      .from("products")
      .select("*, inventory(*)")
      .in("id", productIds)
      .eq("is_active", true);

    if (productsError) {
      return NextResponse.json(
        { error: productsError.message || "Products unavailable" },
        { status: 400 }
      );
    }

    if (!products?.length) {
      return NextResponse.json(
        {
          error:
            "Products unavailable. Clear the cart and add items again from Today's catch.",
        },
        { status: 400 }
      );
    }

    if (products.length !== productIds.length) {
      return NextResponse.json(
        {
          error:
            "Some cart items are no longer available. Clear the cart and try again.",
        },
        { status: 400 }
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    let preGst = 0;
    let totalWeightKg = 0;
    const lineItems: Array<{
      product_id: string;
      product_name: string;
      unit: string;
      qty: number;
      unit_price_paise: number;
      gst_rate: number;
      line_total_paise: number;
    }> = [];

    for (const item of body.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json({ error: "Invalid product in cart" }, { status: 400 });
      }
      const inv = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
      const available = (inv?.qty_on_hand ?? 0) - (inv?.reserved_qty ?? 0);
      if (available < item.qty) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        );
      }
      const line = calcLineTotalPaise(item.qty, product.price_paise);
      const gst = calcGstPaise(line, Number(product.gst_rate));
      subtotal += line;
      preGst += gst;
      if (product.unit === "kg") totalWeightKg += item.qty;
      else totalWeightKg += item.qty * 0.5;
      lineItems.push({
        product_id: product.id,
        product_name: product.name,
        unit: product.unit,
        qty: item.qty,
        unit_price_paise: product.price_paise,
        gst_rate: Number(product.gst_rate),
        line_total_paise: line,
      });
    }

    const couponResult = await validateCouponForOrder(createCouponDeps(admin), {
      code: body.couponCode,
      customerId,
      subtotalPaise: subtotal,
      preDiscountGstPaise: preGst,
    });
    if (!couponResult.ok) {
      return NextResponse.json({ error: couponResult.error }, { status: 400 });
    }
    const { summary } = couponResult;
    const pickupCode = generatePickupCode();

    let deliveryFeePaise = 0;
    if (fulfillment === "delivery") {
      if (!isBorzoConfigured()) {
        return NextResponse.json(
          {
            error:
              "Delivery is not available right now. Choose pickup or try again later.",
          },
          { status: 503 }
        );
      }
      const quote = await quoteDeliveryFee({
        phone: body.customer.phone,
        fullName: body.customer.fullName,
        address: body.customer.address,
        totalWeightKg,
      });
      if (!quote.ok) {
        return NextResponse.json({ error: quote.error }, { status: 400 });
      }
      deliveryFeePaise = quote.deliveryFeePaise;
    }

    const totalPaise = summary.totalPaise + deliveryFeePaise;

    let razorpayOrderId: string | null = null;
    let razorpayPayload: { keyId: string; orderId: string; amount: number } | null = null;

    if (body.paymentMethod === "razorpay") {
      if (!isRazorpayConfigured()) {
        return NextResponse.json(
          { error: "Razorpay is not configured. Choose pay at counter." },
          { status: 400 }
        );
      }
      const rzp = getRazorpay();
      const rzOrder = await rzp.orders.create({
        amount: totalPaise,
        currency: "INR",
        receipt: pickupCode,
      });
      razorpayOrderId = rzOrder.id;
      razorpayPayload = {
        keyId: process.env.RAZORPAY_KEY_ID!,
        orderId: rzOrder.id,
        amount: totalPaise,
      };
    }

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        pickup_code: pickupCode,
        customer_id: customerId,
        status: "placed",
        fulfillment,
        pickup_slot: pickupSlot,
        payment_method: body.paymentMethod,
        payment_status: "pending",
        razorpay_order_id: razorpayOrderId,
        subtotal_paise: summary.subtotalPaise,
        discount_paise: summary.discountPaise,
        gst_paise: summary.gstPaise,
        delivery_fee_paise: deliveryFeePaise,
        total_paise: totalPaise,
        coupon_id: summary.coupon?.id ?? null,
        coupon_code: summary.coupon?.code ?? null,
        customer_name: body.customer.fullName,
        customer_email: body.customer.email,
        customer_phone: body.customer.phone,
        customer_address: body.customer.address,
      })
      .select("*")
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: orderError?.message || "Failed to create order" },
        { status: 500 }
      );
    }

    const { error: itemsError } = await admin.from("order_items").insert(
      lineItems.map((li) => ({ ...li, order_id: order.id }))
    );
    if (itemsError) {
      await admin.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    if (summary.coupon && summary.discountPaise > 0) {
      const { error: redeemError } = await admin.from("coupon_redemptions").insert({
        coupon_id: summary.coupon.id,
        order_id: order.id,
        customer_id: customerId,
        discount_paise: summary.discountPaise,
      });
      if (redeemError) {
        await admin.from("orders").delete().eq("id", order.id);
        return NextResponse.json(
          { error: redeemError.message || "Coupon could not be applied" },
          { status: 400 }
        );
      }
    }

    for (const item of body.items) {
      const product = productMap.get(item.productId)!;
      const inv = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
      if (inv) {
        await admin
          .from("inventory")
          .update({
            reserved_qty: Number(inv.reserved_qty) + item.qty,
            updated_at: new Date().toISOString(),
          })
          .eq("product_id", item.productId);
        await admin.from("inventory_movements").insert({
          product_id: item.productId,
          delta: -item.qty,
          reason: "reserve",
          actor_id: customerId,
          note: `Reserved for order ${pickupCode}`,
        });
      }
    }

    await admin.from("customers_meta").upsert({
      customer_id: customerId,
      last_order_at: new Date().toISOString(),
    });

    let borzoWarning: string | null = null;
    if (fulfillment === "delivery" && body.paymentMethod === "counter") {
      const booked = await bookBorzoForOrder(
        admin,
        {
          id: order.id,
          pickup_code: order.pickup_code,
          customer_phone: order.customer_phone,
          customer_name: order.customer_name,
          customer_address: order.customer_address,
          fulfillment: order.fulfillment,
        },
        totalWeightKg
      );
      if (!booked.ok) {
        borzoWarning =
          "Order saved, but courier booking failed. We will arrange delivery — contact the shop if needed.";
      } else {
        const { data: refreshed } = await admin
          .from("orders")
          .select("*")
          .eq("id", order.id)
          .single();
        if (refreshed) Object.assign(order, refreshed);
      }
    }

    return NextResponse.json({
      order,
      pricing: { ...summary, deliveryFeePaise, totalPaise },
      razorpay: razorpayPayload,
      guest: !user,
      borzoWarning,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Order failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
