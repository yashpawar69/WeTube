import { Router } from "express";
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewears/auth.middleware.js";
import { checkValidObjectId } from "../middlewears/ValidateObjectId.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
  .route("/:videoId")
  .get(checkValidObjectId(["videoId"]), getVideoComments)
  .post(checkValidObjectId(["videoId"]), addComment);
router
  .route("/c/:commentId")
  .delete(checkValidObjectId(["commentId"]), deleteComment)
  .patch(checkValidObjectId(["commentId"]), updateComment);
export default router;
