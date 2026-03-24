# Ecommerce Backend API

Node.js/Express backend for an ecommerce platform with auth, RBAC, product/cart/discount/checkout flows, Redis caching, Swagger docs, unit tests, and Docker-based deployment.

## Tech Stack

- Node.js (runtime in Docker: Node 20)
- Express 5
- MongoDB + Mongoose
- Redis (cache, rate-limit state, idempotency)
- JWT (access/refresh token)
- Jest (unit tests)
- Swagger UI (`/api-docs`)
- Docker + Docker Compose

## Core Features

- Authentication
- Sign up user/shop
- Login (user/shop)
- Refresh token, logout single device, logout all devices
- Forgot password flow: request OTP -> verify OTP -> reset password

- Authorization & Security
- API key middleware on `/api/v1/*`
- Permission middleware (`read`)
- JWT auth for protected routes
- Login fail counter + temporary block
- OTP attempt limit + verify block window

- Ecommerce Domain
- Product management
- Cart management
- Discount application
- Checkout review and order creation
- Order status transition rules
- Shop ownership checks on status updates

- Reliability
- Idempotent order creation (`x-idempotency-key`)
- Inventory rollback on failures
- Structured audit logs for auth/checkout events

- Developer Experience
- Swagger UI docs at `/api-docs`
- OpenAPI JSON at `/api-docs.json`
- Unit tests for auth/checkout critical paths
- Docker scripts for build/run/health checks

## Project Structure

```text
app.js
server.js
routes/
controllers/
services/
models/
auth/
configs/
helpers/
utils/
docs/swagger/
tests/unit/
.github/workflows/
```

## API Base Paths

- Health: `/health`
- Liveness: `/`
- API: `/api/v1`
- Docs: `/api-docs`

Main route groups under `/api/v1`:

- `/auth`
- `/product`
- `/discount`
- `/cart`
- `/checkout`
- `/comment`

## Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Important variables:

- `PORT` (default Docker setup: `4953`)
- `MONGODB_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `MAIL_NAME`
- `MAIL_PASSWORD`
- OTP and rate-limit settings

## Run Locally (Node)

Install and run:

```bash
npm ci
npm run dev
```

Start production mode:

```bash
npm start
```

Run tests:

```bash
npm test
```

## Run with Docker

Build and start all services (app + MongoDB + Redis):

```bash
docker-compose up -d --build
```

Check status:

```bash
docker-compose ps
```

View logs:

```bash
docker-compose logs -f app
```

Stop:

```bash
docker-compose down
```

## NPM Scripts

- `npm test`
- `npm start`
- `npm run dev`
- `npm run docker:build`
- `npm run docker:up`
- `npm run docker:down`
- `npm run docker:logs`
- `npm run docker:test`
- `npm run docker:health`

## Request Headers (Important)

For most `/api/v1/*` routes:

- `x-api-key: <your_api_key>`
- `Content-Type: application/json`

Protected endpoints also require:

- `Authorization: Bearer <access_token>`

Some flows require extra headers (for example refresh-token flow).

## Forgot Password Flow

1. `POST /api/v1/auth/forgot-password/request-otp`
2. `POST /api/v1/auth/forgot-password/verify-otp`
3. `POST /api/v1/auth/forgot-password/reset`

Security behavior:

- Reset is blocked unless OTP was verified first.
- Verified state is cached with TTL and removed after successful reset.

## Checkout Rules

- `x-idempotency-key` supported for order creation.
- Invalid status transitions are rejected.
- Shop cannot update orders it does not own.
- Inventory is restored on partial/failed checkout paths.

## API Documentation

Run app then open:

- `http://localhost:4953/api-docs`
- `http://localhost:4953/api-docs.json`

## CI/CD and Deployment

The repository includes Docker CI/CD and deployment

## Deploy to AWS EC2 + Nginx (Docker)

This section describes production deployment where Nginx handles domain/SSL and proxies to the Docker app on port `4953`.

## Testing Status

Current unit tests cover:

- `AccessService.login` critical scenarios
- `CheckoutService.updateOrderStatusByShop` transition/ownership rules

Run with:

```bash
npm test
```
