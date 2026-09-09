# Security & Legal TODO

Tracked separately from the UI build so visual iteration isn't blocked on
these. Review before treating `/store` as production-ready.

## Security
- [ ] Authentication security (storefront checkout is currently unauthenticated by design — no customer accounts yet)
- [ ] Authorization / admin permissions
- [ ] Secure media uploads (product image upload writes to local disk — fine for sandbox, not for prod)
- [ ] File type validation
- [ ] File size limits
- [ ] API key protection
- [ ] Environment variable protection
- [ ] Rate limiting (checkout has a basic in-memory limiter — not durable across restarts/instances)
- [ ] Input validation
- [ ] XSS protection
- [ ] CSRF considerations
- [x] Secure payment implementation (Stripe test mode: PaymentIntents + webhook-driven order status, see .env.example) — [ ] still needs: live keys, and NGN isn't a supported Stripe presentment currency so this runs in USD (converted at a fixed rate) — Paystack/Flutterwave are the standard NGN-native alternative
- [ ] Real logistics provider integration (shipping/tracking webhook is currently simulated — see app/api/webhooks/shipping)
- [ ] Database security rules (catalog/orders/inventory are in-memory sandbox stores, not a real DB)
- [ ] Backup strategy

## Legal / Trust
- [ ] AI-generated image disclosure (the "✦ AI Preview" badge exists in the UI — confirm wording meets your jurisdiction's requirements)
- [ ] Real-product-video verification policy
- [ ] Model/image usage rights
- [ ] Garment/product image ownership
- [ ] Privacy policy
- [ ] Terms of service
- [ ] Cookie/analytics consent where required
- [ ] Advertising disclosure requirements
- [ ] Refund/return policy
- [ ] AI representation disclaimer

## Production
- [ ] Performance audit
- [ ] Accessibility audit
- [ ] SEO audit
- [ ] Mobile testing (verified in dev via HTTP checks only — needs real-device pass)
- [ ] Browser compatibility
- [ ] Production monitoring
