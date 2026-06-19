import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on video

  const { videoId } = req.params;

  if (isValidObjectId(videoId) === false) {
    throw new ApiError(400, "Invalid video id");
  }

  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });

  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    return res.status(200).json(new ApiResponse(200, null, "Like removed"));
  }

  await Like.create({
    video: videoId,
    likedBy: req.user._id,
  });

  return res.status(200).json(new ApiResponse(200, null, "Like added"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on comment
  const { commentId } = req.params;

  if (isValidObjectId(commentId) === false) {
    throw new ApiError(400, "Invalid comment id");
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });

  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    return res.status(200).json(new ApiResponse(200, null, "Like removed"));
  }

  await Like.create({
    comment: commentId,
    likedBy: req.user._id,
  });

  return res.status(200).json(new ApiResponse(200, null, "Like added"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on tweet
  const { tweetId } = req.params;

  if (isValidObjectId(tweetId) === false) {
    throw new ApiError(400, "Invalid tweet id");
  }

  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user._id,
  });

  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    return res.status(200).json(new ApiResponse(200, null, "Like removed"));
  }

  await Like.create({
    tweet: tweetId,
    likedBy: req.user._id,
  });

  return res.status(200).json(new ApiResponse(200, null, "Like added"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos

  const userId = req.user._id;

  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
        video: { $exists: true },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoDetails",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
            },
          },
          {
            $project: {
              refreshToken: 0,
              password: 0,
              createdAt: 0,
              updatedAt: 0,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        videoDetails: { $arrayElemAt: ["$videoDetails", 0] },
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, likedVideos, "Liked videos fetched"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
