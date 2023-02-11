import { AuthenticatedRequest } from "@/middlewares";
import bookingService from "@/services/booking-service";
import { Response } from "express";
import httpStatus from "http-status";

export async function getBooking(req: AuthenticatedRequest, res: Response){
    const {userId} = req;
    try {
        const hashotel = await bookingService.checkIfHasHotel(userId);
        const booking = await bookingService.getBooking(userId);
        return res.status(httpStatus.OK).send(booking)
    }
    catch(error){
        if(error.name === "NotFoundError"){
            return res.status(httpStatus.NOT_FOUND).send(error);

        }
        if(error.name === "PaymentRequired"){
            return res.status(httpStatus.PAYMENT_REQUIRED).send(error);
            
        }

        
        
    }
    
}

export async function postBooking(req: AuthenticatedRequest, res: Response){
    const {userId} = req;
    const {roomId} = req.body;
    try {
        const postbooking = await bookingService.postBooking(userId, roomId)
        return res.status(httpStatus.OK).send({ id: postbooking.id })
    }
    catch(error){
        if(error.name === "NotFoundError"){
            return res.status(httpStatus.NOT_FOUND).send(error);

        }
        if(error.name === "PaymentRequired"){
            return res.status(httpStatus.PAYMENT_REQUIRED).send(error);
            
        }
        if(error.name === "Forbidden"){
            return res.status(httpStatus.FORBIDDEN).send(error)
        }

        
        
    }
    
}

export async function editBooking (req: AuthenticatedRequest, res: Response){
    const {userId} = req;
    const {roomId} = req.body
    const bookingId = parseInt(req.params.bookingId)
    

    try{
        const newbooking = await bookingService.changeRoom(userId, roomId, bookingId);
        res.status(httpStatus.OK).send({ id: newbooking.id });

    }catch(error){
        if(error.name === "NotFoundError"){
            return res.status(httpStatus.NOT_FOUND).send(error);

        }
        
        if(error.name === "Forbidden"){
            return res.status(httpStatus.FORBIDDEN).send(error)
        }

        
        
    }
}