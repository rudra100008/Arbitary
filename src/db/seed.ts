import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from './index';
import { usersTable } from "./schema";
import bcrypt from "bcryptjs";

async function createAdmin() {
    const adminEmail = 'admin123@gmail.com';
    const adminPassword = 'admin12345';


    const exisitingUser = await db.query.usersTable.findFirst({
        where: eq(usersTable.email, adminEmail),
    })

    if (exisitingUser) {
        console.log("Admin already exists.Creation failed.")
        return;
    }

    console.log("Creating admin.....");
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await db.insert(usersTable).values({
        email: adminEmail,
        password: hashedPassword,
        name: "System Administrator",
        role: "ADMIN",
        isVerified: true,
        provider: "credentials",
    });

    console.log("Admin successfully created")
}

createAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
        console.log("Failed to create admin", err)
        process.exit(1);
    });
