import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID format");
  }

  // DYNAMIC BYPASS: Agar standard import undefined ho raha hai,
  // toh direct registered mongoose model instance uthao!
  const CommentModel = mongoose.models.Comment || mongoose.model("Comment");

  if (!CommentModel) {
    throw new ApiError(500, "Comment model registry could not be loaded");
  }

  // Ab standard aggregation direct bypass component par chalegi
  const commentAggregate = CommentModel.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
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
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: { $arrayElemAt: ["$owner", 0] },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
  };

  const comments = await CommentModel.aggregatePaginate(
    commentAggregate,
    options
  );

  if (!comments) {
    throw new ApiError(404, "Comments not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video

  const videoId = req.params.videoId;

  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  const comment = await Comment.create({
    content: content.trim(),
    video: videoId,
    owner: req.user._id,
  });

  if (!comment) {
    throw new ApiError(500, "Failed to add comment");
  }

  res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const commentId = req.params.commentId;
  const { newContent } = req.body;

  if (!newContent) {
    throw new ApiError(400, "Content is required");
  }

  const comment = await Comment.findByIdAndUpdate(
    commentId,
    {
      content: content.trim(),
    },
    {
      new: true,
    }
  );

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (comment?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this comment");
  }

  //don't need to check if user exists or not ;as it is done by the middleware

  const Updatedcomment = await Comment.findByIdAndUpdate(
    commentId,
    {
      content: newContent,
    },
    { new: true }
  );

  if (!Updatedcomment) {
    throw new ApiError(500, "Error while updating comment, Please try again");
  }

  res
    .status(200)
    .json(new ApiResponse(200, Updatedcomment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const commentId = req.params.commentId;

  if (!mongoose.isValidObjectId(commentId) || !commentId) {
    throw new ApiError(400, "Invalid comment id");
  }

  const comment = await Comment.findByIdAndDelete(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (comment?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  const deletedComment = await Comment.findOneAndDelete({
    _id: commentId,
    owner: req.user?._id,
  });

  if (!deletedComment) {
    throw new ApiError(500, "Error while deleting comment, Please try again");
  }

  res
    .status(200)
    .json(new ApiResponse(200, deletedComment, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
