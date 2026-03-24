# Notification and Payment Architecture

## Goals

- Add asynchronous notifications without slowing down checkout.
- Add a dedicated payment transaction layer separate from `order`.
- Keep the first implementation compatible with Express, MongoDB, and Redis.
- Create a clean upgrade path toward real gateways and standalone workers.

## High-Level Design

### Notification

The notification subsystem has two parts:

- MongoDB `Notifications` collection for durable in-app notifications
- BullMQ-backed Redis queue for asynchronous email delivery

Flow:

1. A business event happens, for example `order.created` or `payment.succeeded`.
2. `NotificationService` writes a notification document into MongoDB.
3. If the recipient has an email address, the service enqueues an email job in BullMQ.
4. `NotificationWorker` consumes the BullMQ queue and sends the email.
5. Worker updates email delivery status on the notification record.

Benefits:

- request/response flow stays fast
- email delivery is retryable
- we can list notifications in-app even if email fails
- later we can move the worker into a separate process without changing service contracts

### Payment

The payment subsystem adds a dedicated `Payments` collection.

Responsibilities:

- persist one payment transaction per order
- generate stable `transactionRef`
- separate payment provider state from order lifecycle state
- update the order payment snapshot for fast reads

For this first implementation:

- `COD` uses provider `internal`
- online-like methods (`credit_card`, `paypal`, `bank_transfer`) use provider `mock_gateway`
- a protected confirmation endpoint simulates gateway success

Flow:

1. Checkout creates the order.
2. `PaymentService` creates a payment transaction record.
3. Non-COD payments return a mock confirmation action with `transactionRef`.
4. Client confirms through a mock payment endpoint.
5. Payment transaction becomes `paid`, order payment snapshot is updated, and notifications are emitted.

Benefits:

- payment history is no longer hidden inside `order`
- future Stripe/VNPay/MoMo integration has a clear seam
- webhooks/refunds can be added without rewriting checkout

## Data Model

### Notification

- `notification_userId`
- `notification_accountType`
- `notification_type`
- `notification_title`
- `notification_message`
- `notification_metadata`
- `notification_isRead`
- `notification_readAt`
- `notification_email`
  - `to`
  - `status`
  - `attempts`
  - `sentAt`
  - `lastError`

### Payment

- `payment_orderId`
- `payment_userId`
- `payment_method`
- `payment_provider`
- `payment_amount`
- `payment_currency`
- `payment_status`
- `payment_transactionRef`
- `payment_checkoutUrl`
- `payment_gatewayPayload`
- `payment_processedAt`
- `payment_failureReason`

## Failure Strategy

### Notification failures

- checkout must not fail only because SMTP failed
- failed email delivery is recorded on the notification record
- worker retries email jobs a limited number of times

### Payment failures

- if transaction creation fails during checkout, checkout should fail
- if mock confirmation fails, payment remains `requires_action`
- order state and payment state remain separate

## Upgrade Path

- current implementation already uses BullMQ; later we can replace it with RabbitMQ if needed
- move worker into a standalone process
- add real payment gateway adapters
- add webhook signature verification
- add refund flows and payment-expiry jobs

## Current Provider Choices

- OAuth2 provider implemented first: Google
- Real payment gateway implemented first: VNPay
- Notification queue implementation: BullMQ
