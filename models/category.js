import mongoose, { Schema } from 'mongoose';

const categorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true,
    },
    slug:{
        type:String,
        lowercase:true,
    },
})

const Category = new mongoose.model('category', categorySchema);

export default Category;