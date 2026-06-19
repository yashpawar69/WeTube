import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// 1. Create Tweet
const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) throw new ApiError(400, "Content is required");

  const tweet = await Tweet.create({
    content: content.trim(),
    owner: req.user?._id,
  });
  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

// 2. Get User Tweets (FIXED 500 error aggregation cast issue)
const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.isValidObjectId(userId))
    throw new ApiError(400, "Invalid User ID format");

  const tweets = await Tweet.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(userId) } }, // Fixed casting crash
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [{ $project: { username: 1, fullName: 1, avatar: 1 } }],
      },
    },
    { $addFields: { owner: { $arrayElemAt: ["$owner", 0] } } },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});

// 3. Update Tweet
const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;
  if (!content?.trim()) throw new ApiError(400, "Content cannot be empty");

  const tweet = await Tweet.findOneAndUpdate(
    { _id: tweetId, owner: req.user?._id },
    { $set: { content: content.trim() } },
    { new: true }
  );
  if (!tweet) throw new ApiError(404, "Tweet not found or unauthorized");

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

// 4. Delete Tweet
const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const tweet = await Tweet.findOneAndDelete({
    _id: tweetId,
    owner: req.user?._id,
  });
  if (!tweet) throw new ApiError(404, "Tweet not found or unauthorized");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
