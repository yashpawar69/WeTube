import { Router } from "express";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewears/auth.middleware.js";
import { checkValidObjectId } from "../middlewears/ValidateObjectId.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
  .route("/c/:channelId")
  .get(checkValidObjectId(["channelId"]), getSubscribedChannels)
  .post(checkValidObjectId(["channelId"]), toggleSubscription);

router
  .route("/u/:subscriberId")
  .get(checkValidObjectId(["subscriberId"]), getUserChannelSubscribers);
export default router;
