import Stripe from "stripe";
import { env } from "@/lib/env";

export const stripe = env.stripeSecret
  ? new Stripe(env.stripeSecret, { apiVersion: "2024-06-20" as any })
  : null;
