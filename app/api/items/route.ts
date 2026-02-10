import { NextRequest, NextResponse } from 'next/server'
import { addItem } from '@/lib/db'

export async function POST(request: NextRequest) {
    try {
        const data = await request.json()
        addItem(data)
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
    }
}
