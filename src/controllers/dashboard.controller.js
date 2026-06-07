import mongoose, { Types, get } from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const channel_id = req.user?._id;
  const getTotalViews = await Video.aggregate([
    {
      $match: {
        owner: Types.ObjectId(channel_id),
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
  const totalSubscriber = await Subscription.countDocuments({
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
  const totalLikes = getallLikes.length > 0 ? totalLikes[0].totalLikes : 0;

  const stats = {
    totalViews,
    totalSubscriber,
    totalVideos,
    totalLikes,
  };
  return res
    .status(200)
    .json(new ApiResponse(200, stats, "channel stats feteched"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
});

export { getChannelStats, getChannelVideos };
