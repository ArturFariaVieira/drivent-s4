import { Enrollment, Booking } from "@prisma/client";
import { prisma } from "@/config";
import { exclude } from "@/utils/prisma-utils";


async function findEnrollment(userId: number){
    return await prisma.enrollment.findFirst({
        where: {
            userId
        }
    })
}

async function findTicket(enrollmentId:number){
    return await prisma.ticket.findFirst({
        where:{
            enrollmentId
        },
        include: {
            TicketType: true,
        }
    })
}

async function findBookingByUserId(userId: number){
    return  await prisma.booking.findFirst({
        where: {
            userId
        },
        select: {
            id: true,
            Room: {
                select: {
                    id: true,
                    name: true,
                    capacity: true,
                    hotelId: true,
                }
                }

            }                 
        })
    }


async function findRoom(roomId:number){
    return await prisma.room.findFirst({
        where: {
            id: roomId
        },
        select: {
            capacity: true
        }
    })
}

async function findBookingsByRoomId(roomId: number){
    return await prisma.booking.findMany({
        where: {
            roomId
        }
    })
}

async function createReservation(userId: number, roomId: number){
    return await prisma.booking.create({
        data: {
            userId: userId,
            roomId: roomId,

        }
    })
}

async function editBooking(bookingId: number, roomId: number){
    return await prisma.booking.update({
        data: {
            roomId,
        },

        where: {
            id: bookingId
        }
    })
}

const bookingRepository = {
    findEnrollment,
    findTicket,
    findBookingByUserId,
    findRoom,
    findBookingsByRoomId,
    createReservation,
    editBooking
};

export default bookingRepository