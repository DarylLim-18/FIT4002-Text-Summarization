import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const documentsDir = path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir);
}

export async function GET() {
  const files = fs.readdirSync(documentsDir).map(file => ({
    name: file,
    path: path.join(documentsDir, file),
    size: fs.statSync(path.join(documentsDir, file)).size
  }));
  return NextResponse.json(files);
}

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  fs.writeFileSync(path.join(documentsDir, file.name), Buffer.from(buffer));
  
  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  const { filename } = await request.json();
  const filePath = path.join(documentsDir, filename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  fs.unlinkSync(filePath);
  return NextResponse.json({ success: true });
}