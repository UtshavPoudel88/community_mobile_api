const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.LOCAL_DATABASE_URI); 
        console.log(
            `MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold
        );
    } catch (error) {
        console.error(`connection Error: ${error.message}`.red.bold);
        process.exit(1);
    }
};

module.exports = connectDB