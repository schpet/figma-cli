#!/usr/bin/env -S deno run --allow-net --allow-run --allow-read --allow-write --allow-env
import { Command } from "@cliffy/command";
import { join } from "@std/path";
import { ensureDir } from "@std/fs";

const figmaCommand = new Command()
  .name("figma")
  .description("Figma CLI tool")
  .version("1.0.0");

const nodeCommand = new Command().name("node").description("Node operations");

const copyCommand = new Command()
  .name("copy")
  .description("Copy a Figma node as an image to clipboard")
  .arguments("<url:string>")
  .action(async (_, url: string) => {
    await copyFigmaNode(url);
  });

nodeCommand.command("copy", copyCommand);
figmaCommand.command("node", nodeCommand);

interface FigmaUrlParts {
  fileId: string;
  nodeId: string;
}

function parseFigmaUrl(url: string): FigmaUrlParts {
  try {
    const urlObj = new URL(url);

    // Extract file ID from path: /design/{fileId}/...
    const pathParts = urlObj.pathname.split("/");
    const designIndex = pathParts.indexOf("design");
    if (designIndex === -1 || designIndex + 1 >= pathParts.length) {
      throw new Error("Invalid Figma URL: missing design file ID");
    }
    const fileId = pathParts[designIndex + 1];

    // Extract node ID from query params
    const nodeId = urlObj.searchParams.get("node-id");
    if (!nodeId) {
      throw new Error("Invalid Figma URL: missing node-id parameter");
    }

    return { fileId, nodeId };
  } catch (error) {
    throw new Error(`Failed to parse Figma URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}

interface FigmaImageResponse {
  err: string | null;
  images: Record<string, string>;
}

async function fetchImageUrls(
  token: string,
  fileId: string,
  nodeId: string,
): Promise<string[]> {
  const apiUrl = `https://api.figma.com/v1/images/${fileId}?ids=${nodeId}`;

  const response = await fetch(apiUrl, {
    headers: {
      "X-FIGMA-TOKEN": token,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Figma API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data: FigmaImageResponse = await response.json();

  if (data.err) {
    throw new Error(`Figma API error: ${data.err}`);
  }

  const imageUrls = Object.values(data.images).filter((url) => url);
  if (imageUrls.length === 0) {
    throw new Error("No images found for the specified node");
  }

  return imageUrls;
}

async function downloadImage(
  imageUrl: string,
  outputPath: string,
): Promise<void> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to download image: ${response.status} ${response.statusText}`,
    );
  }

  const imageData = await response.arrayBuffer();
  await Deno.writeFile(outputPath, new Uint8Array(imageData));
}

async function copyImageToClipboard(imagePath: string): Promise<void> {
  // Check if we're on macOS
  if (Deno.build.os !== "darwin") {
    console.log(
      "Clipboard copying is only supported on macOS. Image saved to:",
      imagePath,
    );
    return;
  }

  const script =
    `set the clipboard to (read (POSIX file "${imagePath}") as «class PNGf»)`;

  const process = new Deno.Command("osascript", {
    args: ["-e", script],
  });

  const result = await process.output();

  if (!result.success) {
    const errorText = new TextDecoder().decode(result.stderr);
    throw new Error(`Failed to copy image to clipboard: ${errorText}`);
  }
}

async function copyFigmaNode(url: string) {
  // Check for FIGMA_PERSONAL_ACCESS_TOKEN
  const token = Deno.env.get("FIGMA_PERSONAL_ACCESS_TOKEN");
  if (!token) {
    console.error(
      "Error: FIGMA_PERSONAL_ACCESS_TOKEN environment variable is not set",
    );
    Deno.exit(1);
  }

  try {
    // Parse the URL
    const { fileId, nodeId } = parseFigmaUrl(url);

    // Fetch image URLs from Figma API
    const imageUrls = await fetchImageUrls(token, fileId, nodeId);

    // Create temp directory
    const tempDir = await Deno.makeTempDir({ prefix: "figma-cli-" });

    // Download images
    const downloadedImages: string[] = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      const filename = `figma-node-${nodeId.replace(":", "-")}-${i}.png`;
      const outputPath = join(tempDir, filename);

      await downloadImage(imageUrl, outputPath);
      downloadedImages.push(outputPath);
    }

    console.log(
      `Downloaded ${downloadedImages.length} image(s) to: ${tempDir}`,
    );

    // Copy first image to clipboard (if on macOS)
    if (downloadedImages.length > 0) {
      await copyImageToClipboard(downloadedImages[0]);

      if (Deno.build.os === "darwin") {
        console.log("✓ Image copied to clipboard");
      }
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await figmaCommand.parse(Deno.args);
}
