import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

const checkValidObjectId = (givenObjectId) => async (req, res, next) => {
  const isValid = givenObjectId.find(
    (id) => !mongoose.isValidObjectId(req.params[id])
  );
  if (isValid) {
    return next(new ApiError(`Invalid Object Id ${isValid}`, 400));
  }
  next();
};

export { checkValidObjectId };
