import { Router } from "express";
import { authenticateToken } from "@/middlewares";
import { getBooking, postBooking, editBooking } from "@/controllers";
import { validateBody } from "@/middlewares";
import { roomSchema } from "@/schemas";

const bookingRouter = Router();

bookingRouter
  .all("/*", authenticateToken)
  .get("/", getBooking)
  .post("/", validateBody(roomSchema), postBooking)
  .put("/:bookingId", validateBody(roomSchema), editBooking)

export { bookingRouter };
