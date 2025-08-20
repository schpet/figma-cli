import { join } from "@std/path";
import { ensureDir } from "@std/fs";

export interface FigmaUrlParts {
  fileId: string;
  nodeId: string;
}

export interface FigmaImageResponse {
  err: string | null;
  images: Record<string, string>;
}

export function validateFigmaToken(): string {
  const token = Deno.env.get("FIGMA_PERSONAL_ACCESS_TOKEN");
  if (!token) {
    console.error(
      "Error: FIGMA_PERSONAL_ACCESS_TOKEN environment variable is not set",
    );
    Deno.exit(1);
  }
  return token;
}

export function parseFigmaUrl(url: string): FigmaUrlParts {
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

export async function fetchImageUrls(
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

export async function downloadImage(
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

export async function setupOutputDirectory(outputPath?: string, prefix = "figma-cli-"): Promise<string> {
  if (outputPath) {
    await ensureDir(outputPath);
    return outputPath;
  }
  return await Deno.makeTempDir({ prefix });
}

export function generateImageFilename(nodeId: string, index: number): string {
  return `figma-node-${nodeId.replace(":", "-")}-${index}.png`;
}

export async function downloadImages(imageUrls: string[], targetDir: string, nodeId: string): Promise<string[]> {
  const downloadedImages: string[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    const filename = generateImageFilename(nodeId, i);
    const outputPath = join(targetDir, filename);

    await downloadImage(imageUrl, outputPath);
    downloadedImages.push(outputPath);
  }
  return downloadedImages;
}

export async function copyImageToClipboard(imagePath: string): Promise<void> {
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

export async function executeWithErrorHandling(operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}