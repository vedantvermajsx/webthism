const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'E-Commerce API',
            version: '2.0.0',
            description: 'Week 6 - Complete E-Commerce REST API with Cart, Orders, Stripe Payments, and Email Notifications'
        },
        servers: [
            { url: 'http://localhost:5000', description: 'Development' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        email: { type: 'string' },
                        password: { type: 'string' },
                        role: { type: 'string', enum: ['user', 'admin'] }
                    }
                },
                Product: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        price: { type: 'number' },
                        category: { type: 'string' },
                        stock: { type: 'integer' },
                        images: { type: 'array', items: { type: 'object', properties: { url: { type: 'string' }, public_id: { type: 'string' } } } }
                    }
                },
                Category: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' }
                    }
                },
                CartItem: {
                    type: 'object',
                    properties: {
                        productId: { type: 'string' },
                        quantity: { type: 'integer', default: 1 }
                    }
                },
                ShippingAddress: {
                    type: 'object',
                    properties: {
                        address: { type: 'string' },
                        city: { type: 'string' },
                        postalCode: { type: 'string' },
                        country: { type: 'string' }
                    }
                },
                Order: {
                    type: 'object',
                    properties: {
                        user: { type: 'string' },
                        orderItems: { type: 'array' },
                        shippingAddress: { $ref: '#/components/schemas/ShippingAddress' },
                        totalPrice: { type: 'number' },
                        status: { type: 'string', enum: ['Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'] },
                        isPaid: { type: 'boolean' },
                        trackingNumber: { type: 'string' }
                    }
                }
            }
        },
        paths: {
            '/api/auth/register': {
                post: {
                    tags: ['Auth'],
                    summary: 'Register a new user',
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
                    responses: { 201: { description: 'User registered' }, 400: { description: 'Validation error' } }
                }
            },
            '/api/auth/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'Login user',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } } },
                    responses: { 200: { description: 'Login successful' }, 401: { description: 'Invalid credentials' } }
                }
            },
            '/api/auth/me': {
                get: {
                    tags: ['Auth'],
                    summary: 'Get current user profile',
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'User profile' } }
                }
            },
            '/api/products': {
                get: {
                    tags: ['Products'],
                    summary: 'Get all products',
                    parameters: [
                        { name: 'keyword', in: 'query', schema: { type: 'string' } },
                        { name: 'category', in: 'query', schema: { type: 'string' } },
                        { name: 'minPrice', in: 'query', schema: { type: 'number' } },
                        { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
                        { name: 'sort', in: 'query', schema: { type: 'string' } },
                        { name: 'page', in: 'query', schema: { type: 'integer' } },
                        { name: 'limit', in: 'query', schema: { type: 'integer' } }
                    ],
                    responses: { 200: { description: 'Products list' } }
                },
                post: {
                    tags: ['Products'],
                    summary: 'Create product (Admin)',
                    security: [{ bearerAuth: [] }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
                    responses: { 201: { description: 'Product created' } }
                }
            },
            '/api/products/{id}': {
                get: {
                    tags: ['Products'],
                    summary: 'Get product by ID',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Product details' }, 404: { description: 'Not found' } }
                },
                put: {
                    tags: ['Products'],
                    summary: 'Update product (Admin)',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
                    responses: { 200: { description: 'Product updated' } }
                },
                delete: {
                    tags: ['Products'],
                    summary: 'Delete product (Admin)',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Product deleted' } }
                }
            },
            '/api/categories': {
                get: {
                    tags: ['Categories'],
                    summary: 'Get all categories',
                    responses: { 200: { description: 'Categories list' } }
                },
                post: {
                    tags: ['Categories'],
                    summary: 'Create category (Admin)',
                    security: [{ bearerAuth: [] }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } },
                    responses: { 201: { description: 'Category created' } }
                }
            },
            '/api/categories/{id}': {
                delete: {
                    tags: ['Categories'],
                    summary: 'Delete category (Admin)',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Category deleted' } }
                }
            },
            '/api/cart': {
                get: {
                    tags: ['Cart'],
                    summary: 'Get user cart',
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'Cart contents' } }
                },
                post: {
                    tags: ['Cart'],
                    summary: 'Add item to cart',
                    security: [{ bearerAuth: [] }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CartItem' } } } },
                    responses: { 200: { description: 'Item added' } }
                },
                delete: {
                    tags: ['Cart'],
                    summary: 'Clear entire cart',
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'Cart cleared' } }
                }
            },
            '/api/cart/{productId}': {
                put: {
                    tags: ['Cart'],
                    summary: 'Update item quantity',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { quantity: { type: 'integer' } } } } } },
                    responses: { 200: { description: 'Quantity updated' } }
                },
                delete: {
                    tags: ['Cart'],
                    summary: 'Remove item from cart',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Item removed' } }
                }
            },
            '/api/orders': {
                post: {
                    tags: ['Orders'],
                    summary: 'Create order from cart',
                    security: [{ bearerAuth: [] }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { shippingAddress: { $ref: '#/components/schemas/ShippingAddress' } } } } } },
                    responses: { 201: { description: 'Order created' }, 400: { description: 'Cart empty' } }
                },
                get: {
                    tags: ['Orders'],
                    summary: 'Get my orders',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer' } },
                        { name: 'limit', in: 'query', schema: { type: 'integer' } },
                        { name: 'status', in: 'query', schema: { type: 'string' } }
                    ],
                    responses: { 200: { description: 'Orders list' } }
                }
            },
            '/api/orders/admin/all': {
                get: {
                    tags: ['Orders'],
                    summary: 'Get all orders (Admin)',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer' } },
                        { name: 'limit', in: 'query', schema: { type: 'integer' } },
                        { name: 'status', in: 'query', schema: { type: 'string' } }
                    ],
                    responses: { 200: { description: 'All orders' } }
                }
            },
            '/api/orders/{id}': {
                get: {
                    tags: ['Orders'],
                    summary: 'Get order by ID',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Order details' }, 404: { description: 'Not found' } }
                }
            },
            '/api/orders/{id}/pay': {
                put: {
                    tags: ['Orders'],
                    summary: 'Confirm payment',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Payment confirmed' } }
                }
            },
            '/api/orders/{id}/status': {
                put: {
                    tags: ['Orders'],
                    summary: 'Update order status (Admin)',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'] }, trackingNumber: { type: 'string' }, note: { type: 'string' } } } } } },
                    responses: { 200: { description: 'Status updated' } }
                }
            },
            '/api/orders/{id}/cancel': {
                put: {
                    tags: ['Orders'],
                    summary: 'Cancel order',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } },
                    responses: { 200: { description: 'Order cancelled' } }
                }
            }
        }
    },
    apis: []
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
