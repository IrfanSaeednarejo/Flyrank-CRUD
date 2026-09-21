import { ApiError } from "./Utils/apiError.js";
import { ApiResponse } from "./Utils/apiResponse.js";
import { asyncHandler } from "./Utils/asyncHandler.js";
import swagger from "swagger-ui-express"

import express from "express";
const app = express();
const PORT = 3000;

let tasks = [
    { id: 1, title: "Buy milk", done: false },
    { id: 2, title: "Walk the dog", done: true },
    { id: 3, title: "Finish Express assignment", done: false },
    { id: 4, title: "Read Node.js docs", done: true },
    { id: 5, title: "Call mom", done: false },
    { id: 6, title: "Pay electricity bill", done: true },
    { id: 7, title: "Grocery shopping", done: false },
    { id: 8, title: "Clean the kitchen", done: true },
    { id: 9, title: "Write weekly report", done: false },
    { id: 10, title: "Book dentist appointment", done: false }
];


const getData = asyncHandler(async (request, response) => {
    console.log(" get Data");
    const dataInitial = 'Hello Server'
    return response
        .status(200)
        .json(new ApiResponse(200, tasks, "Success"))
})
const getDataById = asyncHandler(async (request, response) => {
    const { id } = request.params;
    const task = tasks.find((task) => task.id == id);
    if (!task) {
        throw new ApiError(404, `Task ${id} not found`);
    }
    return response
        .status(200)
        .json(new ApiResponse(200, task, "Success"))
})
const setData = (request, response) => {
    console.log(" setData");
}

async function deleteData(request, response) {
    console.log(" delete Data");
}

async function updateData(request, response) {
    console.log(" update Data");
}





// App routes
app.get("/", asyncHandler(async (request, response) => {
    console.log("Working");
    const dataInitial = { "name": "Task API", "version": "1.0", "endpoints": ["/tasks"] };
    return response
        .status(200)
        .json(new ApiResponse(200, dataInitial, "Welcome to the Task API"))
}))
app.get("/tasks", getData);
app.get("/tasks/:id", getDataById)
app.post("/tasks", setData);
app.delete("/tasks/:id", deleteData);
app.put("/tasks/:id", updateData);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});