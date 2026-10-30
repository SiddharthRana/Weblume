# Unit economics

Hypotheses for planning, not accounting. Every rate below is an **assumption to check** against current provider pricing, your tax registration and an accountant's advice. Plan prices live in `packages/shared/src/plans.ts`; fixed costs come from [`costs.md`](costs.md).

## Assumptions

| Item                                    | Value used                                        | Check                                                         |
| --------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| Exchange rate                           | ₹85 = $1                                          | Use the current rate                                          |
| India GST on digital services           | 18%, included in the ₹ price shown                | MoR / Play remit it; confirm the price is shown tax-inclusive |
| US sales tax                            | Added on top of the $ price (not revenue)         | MoR handles it                                                |
| Paddle fee                              | 5% + $0.50 per transaction                        | paddle.com/pricing                                            |
| Dodo Payments fee                       | **Unknown here.** Fill in from their pricing page | dodopayments.com                                              |
| Google Play service fee                 | 15% on subscriptions                              | Play Console → policy                                         |
| Cost per scan (PSI + compute + storage) | < $0.001 (PSI is free within quota)               | See `costs.md`                                                |
| Fixed costs                             | ~$52 / month (≈ ₹4,400)                           | See `costs.md`                                                |

## Net revenue per subscriber

Net = price − tax − payment fee. Per month; annual plans are divided by 12.

| Plan and channel              | Price  | Tax      | Fee                    | **Net / month**    | Net % of price |
| ----------------------------- | ------ | -------- | ---------------------- | ------------------ | -------------- |
| India monthly via Paddle      | ₹149   | ₹22.7    | ₹7.5 + ₹42.5 = ₹50.0   | **₹76.3**          | 51%            |
| India annual via Paddle       | ₹1,199 | ₹182.9   | ₹60.0 + ₹42.5 = ₹102.5 | **₹76.1**          | 76%            |
| India monthly via Google Play | ₹149   | ₹22.7    | 15% of ₹126.3 = ₹18.9  | **₹107.3**         | 72%            |
| India annual via Google Play  | ₹1,199 | ₹182.9   | ₹152.4                 | **₹71.9**          | 72%            |
| US monthly via Paddle         | $3.99  | (on top) | $0.20 + $0.50 = $0.70  | **$3.29** (≈ ₹280) | 82%            |
| US annual via Paddle          | $29.99 | (on top) | $1.50 + $0.50 = $2.00  | **$2.33** (≈ ₹198) | 93%            |
| US monthly via Google Play    | $3.99  | (on top) | $0.60                  | **$3.39**          | 85%            |

**Main finding:** Paddle's fixed $0.50 fee takes about **28% of a ₹149 monthly payment**. For Indian customers on the web, either:

- push annual plans (the fixed fee is paid once a year);
- use a provider without a large fixed fee for INR (check Dodo's INR pricing); or
- raise the monthly INR price.

## Cost of serving a subscriber

A Starter subscriber at the full quota (60 scans/month):

- PSI calls: 120, free within quota.
- Compute and bandwidth: about 60 × (≤ 3 MB + < 1 s CPU), a fraction of a cent.
- Storage: about 60 × 30 KB = 1.8 MB, kept for 12 months.

The **variable cost is under ₹1 per subscriber per month**, so margin at the quota limit is about the net revenue above. PDFs and share links add negligible cost.

A Free user at the quota (5 scans/month) costs a fraction of a paisa in compute. The real limit for Free and guest users is the **shared PSI quota**: 12,500 uncached scans/day across everyone. Guest scans (1/day/IP + Turnstile) and Free quotas protect it.

## Break-even

Fixed costs ≈ ₹4,400/month.

| If all subscribers are…              | Needed to break even |
| ------------------------------------ | -------------------- |
| India monthly via Paddle (₹76)       | ~58                  |
| India via Google Play (₹107 monthly) | ~41                  |
| US monthly via Paddle (≈ ₹280)       | ~16                  |
| A realistic mix (₹120 average)       | ~37                  |

## How to update this

Change the assumptions table, then recompute the formula: `net = price − tax − (percent × price) − fixed fee`. If plan prices change, update `packages/shared/src/plans.ts` and the provider dashboards. The pricing page reads display prices from the shared config, but the amount charged always comes from the provider.
