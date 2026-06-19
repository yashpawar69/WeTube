import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

import deleteFromCloudinary from "../utils/deleteFromCloudinary.js";

// 1. Get All Videos with custom paginate pipeline
const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  const pipeline = [];

  const defaultCriteria = {
    isPublished: true,
    ...(userId && { owner: new mongoose.Types.ObjectId(userId) }),
  };

  if (query) {
    defaultCriteria.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  pipeline.push({ $match: defaultCriteria });

  const sortField = {};
  if (sortBy) {
    sortField[sortBy] = sortType === "asc" ? 1 : -1;
  } else {
    sortField.createdAt = -1;
  }
  pipeline.push({ $sort: sortField });

  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [{ $project: { username: 1, fullName: 1, avatar: 1 } }],
      },
    },
    { $addFields: { owner: { $arrayElemAt: ["$owner", 0] } } }
  );

  const options = { page: parseInt(page) || 1, limit: parseInt(limit) || 10 };
  const videoAggregate = Video.aggregate(pipeline);
  const video = await Video.aggregatePaginate(videoAggregate, options);

  if (!video) throw new ApiError(404, "Videos not found");

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Videos fetched successfully"));
});

// 2. Publish a Video (Fixed core 401 and Multer properties bugs)
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const userId = req.user?._id; // FIXED: Destructuring issue resolved completely

  if (!userId) throw new ApiError(401, "Unauthorized request");
  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title or description cannot be empty");
  }

  // Fallback checks for incoming field names from Frontend
  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailFileLocalPath =
    req.files?.thumbnail?.[0]?.path || req.files?.thumbnailFile?.[0]?.path;

  if (!videoFileLocalPath) throw new ApiError(400, "Video file is required");
  if (!thumbnailFileLocalPath)
    throw new ApiError(400, "Thumbnail file is required");

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnailFile = await uploadOnCloudinary(thumbnailFileLocalPath);

  if (!videoFile?.url || !thumbnailFile?.url) {
    throw new ApiError(500, "Upload to Cloudinary failed");
  }

  try {
    // FIXED: Schema ke exact structure (nested object) ke mutabik data pass kiya hai
    const uploadVideo = await Video.create({
      videoFile: {
        url: videoFile.url,
        public_id: videoFile.public_id, // Yeh mandatory field missing tha!
      },
      thumbnail: {
        url: thumbnailFile.url,
        public_id: thumbnailFile.public_id, // Yeh bhi mandatory tha!
      },
      title: title.trim(),
      description: description.trim(),
      owner: userId,
      duration: videoFile.duration || 0, // Schema me 'duration' hi hai, so we keep it
      views: 0,
      isPublished: true,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, uploadVideo, "Video uploaded successfully 🎉")
      );
  } catch (error) {
    console.error("MongoDB Save Crash Error Logs:", error); // Dev logging ke liye

    // Agar DB save fail hua toh Cloudinary se garbage files delete karo
    if (videoFile?.public_id) {
      await deleteFromCloudinary(videoFile.public_id);
    }
    if (thumbnailFile?.public_id) {
      await deleteFromCloudinary(thumbnailFile.public_id);
    }
    throw new ApiError(500, "Failed to save video configuration to database");
  }
});

// 3. Get Video By ID
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!mongoose.isValidObjectId(videoId))
    throw new ApiError(400, "Invalid Video ID");

  if (req.user?._id) {
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
  }

  const getVideoWithDetails = await Video.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(videoId) } },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
        pipeline: [
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
              pipeline: [{ $project: { username: 1, avatar: 1 } }],
            },
          },
          { $addFields: { ownerDetails: { $first: "$ownerDetails" } } },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $addFields: { owner: { $first: "$owner" } } },
  ]);

  if (!getVideoWithDetails.length)
    throw new ApiError(404, "Video doesn't exist");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        getVideoWithDetails[0],
        "Successfully fetched details"
      )
    );
});

// 4. Update Video
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  const userId = req.user?._id;

  const updateData = {};
  if (title) updateData.title = title.trim();
  if (description) updateData.description = description.trim();

  const updatedVideo = await Video.findOneAndUpdate(
    { _id: videoId, owner: userId },
    { $set: updateData },
    { new: true }
  );

  if (!updatedVideo) throw new ApiError(404, "Video not found or unauthorized");
  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Successfully updated details"));
});

// 5. Delete Video (Fixed filter object Mongoose bug)
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  // FIXED: Direct query targeting matching attributes cleanly
  const videoToDelete = await Video.findOne({ _id: videoId, owner: userId });
  if (!videoToDelete)
    throw new ApiError(404, "Video not found or unauthorized");

  await Video.findByIdAndDelete(videoId);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

// 6. Toggle Publish Status
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  const toggleStatus = await Video.findOneAndUpdate(
    { _id: videoId, owner: userId },
    [{ $set: { isPublished: { $not: "$isPublished" } } }],
    { new: true }
  );

  if (!toggleStatus) throw new ApiError(404, "Video not found or unauthorized");
  return res
    .status(200)
    .json(new ApiResponse(200, toggleStatus, "Toggled publish status"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
