import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
  //TODO: build a healthcheck response that simply returns the OK status as json with a message
  const dbstatus = mongoose.connection.readyState;

  if (dbstatus !== 1) {
    throw new ApiError(500, "Database is not connected");
  }
  return res.status(200).json(new ApiResponse(200, { status: "OK", dbstatus }));
});

export { healthcheck };
