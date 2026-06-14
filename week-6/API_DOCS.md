# E-Commerce API Documentation (Week 6)

Base URL: `http://localhost:5000`
Swagger UI: `http://localhost:5000/api-docs`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## Auth Endpoints

### POST /api/auth/register
Register a new user.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user"
}
```

**Response (201):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1...",
  "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "user" }
}
```

### POST /api/auth/login
Login and get JWT token.

**Body:**
```json
{ "email": "john@example.com", "password": "password123" }
```

### GET /api/auth/me
Get current user profile. **Protected.**

---

## Product Endpoints

### GET /api/products
Get all products with filtering, search, and pagination.

**Query params:** `keyword`, `category`, `minPrice`, `maxPrice`, `sort`, `page`, `limit`

### GET /api/products/:id
Get single product.

### POST /api/products
Create product. **Admin only.**

**Body:**
```json
{
  "name": "Wireless Headphones",
  "description": "High-quality wireless headphones with noise cancellation",
  "price": 149.99,
  "category": "<category_id>",
  "stock": 50
}
```

### PUT /api/products/:id
Update product. **Admin only.**

### DELETE /api/products/:id
Delete product. **Admin only.**

---

## Category Endpoints

### GET /api/categories
Get all categories.

### POST /api/categories
Create category. **Admin only.**

**Body:**
```json
{ "name": "Electronics", "description": "Electronic devices" }
```

### DELETE /api/categories/:id
Delete category. **Admin only.**

---

## Cart Endpoints (All Protected)

### GET /api/cart
Get current user's cart with calculated total.

### POST /api/cart
Add item to cart.

**Body:**
```json
{ "productId": "<product_id>", "quantity": 2 }
```

### PUT /api/cart/:productId
Update item quantity in cart.

**Body:**
```json
{ "quantity": 5 }
```

### DELETE /api/cart/:productId
Remove specific item from cart.

### DELETE /api/cart
Clear entire cart.

---

## Order Endpoints (All Protected)

### POST /api/orders
Create order from cart. Creates Stripe PaymentIntent, decrements stock, clears cart, sends confirmation email.

**Body:**
```json
{
  "shippingAddress": {
    "address": "123 Main St",
    "city": "Springfield",
    "postalCode": "62704",
    "country": "US"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "order": { ... },
  "clientSecret": "pi_simulated_secret_..."
}
```

### GET /api/orders
Get current user's orders. Supports `page`, `limit`, `status` query params.

### GET /api/orders/:id
Get single order details.

### PUT /api/orders/:id/pay
Confirm payment for an order. Sends payment confirmation email.

### PUT /api/orders/:id/status
Update order status. **Admin only.** Sends shipping/delivery email notifications.

**Body:**
```json
{
  "status": "Shipped",
  "trackingNumber": "TRK-123456",
  "note": "Shipped via FedEx"
}
```

### PUT /api/orders/:id/cancel
Cancel an order. Restores product stock. Cannot cancel shipped/delivered orders.

**Body:**
```json
{ "reason": "Changed my mind" }
```

### GET /api/orders/admin/all
Get all orders across all users. **Admin only.** Supports `page`, `limit`, `status` query params.

---

## Email Notifications

Sent automatically on:
- Order creation (confirmation)
- Payment confirmation
- Status change to Shipped (with tracking number)
- Status change to Delivered

Uses Ethereal in development (preview URLs logged to console).

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description"
}
```

Validation errors:
```json
{
  "success": false,
  "errors": [{ "field": "email", "message": "Invalid email address" }]
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |
