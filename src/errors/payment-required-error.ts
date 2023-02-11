import { ApplicationError } from "@/protocols";

export function PaymentRequiredError(): ApplicationError {
  return {
    name: "PaymentRequired",
    message: "Your ticket is not paid or does not includes hotel",
  };
}
