import { ApplicationError } from "@/protocols";

export function ForbiddenError(): ApplicationError {
  return {
    name: "Forbidden",
    message: "Room is full or you do not have a reservation",
  };
}
