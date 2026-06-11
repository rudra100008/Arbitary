import { db } from "@/src/db";
import { partnersTable } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { ServiceResult, ok, fail } from "./result";

export type PartnerItem = {
  id: number;
  name: string;
  logoUrl: string | null;
  description: string | null;
  websiteUrl: string | null;
  category: string | null;
  sortOrder: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export const PartnerService = {
  async getPartners(): Promise<ServiceResult<PartnerItem[]>> {
    const partners = await db
      .select()
      .from(partnersTable)
      .orderBy(asc(partnersTable.sortOrder), asc(partnersTable.name));

    return ok(partners);
  },

  async getPartnerById(id: number): Promise<ServiceResult<PartnerItem>> {
    const [partner] = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.id, id));

    if (!partner) return fail("Partner not found", 404);
    return ok(partner);
  },

  async createOrUpdatePartner(input: {
    id?: number;
    name: string;
    logoUrl?: string | null;
    description?: string | null;
    websiteUrl?: string | null;
    category?: string | null;
    sortOrder?: number | null;
  }): Promise<ServiceResult<PartnerItem>> {
    const { id, ...data } = input;

    if (!data.name?.trim()) return fail("Name is required", 400);

    const updateData = {
      name: data.name,
      logoUrl: data.logoUrl ?? null,
      description: data.description ?? null,
      websiteUrl: data.websiteUrl ?? null,
      category: data.category ?? null,
      sortOrder: data.sortOrder ?? 0,
      updatedAt: new Date(),
    };

    if (id) {
      const [updated] = await db
        .update(partnersTable)
        .set(updateData)
        .where(eq(partnersTable.id, id))
        .returning();

      if (!updated) return fail("Partner not found", 404);
      return ok(updated);
    }

    const [created] = await db
      .insert(partnersTable)
      .values(updateData)
      .returning();

    return ok(created);
  },

  async deletePartner(id: number): Promise<ServiceResult<{ message: string }>> {
    const [deleted] = await db
      .delete(partnersTable)
      .where(eq(partnersTable.id, id))
      .returning({ id: partnersTable.id });

    if (!deleted) return fail("Partner not found", 404);
    return ok({ message: "Partner deleted" });
  },
};
