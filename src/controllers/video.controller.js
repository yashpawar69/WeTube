import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// This function retrieves all videos that match certain criteria.
// It uses an aggregation pipeline to perform the query and data manipulation.
const getAllVideos = asyncHandler(async (req, res) => {
  // Destructure the query parameters from the request object
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  // Create an empty pipeline array to store the aggregation stages
  const pipeline = [];

  // Create a defaultCriteria object that specifies the default conditions for the query
  const defaultCriteria = {
    isPublished: true, // Only return videos that are published
    ...(userId && { owner: new Types.ObjectId(userId) }), // Add a filter to query for videos owned by a specific user
  };

  // If the query parameter is provided, add a $or condition to the defaultCriteria object
  // The $or condition searches for videos whose title or description matches the query string
  if (query) {
    defaultCriteria.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  // Add a $match stage to the pipeline to apply the defaultCriteria conditions
  pipeline.push({ $match: defaultCriteria });

  // Create a sortField object to specify the sorting criteria
  const sortField = {};
  if (sortBy) {
    // If the sortBy parameter is provided, use it to specify the sorting field
    sortField[sortBy] = sortType === "asc" ? 1 : -1;
  } else {
    // If the sortBy parameter is not provided, default to sorting by createdAt in descending order
    sortField.createdAt = -1;
  }

  // Add a $sort stage to the pipeline to apply the sorting criteria
  pipeline.push({ $sort: sortField });

  // Add a $lookup stage to the pipeline to perform a left outer join with the users collection
  // This allows us to retrieve the username and avatar of the video owner
  pipeline.push(
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
            },
          },
        ],
      },
    },
    // Add an $addFields stage to the pipeline to select the first element of the owner array and assign it to the owner field
    // This is necessary because the $lookup stage returns an array of matching documents
    {
      $addFields: {
        owner: { $arrayElemAt: ["$owner", 0] },
      },
    }
  );

  // Create an options object to specify the pagination parameters
  const options = {
    page: parseInt(page) || 1, // Convert the page parameter to an integer, defaulting to 1 if it is not provided
    limit: parseInt(limit) || 10, // Convert the limit parameter to an integer, defaulting to 10 if it is not provided
  };

  // Create a videoAggregate variable to store the aggregation pipeline
  const videoAggregate = Video.aggregate(pipeline);

  // Perform the aggregation query using the aggregation pipeline and pagination options
  const video = await Video.aggregatePaginate(videoAggregate, options);

  // If no videos are found, throw an ApiError with a 404 status code and message
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Return the video data as a JSON response with a success message
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  const { userId } = req.user._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }
  if ([title, description].some((feild) => feild.trim === "")) {
    throw new ApiError(400, "title or description cannot be empty");
  }

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailFileLocalPath = req.files?.thumbnailFile?.[0]?.path;

  if (!videoFileLocalPath) {
    throw new ApiError(400, "video files is required");
  }
  if (!thumbnailFileLocalPath) {
    throw new ApiError(400, "Thumbnail files is required");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnailFile = await uploadOnCloudinary(thumbnailFileLocalPath);

  if (!videoFile?.url || !thumbnailFile?.url) {
    throw new ApiError(500, "upload to cloudinary failed ");
  }
  try {
    const uploadVideo = await Video.create({
      videoFile: {
        public_id: videoFile.public_id,
        url: videoFile.url,
      },
      thumbnail: {
        public_id: thumbnailFile.public_id,
        url: thumbnailFile.url,
      },
      title: title.trim(),
      description: description.trim(),
      owner: req.user._id,
      videoDuration: videoFile.duration,
      views: 0,
      isPublished: true,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, uploadVideo, "Video uploaded successfully"));
  } catch (error) {
    if (videoFile?.public_id) {
      await deleteFromCloudinary(videoFile.public_id);
    }
    if (thumbnailFile?.public_id) {
      await deleteFromCloudinary(thumbnailFile.public_id);
    }
    throw new ApiError(500, "Failed to upload video");
  }
});

/**
 * This function retrieves a video by its ID and performs additional operations on the video data.
 * It first checks if the user is authenticated and increments the video's view count if so.
 * Then it performs multiple aggregation operations on the video data to retrieve additional information.
 *
 * The first aggregation operation matches the video with the given ID and performs a lookup operation to retrieve the comments associated with the video.
 * It sorts the comments by their creation date, limits the number of comments to 10, and performs a lookup operation to retrieve the username and avatar of the comment owner.
 *
 * The second aggregation operation performs a lookup operation to retrieve the likes associated with the video.
 *
 * The third aggregation operation performs a lookup operation to retrieve the username, avatar, and subscriber count of the video owner.
 * It also checks if the authenticated user is subscribed to the owner's channel and adds this information to the video data.
 *
 * Finally, it adds additional fields to the video data, such as the total number of likes and whether the authenticated user has liked the video.
 *
 * If the video with the given ID does not exist, it throws an ApiError. Otherwise, it returns the video data as a JSON response.
 */
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (req.user?._id) {
    await Video.findOneAndUpdate(videoId, { $inc: { views: 1 } });
  }

  const getVideoWithDetails = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
        pipeline: [
          {
            $sort: { createdAt: -1 },
          },
          {
            $limit: 10,
          },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "CommentOwnerDetails",
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
            $addFields: {
              CommentOwnerDetails: { $first: "$CommentOwnerDetails" },
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
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
              avatar: 1,
              username: 1,
            },
          },
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscriberCount: { $size: "$subscribers" },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [
                      new mongoose.Types.ObjectId(req.user._id),
                      "$subscribers.subscriber",
                    ],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              avatar: 1,
              subscriberCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        totalLikes: { $size: "$likes" },
        isLiked: {
          $cond: {
            if: {
              $in: [
                new mongoose.Types.ObjectId(req.user?._id),
                "$likes.likedBy",
              ],
            },
            then: true,
            else: false,
          },
        },
        owner: { $first: "$owner" },
      },
    },
  ]);

  if (getVideoWithDetails.length === 0) {
    throw new ApiError(404, "Video doesn't exist sorry");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        getVideoWithDetails[0],
        "successfully fetched video details"
      )
    );
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description, thumbnail } = req.body;
  const userId = req.user?._id;

  if (
    title.trim() === "" ||
    (!title && thumbnail.trim() === "") ||
    (!thumbnail && !description)
  ) {
    throw new ApiError(400, "Required atleast one field to update");
  }

  const updateData = {};

  if (title) {
    updateData.title = title.trim();
  }

  if (description) {
    updateData.description = description.trim();
  }

  if (thumbnail) {
    updateData.thumbnail = thumbnail.trim();
  }

  const updateVideo = await Video.findOneAndUpdate(
    {
      _id: videoId,
      owner: userId,
    },
    {
      $set: updateData,
    },
    {
      new: true,
    }
  );

  if (!updateVideo) {
    throw new ApiError(
      404,
      "Video not found or you are not authorized to update this video"
    );
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, updateVideo, "Successfully updated video details")
    );
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  const userId = req.user?._id;
  await Video.findByIdAndDelete({
    _id: videoId,
    owner: userId,
  });
  if (!Video) {
    throw new ApiError(404, "Video not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  const toggleStatus = await Video.findOneAndUpdate(
    {
      _id: videoId,
      owner: userId,
    },
    [
      {
        $set: {
          isPublished: { $not: "$isPublished" },
        },
      },
    ],
    {
      new: true,
    }
  );

  if (!video) {
    throw new ApiError(
      404,
      "Video not found or you are not authorized to update this video"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, toggleStatus, "Successfully toggled publish status")
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
