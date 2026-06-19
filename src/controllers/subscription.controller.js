import mongoose from "mongoose";
// FIX: `Types` was destructured nowhere — imported from mongoose directly
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // FIX: `req.user?.id` should be `req.user?._id` (Mongoose uses _id).
  // Also `const { subscriberId } = req.user?._id` tried to destructure a
  // property called `subscriberId` off an ObjectId — that always gives
  // undefined. Just read it directly.
  const subscriberId = req.user?._id;

  if (!subscriberId) {
    throw new ApiError(401, "Unauthorized");
  }

  if (channelId.toString() === subscriberId.toString()) {
    throw new ApiError(400, "You cannot subscribe to yourself");
  }

  const existing = await Subscription.findOne({
    subscriber: new mongoose.Types.ObjectId(subscriberId),
    channel: new mongoose.Types.ObjectId(channelId),
  });

  // FIX: the original only handled the "subscribe" case. When the user was
  // already subscribed nothing happened — no delete, no response. Added the
  // unsubscribe branch so the toggle actually works in both directions.
  if (existing) {
    await Subscription.deleteOne({ _id: existing._id });
    return res
      .status(200)
      .json(
        new ApiResponse(200, { subscribed: false }, "Unsubscribed successfully")
      );
  }

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
      new ApiResponse(200, { subscribed: true }, "Subscribed successfully")
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const subscriptionList = Subscription.aggregate([
    {
      $match: {
        // FIX: typo `chanel` → `channel`
        channel: new mongoose.Types.ObjectId(channelId),
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
      // FIX: `$unwind: "userDetails"` was missing the `$` path prefix —
      // MongoDB requires `"$userDetails"` or `{ path: "$userDetails" }`.
      $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        _id: 0,
        userDetails: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  // FIX: `Subscription.aggregatePaginate` was called on the raw pipeline
  // without `await`, so the controller always resolved immediately with a
  // pending Promise. Added `await`.
  const subscribersList = await Subscription.aggregatePaginate(
    subscriptionList,
    options
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribersList, "Subscribers fetched successfully")
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!mongoose.isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber ID");
  }

  const subscribedChannels = Subscription.aggregate([
    {
      $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) },
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
      // FIX: same $unwind missing-$ bug as above
      $unwind: {
        path: "$subscribedUserDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        subscribedUserDetails: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  // FIX: same missing `await` as getUserChannelSubscribers
  const subscribedToList = await Subscription.aggregatePaginate(
    subscribedChannels,
    options
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedToList,
        "Subscribed channels fetched successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
