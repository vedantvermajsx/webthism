# Week 2: Database Basics & Simple CRUD API (MongoDB)

This project implements a simple Todo REST API with a MongoDB database using Mongoose.

## Prerequisites
- Node.js installed
- MongoDB installed and running locally (or a remote URI)

## Getting Started

1. **Environment Variables**
   Create a `.env` file or set the `MONGO_URI` environment variable.
   ```
   MONGO_URI=mongodb://localhost:27017/todo-app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```
   
3. **Run the Server**
   ```bash
   npm start
   ```
   The server will start at `http://localhost:3000`.

## API Endpoints

- `GET /api/todos`: Fetch all todos with user info (populated).
- `GET /api/todos/:id`: Fetch a single todo by its MongoDB ObjectId.
- `POST /api/todos`: Create a new todo (requires `user` ObjectId, `title`).
- `PUT /api/todos/:id`: Update an existing todo.
- `DELETE /api/todos/:id`: Delete a todo.

## Project Structure
- `db.js`: Database connection using Mongoose.
- `models/`: Mongoose schemas for `User` and `Todo`.
- `seed.js`: Sample data population script.
- `index.js`: Server entry point.
- `todoSchema.js`: Request validation using Zod.
- `errorHandler.js`: Global error handling.
- `routes/todoRoutes.js`: CRUD logic using Mongoose models.
