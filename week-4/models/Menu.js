import mongoose from 'mongoose';

const menuSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

const Menu = mongoose.model('Menu', menuSchema);
export default Menu;
