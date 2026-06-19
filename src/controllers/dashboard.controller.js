import mongoose from "mongoose";
// FIX: original imported `{ Types, get }` — `get` doesn't exist on mongoose
// and `Types` is accessed as `mongoose.Types` below anyway.
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const channel_id = req.user?._id;

  const getTotalViews = await Video.aggregate([
    {
      $match: {
        // FIX: `Types.ObjectId(channel_id)` was called without `new` —
        // in current mongoose versions this throws TypeError. Needs `new`.
        owner: new mongoose.Types.ObjectId(channel_id),
      },
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: "$views" },
      },
    },
  ]);

  const totalViews = getTotalViews.length > 0 ? getTotalViews[0].totalViews : 0;

  const totalSubscribers = await Subscription.countDocuments({
    channel: channel_id,
  });

  const totalVideos = await Video.countDocuments({ owner: channel_id });

  const getallLikes = await Like.aggregate([
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoInfo",
      },
    },
    {
      $unwind: "$videoInfo",
    },
    {
      $match: {
        "videoInfo.owner": new mongoose.Types.ObjectId(channel_id),
      },
    },
    {
      $count: "totalLikes",
    },
  ]);

  // FIX: original wrote `const totalLikes = ... ? totalLikes[0].totalLikes : 0`
  // — this referenced `totalLikes` in its own initialiser before it was ever
  // assigned, which always evaluates to 0 regardless of the query result.
  // Must reference `getallLikes` (the array returned by aggregate).
  const totalLikes = getallLikes.length > 0 ? getallLikes[0].totalLikes : 0;

  const stats = {
    totalViews,
    // FIX: was `totalSubscriber` (singular) — normalised to `totalSubscribers`
    // to match the frontend dashboard which reads `stats.totalSubscribers`.
    totalSubscribers,
    totalVideos,
    totalLikes,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "Channel stats fetched"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;
  const { page = 1, limit = 10 } = req.query;

  if (!channelId) {
    throw new ApiError(400, "Channel ID is required");
  }

  const getallvideos = Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerInfo",
      },
    },
    {
      // FIX: `$unwind: "$ownerInfo", preserveNullAndEmptyArrays: true` put
      // `preserveNullAndEmptyArrays` as a sibling key to `$unwind` inside
      // the stage object — MongoDB ignores extra keys at the stage level.
      // Both options must live inside the `$unwind` value object.
      $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        videoFile: 1,
        title: 1,
        description: 1,
        thumbnail: 1,
        duration: 1,
        views: 1,
        createdAt: 1,
        isPublished: 1,
        ownerInfo: 1,
      },
    },
  ]);

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const videos = await Video.aggregatePaginate(getallvideos, options);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched"));
});

export { getChannelStats, getChannelVideos };
