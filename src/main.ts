#!/usr/bin/env -S deno run --allow-net --allow-run --allow-read --allow-write --allow-env
import { Command } from "@cliffy/command";
import {
  copyImageToClipboard,
  downloadImages,
  executeWithErrorHandling,
  fetchImageUrls,
  parseFigmaUrl,
  setupOutputDirectory,
  validateFigmaToken,
} from "./utils.ts";

const figmaCommand = new Command()
  .name("figma")
  .description("Figma CLI tool")
  .version("1.0.0");

const nodeCommand = new Command().name("node").description("Node operations");

const copyCommand = new Command()
  .name("copy")
  .description("Copy a Figma node as an image to clipboard")
  .arguments("<url:string>")
  .option("-o, --output <path:string>", "Output directory path")
  .action(async (options, url: string) => {
    await copyFigmaNode(url, options.output);
  });

const urlCommand = new Command()
  .name("url")
  .description("Show the image URL from Figma API")
  .arguments("<url:string>")
  .action(async (_, url: string) => {
    await showFigmaNodeUrl(url);
  });

const exportCommand = new Command()
  .name("export")
  .description("Download a Figma node as an image to a directory")
  .arguments("<url:string>")
  .option("-o, --output <path:string>", "Output directory path")
  .action(async (options, url: string) => {
    await exportFigmaNode(url, options.output);
  });

nodeCommand.command("copy", copyCommand);
nodeCommand.command("url", urlCommand);
nodeCommand.command("export", exportCommand);
figmaCommand.command("node", nodeCommand);

async function copyFigmaNode(url: string, outputPath?: string) {
  await executeWithErrorHandling(async () => {
    const token = validateFigmaToken();
    const { fileId, nodeId } = parseFigmaUrl(url);
    const imageUrls = await fetchImageUrls(token, fileId, nodeId);

    const targetDir = await setupOutputDirectory(outputPath);
    const downloadedImages = await downloadImages(imageUrls, targetDir, nodeId);

    console.log(
      `Downloaded ${downloadedImages.length} image(s) to: ${targetDir}`,
    );

    if (downloadedImages.length > 0) {
      await copyImageToClipboard(downloadedImages[0]);
      if (Deno.build.os === "darwin") {
        console.log("✓ Image copied to clipboard");
      }
    }
  });
}

async function showFigmaNodeUrl(url: string) {
  await executeWithErrorHandling(async () => {
    const token = validateFigmaToken();
    const { fileId, nodeId } = parseFigmaUrl(url);
    const imageUrls = await fetchImageUrls(token, fileId, nodeId);

    for (const imageUrl of imageUrls) {
      console.log(imageUrl);
    }
  });
}

async function exportFigmaNode(url: string, outputPath?: string) {
  await executeWithErrorHandling(async () => {
    const token = validateFigmaToken();
    const { fileId, nodeId } = parseFigmaUrl(url);
    const imageUrls = await fetchImageUrls(token, fileId, nodeId);

    const targetDir = await setupOutputDirectory(outputPath, "figma-export-");
    const downloadedImages = await downloadImages(imageUrls, targetDir, nodeId);

    console.log(
      `Downloaded ${downloadedImages.length} image(s) to: ${targetDir}`,
    );
  });
}

if (import.meta.main) {
  await figmaCommand.parse(Deno.args);
}
