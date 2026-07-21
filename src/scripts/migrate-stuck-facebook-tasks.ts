import "dotenv/config";
import { db } from "../db";
import { tasksTable, userTasksTable } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { TaskService } from "../services/task.service";

async function migrateStuckFacebookTasks() {
    console.log("🚀 Starting Stuck Facebook Tasks Migration...");

    const BATCH_SIZE = 10;
    const DELAY_MS = 2000;

    try {
        // 1. Find all candidate tasks
        // We look for tasks that are 'Pending Verification' for facebook platforms
        const stuckTasks = await db
            .select({
                userId: userTasksTable.userId,
                taskId: userTasksTable.taskId,
                userTaskId: userTasksTable.id
            })
            .from(userTasksTable)
            .innerJoin(tasksTable, eq(userTasksTable.taskId, tasksTable.id))
            .where(
                and(
                    eq(tasksTable.platform, "facebook"),
                    sql`LOWER(${userTasksTable.status}) = 'pending verification'`
                )
            );

        console.log(`Found ${stuckTasks.length} stuck tasks to re-verify.`);

        let processedCount = 0;
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < stuckTasks.length; i += BATCH_SIZE) {
            const batch = stuckTasks.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}...`);

            await Promise.all(batch.map(async (row) => {
                try {
                    // We don't have the facebookId here, so we rely on the code check
                    // (Most users who are stuck were missed by pagination, so this should find them)
                    const result = await TaskService.completeFacebookTask(
                        row.userId!,
                        row.taskId!
                    );

                    if (result.success) {
                        successCount++;
                    } else {
                        failureCount++;
                    }
                } catch (e) {
                    console.error(`Error processing user ${row.userId} task ${row.taskId}:`, e);
                    failureCount++;
                }
            }));

            processedCount += batch.length;
            console.log(`Progress: ${processedCount}/${stuckTasks.length} processed.`);

            if (i + BATCH_SIZE < stuckTasks.length) {
                await new Promise(r => setTimeout(r, DELAY_MS));
            }
        }

        console.log(`\n✅ Migration Complete!`);
        console.log(`Total processed: ${processedCount}`);
        console.log(`Successfully verified: ${successCount}`);
        console.log(`Still pending/failed: ${failureCount}`);

    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    } finally {
        await db.$client.end();
    }
}

migrateStuckFacebookTasks();
