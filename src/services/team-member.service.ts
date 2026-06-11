import { db } from "@/src/db";
import { teamMembersTable } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { ServiceResult, ok, fail } from "./result";

export type TeamMemberItem = {
  id: number;
  name: string;
  role: string;
  photoUrl: string | null;
  bio: string | null;
  sortOrder: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export const TeamMemberService = {
  async getTeamMembers(): Promise<ServiceResult<TeamMemberItem[]>> {
    const members = await db
      .select()
      .from(teamMembersTable)
      .orderBy(asc(teamMembersTable.sortOrder), asc(teamMembersTable.name));

    return ok(members);
  },

  async getTeamMemberById(id: number): Promise<ServiceResult<TeamMemberItem>> {
    const [member] = await db
      .select()
      .from(teamMembersTable)
      .where(eq(teamMembersTable.id, id));

    if (!member) return fail("Team member not found", 404);
    return ok(member);
  },

  async createOrUpdateTeamMember(input: {
    id?: number;
    name: string;
    role: string;
    photoUrl?: string | null;
    bio?: string | null;
    sortOrder?: number | null;
  }): Promise<ServiceResult<TeamMemberItem>> {
    const { id, ...data } = input;

    if (!data.name?.trim()) return fail("Name is required", 400);
    if (!data.role?.trim()) return fail("Role is required", 400);

    const updateData = {
      name: data.name,
      role: data.role,
      photoUrl: data.photoUrl ?? null,
      bio: data.bio ?? null,
      sortOrder: data.sortOrder ?? 0,
      updatedAt: new Date(),
    };

    if (id) {
      const [updated] = await db
        .update(teamMembersTable)
        .set(updateData)
        .where(eq(teamMembersTable.id, id))
        .returning();

      if (!updated) return fail("Team member not found", 404);
      return ok(updated);
    }

    const [created] = await db
      .insert(teamMembersTable)
      .values(updateData)
      .returning();

    return ok(created);
  },

  async deleteTeamMember(id: number): Promise<ServiceResult<{ message: string }>> {
    const [deleted] = await db
      .delete(teamMembersTable)
      .where(eq(teamMembersTable.id, id))
      .returning({ id: teamMembersTable.id });

    if (!deleted) return fail("Team member not found", 404);
    return ok({ message: "Team member deleted" });
  },
};
