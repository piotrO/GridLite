import { NextRequest, NextResponse } from "next/server";

// PATCH - Update an existing brand
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");

        if (!token) {
            return NextResponse.json(
                { error: "Authorization token required" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await request.json();

        console.log("Update brand - ID:", id);
        console.log("Update brand - Body:", JSON.stringify(body));
        console.log("Update brand - Token:", token.substring(0, 20) + "...");

        // Update the brand on Grid8 using PUT
        const response = await fetch(`https://grid8.bannerbros.net/api/corp/brand/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        console.log("Update brand - Response status:", response.status);

        // Handle empty response
        const text = await response.text();
        const data = text ? JSON.parse(text) : { success: true };
        console.log("Update brand - Response data:", JSON.stringify(data, null, 2));

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("Brands API PATCH error:", error);
        console.error("Error details:", error instanceof Error ? error.message : String(error));
        return NextResponse.json(
            { error: "Failed to update brand" },
            { status: 500 }
        );
    }
}

// GET - Fetch a single brand by ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");

        if (!token) {
            return NextResponse.json(
                { error: "Authorization token required" },
                { status: 401 }
            );
        }

        const { id } = await params;

        const response = await fetch(`https://grid8.bannerbros.net/api/corp/brand/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("Brands API GET by ID error:", error);
        return NextResponse.json(
            { error: "Failed to fetch brand" },
            { status: 500 }
        );
    }
}

// DELETE - Delete a brand by ID
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");

        if (!token) {
            return NextResponse.json(
                { error: "Authorization token required" },
                { status: 401 }
            );
        }

        const { id } = await params;

        const response = await fetch(`https://grid8.bannerbros.net/api/corp/brand/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("Delete brand error response:", text);
            return NextResponse.json(
                { error: "Failed to delete brand on Grid8" },
                { status: response.status }
            );
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Brands API DELETE error:", error);
        return NextResponse.json(
            { error: "Failed to delete brand" },
            { status: 500 }
        );
    }
}
