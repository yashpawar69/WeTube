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
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
