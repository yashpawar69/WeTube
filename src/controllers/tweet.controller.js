import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { userId } = req.user?._id;
  const { content } = req.body;

  if (!content || content.trim() === "") {
    throw new ApiError(400, "Content is required");
  }
  const newTweet = Tweet.create({
    owner: userId,
    content: content.trim(),
  });
  if (!newTweet) {
    throw new ApiError(500, "Failed to create tweet");
  }
  const populateDoc = await newTweet.populate(
    "owner",
    "username",
    "avatar",
    "fullname"
  );

  return res
    .status(201)
    .json(new ApiResponse(201, populateDoc, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const fetchUserTweets = await Tweet.aggregate([
    {
      $match: {
        owner: new Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
              fullname: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: { $first: "$owner" },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
  };

  const tweetPage = await Tweet.aggregatePaginate(fetchUserTweets, options);

  if (!tweetPage) {
    throw new ApiError(500, "Failed to fetch tweets");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweetPage, "User tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { userId } = req.user?._id;
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!content || content.trim() === "") {
    throw new ApiError(400, "Content is required");
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    {
      _id: new Types.ObjectId(tweetId),
      owner: new Types.ObjectId(userId),
    },
    {
      $set: {
        content: content.trim(),
      },
    },
    {
      new: true,
    }
  );

  if (!updatedTweet) {
    throw new ApiError(500, "Failed to update tweet");
  }

  const populateDoc = await updatedTweet.populate(
    "owner",
    "username",
    "avatar",
    "fullname"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, populateDoc, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { userId } = req.user?._id;
  const { tweetId } = req.params;

  if (!Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(404, "Invalid id");
  }
  const deletedTweet = await Tweet.findByIdAndDelete({
    _id: tweetId,
    owner: userId,
  });
  if (!deletedTweet) {
    throw new ApiError(400, "tweet was not deleted");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, deletedTweet, "Tweet updated successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
