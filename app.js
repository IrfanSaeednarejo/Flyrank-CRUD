import { ApiError } from "./Utils/apiError.js";
import { ApiResponse } from "./Utils/apiResponse.js";
import { asyncHandler } from "./Utils/asyncHandler.js";

import express from "express";
const app = express();
const PORT = 3000;

const data = []

const getData = asyncHandler(
    async (request, response) => {
        console.log(" get Data");
        const dataInitial = 'Hello Server'
        return response
            .status(200)
            .json(new ApiResponse(200, dataInitial, "Success"))
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
app.get("/tasks", getData);
app.post("/tasks", setData);
app.delete("/tasks/:id", deleteData);
app.put("/tasks/:id", updateData);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});