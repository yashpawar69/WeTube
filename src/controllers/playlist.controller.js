import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  //TODO: create playlist

  const { description } = req.body;

  let { name } = req.body;

  if (!name || name.trim === "") {
    name = `New playlist - ${new Date().toLocaleDateString()}`;
  }

  const playlist = await Playlist.create({
    name: name.trim(),
    description: description || "",
    videos: [],
    owner: req.user._id,
  });

  if (!playlist) {
    throw new ApiError(500, "Failed to create playlist");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists
  const playlists = await Playlist.aggregate([
    {
      $match: {
        owner: new Types.ObjectId(userId),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $addFields: {
        videoCount: { $size: "$videos" },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        playlists ? playlists : [],
        "Playlists fetched successfully"
      )
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    _id: 1,
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
              ownerDetails: { $first: "$owneriDetails" },
            },
          },
        ],
      },
    },
  ]);
  if (!playlist || playlist.length === 0) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist[0] || null, "Playlist fetched successfully")
    );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: add video to playlist
  if (!playlistId || !videoId) {
    throw new ApiError(400, "Playlist ID and Video ID are required");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to add video to this playlist"
    );
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video already exists in playlist");
  }
  playlist.videos.push(videoId);
  await playlist.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Video added to playlist successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
  if (!playlistId || !videoId) {
    throw new ApiError(400, "Playlist ID and Video ID are required");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to remove video from this playlist"
    );
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (!playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video does not exist in playlist");
  }
  playlist.videos.pull(videoId);
  await playlist.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Video removed from playlist successfully")
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
  if (!playlistId) {
    throw new ApiError(400, "Playlist ID is required");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this playlist");
  }
  await Playlist.findByIdAndDelete(playlistId);
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
  if (!playlistId) {
    throw new ApiError(400, "Playlist ID is required");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this playlist");
  }
  if (name) {
    playlist.name = name;
  }
  if (description) {
    playlist.description = description;
  }
  await playlist.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
