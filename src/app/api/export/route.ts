import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import { parseManifestJs, serializeManifest, applyDynamicValues, DynamicValueData } from "@/lib/manifest-utils";
import { LayerModification } from "@/types/export-types";

interface ExportRequestBody {
  templatePath: string;
  sizes: string[];
  dynamicValues: DynamicValueData;
  layerModifications?: LayerModification[];
}

/**
 * Parse image URL/data and return as Buffer
 * Supports: base64 data URIs, remote URLs, and local file paths
 */
async function getImageBuffer(imageUrl: string): Promise<Buffer | null> {
  try {
    // Handle base64 data URI (e.g., "data:image/png;base64,..." or "data:image/jpeg;base64,...")
    if (imageUrl.startsWith("data:")) {
      // More permissive regex to handle various image formats
      const matches = imageUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
      if (matches && matches[1]) {
        const buffer = Buffer.from(matches[1], "base64");
        console.log("[Export] Decoded base64 image, size:", buffer.length, "bytes");
        return buffer;
      }
      console.error("[Export] Invalid base64 data URI format. URL starts with:", imageUrl.substring(0, 50));
      return null;
    }

    // Handle relative URLs (local files)
    if (imageUrl.startsWith("/")) {
      const localPath = path.join(process.cwd(), "public", imageUrl);
      if (fs.existsSync(localPath)) {
        console.log("[Export] Reading local image:", localPath);
        return fs.readFileSync(localPath);
      }
      console.error("[Export] Local file not found:", localPath);
      return null;
    }

    // Handle remote URLs
    console.log("[Export] Downloading remote image:", imageUrl);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`[Export] Failed to download image: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("[Export] Error processing image:", error);
    return null;
  }
}

/**
 * POST /api/export
 * Generate a ZIP file containing modified ad creatives
 */
export async function POST(request: NextRequest) {
  try {
    const body: ExportRequestBody = await request.json();
    const { templatePath, sizes, dynamicValues, layerModifications } = body;

    // Validate required fields
    if (!templatePath || !sizes || sizes.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: templatePath and sizes" },
        { status: 400 }
      );
    }

    // Get the base path for templates
    const publicDir = path.join(process.cwd(), "public", "templates", templatePath);

    // Check if template exists
    if (!fs.existsSync(publicDir)) {
      return NextResponse.json(
        { error: `Template not found: ${templatePath}` },
        { status: 404 }
      );
    }

    // Process dynamic image if provided (base64, URL, or local path)
    let dynamicImageBuffer: Buffer | null = null;
    const imageUrl = dynamicValues?.imageUrl;
    if (imageUrl && imageUrl.trim() !== "") {
      console.log("[Export] Processing dynamic image...");
      dynamicImageBuffer = await getImageBuffer(imageUrl);
      if (dynamicImageBuffer) {
        console.log("[Export] Image buffer ready, size:", dynamicImageBuffer.length);
      }
    }

    // Process logo if provided
    let logoBuffer: Buffer | null = null;
    const logoUrl = dynamicValues?.logoUrl;
    if (logoUrl && logoUrl.trim() !== "") {
      console.log("[Export] Processing logo...");
      logoBuffer = await getImageBuffer(logoUrl);
      if (logoBuffer) {
        console.log("[Export] Logo buffer ready, size:", logoBuffer.length);
      }
    }

    // Create archive
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression
    });

    // Collect chunks for response
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    // Process each size
    for (const size of sizes) {
      const sizeDir = path.join(publicDir, size);

      // Check if size directory exists
      if (!fs.existsSync(sizeDir)) {
        console.warn(`Size directory not found: ${size}, skipping...`);
        continue;
      }

      // Read all files in the size directory
      const files = fs.readdirSync(sizeDir);

      for (const file of files) {
        const filePath = path.join(sizeDir, file);
        const stat = fs.statSync(filePath);

        // Skip directories, hidden files
        if (stat.isDirectory() || file.startsWith(".")) {
          continue;
        }

        // Read file content
        let content: Buffer | string = fs.readFileSync(filePath);

        // Special handling for manifest.js - apply modifications
        if (file === "manifest.js") {
          try {
            const manifestContent = content.toString("utf-8");
            const manifest = parseManifestJs(manifestContent);

            // Apply dynamic values and layer modifications
            const dataWithLayers: DynamicValueData = {
              ...dynamicValues,
              layerModifications: layerModifications,
            };

            // If we have an image, update the imageUrl to point to local file
            if (dynamicImageBuffer) {
              dataWithLayers.imageUrl = "dynamicimage.png";
            }

            // If we have a logo, update the logoUrl to point to local file
            if (logoBuffer) {
              dataWithLayers.logoUrl = "logo.png";
            }

            const modifiedManifest = applyDynamicValues(manifest, dataWithLayers);
            
            // Remove __colors from manifest (it's for internal use only)
            delete (modifiedManifest as { __colors?: unknown }).__colors;

            // Serialize back to JS format
            content = serializeManifest(modifiedManifest);
          } catch (manifestError) {
            console.error(`Error processing manifest.js for ${size}:`, manifestError);
            // Fall back to original content
          }
        }

        // Special handling for index.html - inject colors into dynamicData
        if (file === "index.html" && dynamicValues?.colors && dynamicValues.colors.length > 0) {
          try {
            let htmlContent = content.toString("utf-8");
            const colorString = dynamicValues.colors.slice(0, 3).join("|");
            
            // Inject colors into dynamicData initialization
            htmlContent = htmlContent.replace(
              /grid8player\.dynamicData\s*=\s*dynamicData;/,
              `dynamicData["colors"] = "${colorString}";\n      grid8player.dynamicData = dynamicData;`
            );
            
            content = htmlContent;
            console.log(`[Export] Injected colors into ${size}/index.html:`, colorString);
          } catch (htmlError) {
            console.error(`Error processing index.html for ${size}:`, htmlError);
            // Fall back to original content
          }
        }

        // Add file to archive under size folder
        archive.append(content, { name: `${size}/${file}` });
      }

      // Add dynamic image to this size folder if we have one
      if (dynamicImageBuffer) {
        archive.append(dynamicImageBuffer, { name: `${size}/dynamicimage.png` });
        console.log(`[Export] Added dynamicimage.png to ${size}/ (${dynamicImageBuffer.length} bytes)`);
      }

      // Add logo to this size folder if we have one
      if (logoBuffer) {
        archive.append(logoBuffer, { name: `${size}/logo.png` });
        console.log(`[Export] Added logo.png to ${size}/ (${logoBuffer.length} bytes)`);
      }
    }

    // Finalize the archive and wait for completion
    await new Promise<void>((resolve, reject) => {
      archive.on("end", () => {
        console.log("[Export] Archive finalized, total bytes:", archive.pointer());
        resolve();
      });
      archive.on("error", (err) => {
        console.error("[Export] Archive error:", err);
        reject(err);
      });
      archive.finalize();
    });

    // Wait for all data to be collected
    const zipBuffer = Buffer.concat(chunks);

    // Return ZIP file as response
    const filename = `${templatePath}-export-${Date.now()}.zip`;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to generate export" },
      { status: 500 }
    );
  }
}


/**
 * GET /api/export
 * Return available sizes for a template
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const templatePath = searchParams.get("template");

  if (!templatePath) {
    return NextResponse.json(
      { error: "Missing template parameter" },
      { status: 400 }
    );
  }

  const publicDir = path.join(process.cwd(), "public", "templates", templatePath);

  if (!fs.existsSync(publicDir)) {
    return NextResponse.json(
      { error: `Template not found: ${templatePath}` },
      { status: 404 }
    );
  }

  // List subdirectories (sizes)
  const entries = fs.readdirSync(publicDir, { withFileTypes: true });
  const sizes = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => {
      const sizeDir = path.join(publicDir, entry.name);
      const hasManifest = fs.existsSync(path.join(sizeDir, "manifest.js"));
      const hasIndex = fs.existsSync(path.join(sizeDir, "index.html"));

      return {
        id: entry.name,
        name: getSizeName(entry.name),
        dimensions: entry.name.replace("x", " × "),
        available: hasManifest && hasIndex,
      };
    })
    .filter((size) => size.available);

  return NextResponse.json({ sizes });
}

/**
 * Map size ID to human-readable name
 */
function getSizeName(sizeId: string): string {
  const sizeNames: Record<string, string> = {
    "300x250": "Medium Rectangle",
    "728x90": "Leaderboard",
    "160x600": "Wide Skyscraper",
    "300x600": "Half Page",
    "320x50": "Mobile Banner",
    "320x100": "Large Mobile Banner",
    "970x250": "Billboard",
    "970x90": "Large Leaderboard",
    "1080x1080": "Social Square",
  };

  return sizeNames[sizeId] || sizeId;
}
