import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import Menu from '../models/Menu.js';
import MenuItem from '../models/MenuItem.js';

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restaurant_api');

        await User.deleteMany();
        await Restaurant.deleteMany();
        await Menu.deleteMany();
        await MenuItem.deleteMany();

        console.log('Data Cleared...');

        const admin = await User.create({
            name: 'John Doe',
            email: 'john@example.com',
            password: 'password123',
            role: 'restaurant_owner'
        });

        const restaurant = await Restaurant.create({
            name: 'The Gourmet Kitchen',
            address: '123 Foodie St, Flavor Town',
            contact: '555-0199',
            owner: admin._id,
            description: 'A premium dining experience.'
        });

        const breakfastMenu = await Menu.create({
            restaurant: restaurant._id,
            name: 'Breakfast'
        });

        const dinnerMenu = await Menu.create({
            restaurant: restaurant._id,
            name: 'Dinner'
        });

        await MenuItem.create([
            {
                menu: breakfastMenu._id,
                name: 'Pancakes',
                price: 12.99,
                description: 'Fluffy pancakes with maple syrup',
                category: 'Main'
            },
            {
                menu: breakfastMenu._id,
                name: 'Omelette',
                price: 10.50,
                description: 'Three-egg omelette with cheese',
                category: 'Main'
            },
            {
                menu: dinnerMenu._id,
                name: 'Steak',
                price: 29.99,
                description: 'Grilled ribeye with mashed potatoes',
                category: 'Main Course'
            }
        ]);

        console.log('Database Seeded Successfully!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

seedData();
