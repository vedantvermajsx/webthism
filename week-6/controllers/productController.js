const Product = require('../models/Product');
const Category = require('../models/Category');

exports.getProducts = async (req, res) => {
    try {
        const { keyword, category, minPrice, maxPrice, sort, page = 1, limit = 10 } = req.query;

        const query = {};

        if (keyword) {
            query.$text = { $search: keyword };
        }

        if (category) {
            const categoryDoc = await Category.findOne({ slug: category });
            if (categoryDoc) {
                query.category = categoryDoc._id;
            }
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        let productsQuery = Product.find(query).populate('category', 'name slug');

        if (sort) {
            const sortBy = sort.split(',').join(' ');
            productsQuery = productsQuery.sort(sortBy);
        } else {
            productsQuery = productsQuery.sort('-createdAt');
        }

        const skip = (Number(page) - 1) * Number(limit);
        productsQuery = productsQuery.skip(skip).limit(Number(limit));

        const products = await productsQuery;
        const total = await Product.countDocuments(query);

        res.json({
            success: true,
            count: products.length,
            total,
            pages: Math.ceil(total / limit),
            currentPage: Number(page),
            products
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category', 'name slug');
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json({ success: true, product });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        let product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({ success: true, product });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        await product.deleteOne();
        res.json({ success: true, message: 'Product removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
