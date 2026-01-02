import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Create Admin User
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            passwordHash: adminPassword,
            role: 'ADMIN',
        },
    });
    console.log({ admin });

    // 2. Create Student User
    const studentPassword = await bcrypt.hash('student123', 10);
    const studentUser = await prisma.user.upsert({
        where: { email: 'student@example.com' },
        update: {},
        create: {
            email: 'student@example.com',
            phone: '0912345678',
            passwordHash: studentPassword,
            role: 'STUDENT',
        },
    });
    console.log({ studentUser });

    // 3. Create Student Profile
    const studentProfile = await prisma.studentProfile.upsert({
        where: { userId: studentUser.id },
        update: {},
        create: {
            userId: studentUser.id,
            studentCode: 'S0001',
            fullName: 'Nguyễn Văn An',
            // phone removed from StudentProfile
            faceRegistered: false,
        } as any, // Cast as any because generated client is outdated
    });
    console.log({ studentProfile });

    // 4. Create a Class Session for Today
    const today = new Date();
    today.setHours(8, 0, 0, 0); // Start at 8:00 AM
    const endTime = new Date(today);
    endTime.setHours(10, 0, 0, 0); // End at 10:00 AM

    // Future Session for registration testing
    const futureSessionStart = new Date();
    futureSessionStart.setHours(futureSessionStart.getHours() + 4);
    const futureSessionEnd = new Date(futureSessionStart);
    futureSessionEnd.setHours(futureSessionEnd.getHours() + 2);

    const registrationDeadline = new Date(futureSessionStart);
    registrationDeadline.setHours(registrationDeadline.getHours() - 2);

    const session = await prisma.classSession.create({
        data: {
            name: 'Ca học Test (Chiều nay)',
            date: futureSessionStart.toISOString().split('T')[0], // Fixed: Date object to YYYY-MM-DD string
            startTime: futureSessionStart.toLocaleTimeString('en-GB'),
            endTime: futureSessionEnd.toLocaleTimeString('en-GB'),
            registrationDeadline: registrationDeadline,
        },
    });
    console.log({ session });

    // Active Session for Check-in testing
    const currentSessionStart = new Date();
    const currentSessionEnd = new Date();
    currentSessionEnd.setHours(currentSessionEnd.getHours() + 2);

    const activeSession = await prisma.classSession.create({
        data: {
            name: 'Ca học Đang diễn ra (Test Check-in)',
            date: currentSessionStart.toISOString().split('T')[0], // Fixed: Date object to YYYY-MM-DD string
            startTime: currentSessionStart.toLocaleTimeString('en-GB'),
            endTime: currentSessionEnd.toLocaleTimeString('en-GB'),
            registrationDeadline: new Date(currentSessionStart.getTime() - 2 * 60 * 60 * 1000),
        },
    });

    // Auto-register student for the active session to test attendance
    await prisma.sessionRegistration.create({
        data: {
            studentId: studentProfile.id,
            sessionId: activeSession.id
        }
    });

    console.log({ activeSession });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
