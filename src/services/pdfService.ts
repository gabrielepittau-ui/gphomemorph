
import { jsPDF } from "jspdf";
import { ArchitecturalStyle, MasterShootingStyle } from "../types";

// Helper to extract dominant colors from image
export const extractPalette = (imageElement: HTMLImageElement, colorCount: number = 5): string[] => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  canvas.width = imageElement.width;
  canvas.height = imageElement.height;
  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const colorMap: Record<string, number> = {};

  // Sample pixels (step by 50 to be fast)
  for (let i = 0; i < data.length; i += 4 * 50) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const rgb = `${r},${g},${b}`;
    colorMap[rgb] = (colorMap[rgb] || 0) + 1;
  }

  // Sort by frequency
  const sortedColors = Object.entries(colorMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, colorCount)
    .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    });

  return sortedColors;
};

export const generateMoodboardPDF = async (
  originalImageBase64: string,
  generatedImageBase64: string,
  config: any,
  fileName: string
) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // 1. HEADER
  doc.setFillColor(20, 20, 20); // Dark background
  doc.rect(0, 0, width, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("GP HOME MORPH", 15, 12);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text("PROFESSIONAL INTERIOR DESIGN REPORT", 15, 18);
  
  doc.text(`DATE: ${new Date().toLocaleDateString()}`, width - 15, 15, { align: "right" });

  // 2. MAIN VISUAL (Generated Image) - Large
  const margin = 15;
  const imgWidth = width - (margin * 2);
  const imgHeight = 110; // Fixed height area
  
  // Load generated image to get dims
  const genImg = new Image();
  genImg.src = generatedImageBase64;
  await genImg.decode(); // Wait for load
  
  // Calculate fit
  const ratio = genImg.width / genImg.height;
  let drawW = imgWidth;
  let drawH = imgWidth / ratio;
  if (drawH > imgHeight) {
      drawH = imgHeight;
      drawW = imgHeight * ratio;
  }
  
  // Center image
  const xPos = (width - drawW) / 2;
  doc.addImage(generatedImageBase64, 'JPEG', xPos, 35, drawW, drawH);

  // 3. COLOR PALETTE
  const palette = extractPalette(genImg);
  let paletteY = 35 + drawH + 10;
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("COLOR PALETTE", margin, paletteY);
  
  paletteY += 5;
  palette.forEach((color, index) => {
      doc.setFillColor(color);
      doc.setDrawColor(200, 200, 200);
      doc.circle(margin + 5 + (index * 18), paletteY + 5, 5, 'FD');
      
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text(color, margin + 5 + (index * 18), paletteY + 14, { align: "center" });
  });

  // 4. DETAILS GRID
  const detailsY = paletteY + 25;
  
  // Left Column: Configuration
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("PROJECT SPECIFICATIONS", margin, detailsY);
  
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, detailsY + 2, width - margin, detailsY + 2);
  
  const startTextY = detailsY + 10;
  const lineHeight = 7;
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100); // Label color
  
  // Function to draw row
  const drawRow = (label: string, value: string, y: number) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, margin + 40, y);
  };

  let currentY = startTextY;
  
  // Get Style Name safely
  const styleName = Object.values(ArchitecturalStyle).includes(config.style as any) ? config.style : "Custom";
  const shotName = Object.values(MasterShootingStyle).includes(config.shootingStyle as any) ? config.shootingStyle : "Standard";

  drawRow("STYLE:", styleName, currentY); currentY += lineHeight;
  drawRow("SHOOTING:", shotName, currentY); currentY += lineHeight;
  drawRow("MODE:", config.mode, currentY); currentY += lineHeight;
  
  if (config.addedItems && config.addedItems.length > 0) {
      const items = config.addedItems.map((i: any) => i.label).join(", ");
      drawRow("ADDONS:", items.length > 40 ? items.substring(0, 40) + "..." : items, currentY);
      currentY += lineHeight;
  }

  // 5. BEFORE IMAGE (Small)
  const beforeY = currentY + 10;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("ORIGINAL CONTEXT", margin, beforeY);
  
  doc.addImage(originalImageBase64, 'JPEG', margin, beforeY + 5, 50, 35); // Small thumbnail

  // 6. FOOTER
  doc.setFillColor(245, 245, 245);
  doc.rect(0, height - 15, width, 15, 'F');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Generated by GPHomeMorph AI - Confidential Design Concept", width / 2, height - 6, { align: "center" });

  doc.save(`${fileName}_Moodboard.pdf`);
};
