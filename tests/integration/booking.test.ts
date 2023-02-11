import app, { init } from "@/app";
import { prisma } from "@/config";
import faker from "@faker-js/faker";
import httpStatus from "http-status";
import * as jwt from "jsonwebtoken";
import supertest from "supertest";
import { exclude } from "@/utils/prisma-utils";
import {
  createEnrollmentWithAddress,
  createUser,
  createTicketType,
  createTicket,
  createHotel,
  createRoomWithHotelId,
  createBooking,
  createRoomWithHotelIdAndSingleCapacity,
} from "../factories";
import { cleanDb, generateValidToken } from "../helpers";

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe("GET /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  }),

    describe("when token is valid", () => {
      it("should respond with 404 when user has no enrollment", async () => {
        const user = await createUser()
        const token = await generateValidToken(user);
        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
        expect(response.status).toBe(httpStatus.NOT_FOUND);
      });

      it("should respond with status 404 when user has no ticket", async () => {

        const user = await createUser();
        await createEnrollmentWithAddress(user);
        const token = await generateValidToken(user);
        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.NOT_FOUND);
      });

      it("should respond with status 402 if the ticket is not yet paid", async () => {

        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketType();

        await createTicket(enrollment.id, ticketType.id, "RESERVED");
        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
        expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
      });

      it("should respond with status 402 when ticket does not include hotel reservation", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: faker.datatype.boolean(),
            includesHotel: false,
          },
        })

        await createTicket(enrollment.id, ticketType.id, "RESERVED");

        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
      });

      it("should respond with status 402 when the ticket is for remote participation", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: true,
            includesHotel: faker.datatype.boolean(),
          },
        });

        await createTicket(enrollment.id, ticketType.id, "RESERVED");

        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
      });
      it("should respond with status 404 when user has no booking", async () => {

        const user = await createUser();
        const enrollment = await createEnrollmentWithAddress(user);
        const token = await generateValidToken(user);
        const ticketType = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: false,
            includesHotel: true,
          },
        });

        await createTicket(enrollment.id, ticketType.id, "PAID");

        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.NOT_FOUND);
      });

      it("should respond with status 200 and booking info when user has a booking", async () => {

        const user = await createUser();
        const enrollment = await createEnrollmentWithAddress(user);
        const token = await generateValidToken(user);
        const ticketType = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: false,
            includesHotel: true,
          },
        });

        await createTicket(enrollment.id, ticketType.id, "PAID");
        const hotel = await createHotel()
        const room = await createRoomWithHotelId(hotel.id)
        const roomWithoutDates = { ...exclude(room, "createdAt", "updatedAt") }
        const booking = await createBooking(user.id, room.id)

        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual(
          expect.objectContaining({
            id: booking.id,
            Room: roomWithoutDates
          })
        );
      });
    })
})
describe("POST /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  }),

    describe("when token is valid", () => {
      it("should respond with 404 when user has no enrollment", async () => {
        const user = await createUser()
        const token = await generateValidToken(user);
        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({roomId: 3});
        expect(response.status).toBe(httpStatus.NOT_FOUND);
      });

      it("should respond with status 404 when user has no ticket", async () => {

        const user = await createUser();
        await createEnrollmentWithAddress(user);
        const token = await generateValidToken(user);
        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({roomId: 3});

        expect(response.status).toBe(httpStatus.NOT_FOUND);
      });

      it("should respond with status 402 if the ticket is not yet paid", async () => {

        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketType();

        await createTicket(enrollment.id, ticketType.id, "RESERVED");
        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({roomId: 3});
        expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
      });

      it("should respond with status 402 when ticket does not include hotel reservation", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: faker.datatype.boolean(),
            includesHotel: false,
          },
        })

        await createTicket(enrollment.id, ticketType.id, "RESERVED");

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({roomId: 3});

        expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
      });

      it("should respond with status 402 when the ticket is for remote participation", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: true,
            includesHotel: faker.datatype.boolean(),
          },
        });

        await createTicket(enrollment.id, ticketType.id, "RESERVED");

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({roomId: 3});

        expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
      });

      it("should respond with status 404 if provided roomId does not exists ", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: false,
            includesHotel: true,
          },
        });

        await createTicket(enrollment.id, ticketType.id, "PAID");
        const hotel = await createHotel()
        const room = await createRoomWithHotelId(hotel.id)
        const roomWithoutDates = { ...exclude(room, "createdAt", "updatedAt") }
        const booking = await createBooking(user.id, room.id)

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: 99999 });

        expect(response.status).toEqual(httpStatus.NOT_FOUND)
      });

      it("should respond with status 400 if invalid body", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: false,
            includesHotel: true,
          },
        });

        await createTicket(enrollment.id, ticketType.id, "PAID");
        const hotel = await createHotel()
        const room = await createRoomWithHotelId(hotel.id)
        const roomWithoutDates = { ...exclude(room, "createdAt", "updatedAt") }
        const booking = await createBooking(user.id, room.id)

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ notRoomId: 3 });

        expect(response.status).toEqual(httpStatus.BAD_REQUEST)
      });

      it("should respond with status 403 desired room is full", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: false,
            includesHotel: true,
          },
        });

        await createTicket(enrollment.id, ticketType.id, "PAID");
        const hotel = await createHotel()
        const room = await createRoomWithHotelIdAndSingleCapacity(hotel.id)
        const roomWithoutDates = { ...exclude(room, "createdAt", "updatedAt") }
        const booking = await createBooking(user.id, room.id)

        const user2 = await createUser();
        const token2 = await generateValidToken(user2);
        const enrollment2 = await createEnrollmentWithAddress(user2);
        const ticketType2 = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: false,
            includesHotel: true,
          },
        });

        await createTicket(enrollment2.id, ticketType2.id, "PAID");

        const response = await server.post("/booking").set("Authorization", `Bearer ${token2}`).send({ roomId: room.id });
        console.log(response)

        expect(response.status).toEqual(httpStatus.FORBIDDEN)
      });

      it("should respond with status 200 and booking id when passed validations", async () => {

        const user = await createUser();
        const enrollment = await createEnrollmentWithAddress(user);
        const token = await generateValidToken(user);
        const ticketType = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: false,
            includesHotel: true,
          },
        })

        await createTicket(enrollment.id, ticketType.id, "PAID");
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        console.log(room)
        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: room.id });


        expect(response.body).toEqual(expect.objectContaining({
          id: expect.any(Number)
        }))

        expect(response.status).toBe(httpStatus.OK);

      });
    })
})

describe("PUT /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.put("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.put("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.put("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  }),

    describe("when token is valid", () => {

      it("should respond with status 404 if user does not own a reservation", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel()
        const room = await createRoomWithHotelId(hotel.id)
        const response = await server.put(`/booking/999999`).set("Authorization", `Bearer ${token}`).send({roomId: room.id})
        expect(response.status).toEqual(httpStatus.FORBIDDEN)

      })

      it("should respond with status 404 if provided roomId does not exists ", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: false,
            includesHotel: true,
          },
        });
        await createTicket(enrollment.id, ticketType.id, "PAID");
        const hotel = await createHotel()
        const room = await createRoomWithHotelId(hotel.id)
        const booking = await createBooking(user.id, room.id)

        const response = await server.put(`/booking/${booking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: 99999 });

        expect(response.status).toEqual(httpStatus.NOT_FOUND)
      });

      it("should respond with status 400 if invalid body", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: false,
            includesHotel: true,
          },
        });

        await createTicket(enrollment.id, ticketType.id, "PAID");
        const hotel = await createHotel()
        const room = await createRoomWithHotelId(hotel.id)
        const booking = await createBooking(user.id, room.id)

        const response = await server.put(`/booking/${booking.id}`).set("Authorization", `Bearer ${token}`).send({ notRoomId: room.id });

        expect(response.status).toEqual(httpStatus.BAD_REQUEST)
      });

      it("should respond with status 403 if bookingId provided does not belong to the user", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: false,
            includesHotel: true,
          },
        });

        await createTicket(enrollment.id, ticketType.id, "PAID");


        const hotel = await createHotel()
        const room = await createRoomWithHotelIdAndSingleCapacity(hotel.id)
        const booking = await createBooking(user.id, room.id)

        const user2 = await createUser();
        const token2 = await generateValidToken(user2);
        const enrollment2 = await createEnrollmentWithAddress(user2);
        const ticketType2 = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: false,
            includesHotel: true,
          },
        });
        await createTicket(enrollment2.id, ticketType2.id, "PAID");
        const room2 = await createRoomWithHotelId(hotel.id)
        const booking2 = await createBooking(user2.id, room2.id)

        const response = await server.put(`/booking/${booking.id}`).set("Authorization", `Bearer ${token2}`).send({ roomId: room2.id });

        expect(response.status).toEqual(httpStatus.FORBIDDEN)
      });

      it("should respond with status 403 desired room is full", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: false,
            includesHotel: true,
          },
        });

        await createTicket(enrollment.id, ticketType.id, "PAID");


        const hotel = await createHotel()
        const room = await createRoomWithHotelIdAndSingleCapacity(hotel.id)
        const booking = await createBooking(user.id, room.id)

        const user2 = await createUser();
        const token2 = await generateValidToken(user2);
        const enrollment2 = await createEnrollmentWithAddress(user2);
        const ticketType2 = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: false,
            includesHotel: true,
          },
        });
        await createTicket(enrollment2.id, ticketType2.id, "PAID");
        const room2 = await createRoomWithHotelId(hotel.id)
        const booking2 = await createBooking(user2.id, room2.id)

        const response = await server.put(`/booking/${booking2.id}`).set("Authorization", `Bearer ${token2}`).send({ roomId: room.id });

        expect(response.status).toEqual(httpStatus.FORBIDDEN)
      });

      it("should respond with status 200 and booking id when passed validations", async () => {

        const user = await createUser();
        const enrollment = await createEnrollmentWithAddress(user);
        const token = await generateValidToken(user);
        const ticketType = await prisma.ticketType.create({
          data: {
            name: faker.name.findName(),
            price: faker.datatype.number(),
            isRemote: false,
            includesHotel: true,
          },
        })

        await createTicket(enrollment.id, ticketType.id, "PAID");
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const room2 = await createRoomWithHotelIdAndSingleCapacity(hotel.id)
        const booking = await createBooking(user.id, room2.id)
        const response = await server.put(`/booking/${booking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: room.id });


        expect(response.body).toEqual(expect.objectContaining({
          id: expect.any(Number)
        }))

        expect(response.status).toBe(httpStatus.OK);

      });
    })
})

