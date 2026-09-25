import { Router, Request, Response } from "express";
import { asyncHandler } from "../../Utils/asyncHandler"
import { ApiResponse } from "../../Utils/apiResponse"


export const healthRouter = Router();

healthRouter.get("/health", asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(new ApiResponse(200, { ok: true, ts: Date.now() }, "Health is OK"));
}));
