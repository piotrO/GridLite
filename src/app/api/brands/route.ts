import { NextRequest, NextResponse } from "next/server";

// GET - Fetch all brands
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const sortType = searchParams.get("sortType") || "desc";
    const sortField = searchParams.get("sortField") || "createdAt";
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "20";

    const apiUrl = `https://grid8.bannerbros.net/api/corp/brand/?q=${q}&sortType=${sortType}&sortField=${sortField}&page=${page}&limit=${limit}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Brands API GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}

// POST - Create a new brand
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Create the brand on Grid8
    const response = await fetch(
      "https://grid8.bannerbros.net/api/corp/brand",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: body.name,
          dcmProfileId: body.dcmProfileId || "",
          adAccounts: body.adAccounts || [],
          ...(body.notes && { notes: body.notes }),
        }),
      }
    );

    const data = await response.json();

    console.log("Create brand response:", JSON.stringify(data, null, 2));

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Brands API POST error:", error);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}
