import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  approved: boolean('approved'),
});

type IsUserApprovedRequestBody = {
  user_id?: string;
};

type IsUserApprovedResponseBody = { approved: boolean } | { approved: boolean; error: string };

export async function POST(req: Request) {
  if (!DATABASE_URL) {
    const body: IsUserApprovedResponseBody = {
      approved: false,
      error: 'DATABASE_URL is not configured on the server',
    };
    return NextResponse.json(body, { status: 500 });
  }

  let body: IsUserApprovedRequestBody;
  try {
    body = (await req.json()) as IsUserApprovedRequestBody;
  } catch {
    const resBody: IsUserApprovedResponseBody = {
      approved: false,
      error: 'Invalid JSON body',
    };
    return NextResponse.json(resBody, { status: 400 });
  }

  const userId = body.user_id?.trim();
  if (!userId) {
    const resBody: IsUserApprovedResponseBody = {
      approved: false,
      error: 'user_id is required',
    };
    return NextResponse.json(resBody, { status: 400 });
  }

  const sql = neon(DATABASE_URL);
  const db = drizzle(sql);

  try {
    const [user] = await db
      .select({
        id: users.id,
        approved: users.approved,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // A user is "approved" if they exist and the approved column is true.
    const approved = Boolean(user && user.approved);

    const resBody: IsUserApprovedResponseBody = { approved };
    return NextResponse.json(resBody, { status: 200 });
  } catch (error) {
    console.error('Error checking user approval status:', error);
    const resBody: IsUserApprovedResponseBody = {
      approved: false,
      error: 'Failed to check user approval status',
    };
    return NextResponse.json(resBody, { status: 500 });
  }
}
