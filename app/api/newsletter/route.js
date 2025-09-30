import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Newsletter endpoint disabled' },
    { status: 410 }
  )
}

export async function GET() {
  return NextResponse.json(
    { error: 'Newsletter endpoint disabled' },
    { status: 410 }
  )
}
