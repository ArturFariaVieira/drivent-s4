import { notFoundError, PaymentRequiredError, ForbiddenError } from "@/errors";
import bookingRepository from "@/repositories/booking-repository";

async function checkIfHasHotel(userId: number){
    const enrollment = await bookingRepository.findEnrollment(userId)
    if(!enrollment) throw notFoundError();
    const ticket = await bookingRepository.findTicket(enrollment.id)
    if(!ticket) throw notFoundError();
    if (ticket.status !== "PAID" || !ticket.TicketType.includesHotel || ticket.TicketType.isRemote) throw PaymentRequiredError();
    return true;
}

async function getBooking(userId: number){
    const booking = await bookingRepository.findBookingByUserId(userId)
    if(!booking) throw notFoundError();
    return booking;
}

async function postBooking(userId: number, roomId: number){
    const hashotel = await checkIfHasHotel(userId);
    const roomcapacity = await checkRoomCapacity(roomId);
    const reservation = await bookingRepository.createReservation(userId, roomId)
    return reservation;

}

async function checkRoomCapacity(roomId: number){
    const room = await bookingRepository.findRoom(roomId);
    if(!room) throw notFoundError();
    const roomreservations = await bookingRepository.findBookingsByRoomId(roomId);
    if(room.capacity <= roomreservations.length) throw ForbiddenError();
    return true;
    
}

async function changeRoom (userId: number, roomId: number, bookingId: number){
    const booking = await getBookingOrForbidden(userId);
    if(booking.id !== bookingId ) throw ForbiddenError();
    await checkRoomCapacity(roomId);
    const newBooking = await bookingRepository.editBooking(booking.id, roomId)
    return newBooking;
}

async function getBookingOrForbidden(userId: number){
    const booking = await bookingRepository.findBookingByUserId(userId)
    if(!booking) throw ForbiddenError();
    return booking;
}


const bookingService = {
    checkIfHasHotel,
    getBooking,
    postBooking,
    changeRoom
}

export default bookingService;