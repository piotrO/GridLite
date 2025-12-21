import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const response = await fetch("https://grid8.bannerbros.net/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        // Get the access-token from response headers
        const accessToken = response.headers.get("access-token");

        console.log("Login API - access-token:", accessToken);

        // Include the token in the response body so the client can access it
        const responseWithToken = {
            ...data,
            accessToken: accessToken,
        };

        return NextResponse.json(responseWithToken, { status: response.status });
    } catch (error) {
        console.error("Login proxy error:", error);
        return NextResponse.json(
            { error: "Failed to connect to authentication server" },
            { status: 500 }
        );
    }
}
