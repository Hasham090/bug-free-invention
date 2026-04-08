import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extractText } from '@/lib/parsers';
import { analyzeContract } from '@/lib/ai-analyzer';
import { db } from '@/db';
import { contracts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    if (!rateLimit(userId, 5, 60000)) {
      return NextResponse.json(
        { error: 'Too many uploads. Please wait a moment.' },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF or DOCX file.' },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contractText = await extractText(buffer, file.type);

    if (!contractText || contractText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Could not extract enough text from the file.' },
        { status: 400 }
      );
    }

    const contractId = uuidv4();
    db.insert(contracts).values({
      id: contractId,
      userId,
      fileName: file.name,
      fileType: file.type,
      contractText,
      status: 'analyzing',
    }).run();

    const analysis = await analyzeContract(contractText);

    db.update(contracts)
      .set({
        analysisResult: JSON.stringify(analysis),
        overallRiskScore: analysis.overall_risk_score,
        contractType: analysis.contract_type,
        status: 'completed',
      })
      .where(eq(contracts.id, contractId))
      .run();

    return NextResponse.json({ contractId, analysis });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during analysis' },
      { status: 500 }
    );
  }
}
