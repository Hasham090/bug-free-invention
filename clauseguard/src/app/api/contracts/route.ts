import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { contracts } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userContracts = db
      .select({
        id: contracts.id,
        fileName: contracts.fileName,
        fileType: contracts.fileType,
        uploadedAt: contracts.uploadedAt,
        overallRiskScore: contracts.overallRiskScore,
        contractType: contracts.contractType,
        status: contracts.status,
      })
      .from(contracts)
      .where(eq(contracts.userId, userId))
      .orderBy(desc(contracts.uploadedAt))
      .all();

    return NextResponse.json({ contracts: userContracts });
  } catch (error: any) {
    console.error('Contracts list error:', error);
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 });
  }
}
