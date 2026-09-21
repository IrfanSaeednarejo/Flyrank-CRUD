import { ApiError } from "./Utils/apiError.js";
import { ApiResponse } from "./Utils/apiResponse.js";
import { asyncHandler } from "./Utils/asyncHandler.js";
import express from "express";
import swaggerUi from "swagger-ui-express";
import openapiSpec from "./openapi.json" with { type: "json" };
const app = express();
const PORT = 3000;
app.use(express.json());
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

//get Data All
const getData = asyncHandler(async (request, response) => {
    console.log(" get Data");
    const dataInitial = 'Hello Server'
    return response
        .status(200)
        .json(new ApiResponse(200, tasks, "Success"))
})

//get Data by ID
const getDataById = asyncHandler(async (request, response) => {
    const { id } = request.params;
    const task = tasks.find((task) => task.id === Number(id));
    if (!task) {
        throw new ApiError(404, `Task ${id} not found`);
    }
    return response
        .status(200)
        .json(new ApiResponse(200, task, "Success"))
})

//POST DATA
const setData = asyncHandler(async (request, response) => {
    const { title } = request.body;
    if (!title) {
        throw new ApiError(400, "Title is required");
    }
    const task = { id: tasks.length + 1, title, done: false };
    const updatedTasks = [...tasks, task];
    tasks = updatedTasks;
    return response
        .status(201)
        .json(new ApiResponse(201, task, "Task created successfully"))
})

const deleteData = asyncHandler(async (request, response) => {
    const { id } = request.params;
    if (!id) {
        throw new ApiError(400, "Id is required");
    }
    let updatedTasks = tasks.filter((task) => task.id !== Number(id));
    tasks = updatedTasks;

    return response
        .status(200)
        .json(new ApiResponse(204, updatedTasks, "Task deleted successfully"))
})

const updateData = asyncHandler(async (request, response) => {
    const { id } = request.params;
    const { title, done } = request.body;

    const idTask = tasks.find((task) => task.id === Number(id));

    if (title === undefined && done === undefined) {
        throw new ApiError(400, "Nothing to update");
    }
    if (!idTask) {
        throw new ApiError(404, `Task ${id} not found`);
    }
    if (title !== undefined) idTask.title = title;
    if (done !== undefined) idTask.done = done;

    const updatedTasks = tasks.map((task) => task.id === idTask.id ? idTask : task);
    tasks = updatedTasks;
    return response
        .status(200)
        .json(new ApiResponse(200, idTask, "Task updated successfully"))
})





// App routes
app.get("/", asyncHandler(async (request, response) => {
    console.log("Working");
    const dataInitial = { "name": "Task API", "version": "1.0", "endpoints": ["/tasks"] };
    return response
        .status(200)
        .json(new ApiResponse(200, dataInitial, "Welcome to the Task API"))
}))
app.get("/health", asyncHandler(async (request, response) => {
    return response
        .status(200)
        .json(new ApiResponse(200, { status: "ok" }, "Server is healthy"));
}));
app.get("/tasks", getData);
app.get("/tasks/:id", getDataById)
app.post("/tasks", setData);
app.delete("/tasks/:id", deleteData);
app.put("/tasks/:id", updateData);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});