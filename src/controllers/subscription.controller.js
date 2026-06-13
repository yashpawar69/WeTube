import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription
  const { subscriberId } = req.user?.id;
  if (!subscriberId) {
    throw new ApiError(400, "User not found");
  }
  if (channelId.toString() === subscriberId.toString()) {
    throw new ApiError(400, "You cannot subscribe to yourself");
  }
  const isSubscribed = await Subscription.findOne({
    $and: [
      { subscriber: new Types.ObjectId(subscriberId) },
      { channel: new Types.ObjectId(channelId) },
    ],
  });
  if (!isSubscribed) {
    const newSubscription = await Subscription.create({
      subscriber: subscriberId,
      channel: channelId,
    });

    if (!newSubscription) {
      throw new ApiError(500, "Failed to subscribe. Please try again");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, { subscribed: true }, "Successfully Subscribed.")
      );
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const subscriptionList = Subscription.aggregate([
    {
      $match: {
        chanel: new Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "userDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "userDetails",
    },
    {
      $project: {
        _id: 0,
        userDetails: 1,
      },
    },
    {
      $sort: { subscribedAt: -1 },
    },
  ]);
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };
  const subscribedChannelsList = await Subscription.aggregatePaginate(
    subscriptionList,
    options
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannelsList,
        "Subscribed channels fetched successfully"
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const subscribedChannels = Subscription.aggregate([
    {
      $match: { subscriber: new Types.ObjectId(subscriberId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribedUserDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "subscribedUserDetails",
    },
    {
      $project: {
        _id: 0,
        subscribedUserDetails: 1,
      },
    },
    {
      $sort: { subscribedAt: -1 },
    },
  ]);

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };
  const SubscribedToList = await Subscription.aggregatePaginate(
    subscribedChannels,
    options
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        SubscribedToList,
        "Subscribed channels fetched successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
