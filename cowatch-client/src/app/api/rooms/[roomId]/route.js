import { NextResponse } from "next/server";

export async function GET(request, { params }) {
    try {
        const { roomId } = await params;
        const serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5001";
        const response = await fetch(`${serverUrl}/api/rooms/${roomId}`);
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

