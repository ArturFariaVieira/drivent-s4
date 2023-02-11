import Joi from "joi";

export const roomSchema = Joi.object({
  roomId: Joi.number().min(1).required(),
  
});
