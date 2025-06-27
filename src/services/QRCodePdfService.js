import { jsPDF } from "jspdf";

/**
 * QRCodePdfService - Service for generating PDF files containing QR codes
 * Creates printable sheets with 6 identical QR codes for sharing binder links
 */
class QRCodePdfService {
  /**
   * Generate a PDF with 6 QR codes for a share link
   * @param {string} shareUrl - The URL to encode in the QR codes
   * @param {string} binderName - Name of the binder for labeling
   * @param {string} qrCodeDataUrl - Base64 data URL of the QR code image
   * @returns {Promise<void>} - Downloads the PDF file
   */
  async generateQRCodePDF(shareUrl, binderName, qrCodeDataUrl) {
    try {
      // Create new PDF document (A4 size)
      const pdf = new jsPDF("portrait", "mm", "a4");

      // PDF dimensions
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm

      // QR Code dimensions and positioning
      const qrSize = 50; // QR code size in mm
      const margin = 20; // Margin from edges
      const labelHeight = 15; // Height for text labels
      const spacing = 10; // Spacing between QR codes

      // Calculate grid layout (2x3 grid)
      const cols = 2;
      const rows = 3;
      const totalWidth = cols * qrSize + (cols - 1) * spacing;
      const totalHeight = rows * (qrSize + labelHeight) + (rows - 1) * spacing;

      // Center the grid on the page
      const startX = (pageWidth - totalWidth) / 2;
      const startY = (pageHeight - totalHeight) / 2;

      // Add title
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("Pokemon Binder QR Codes", pageWidth / 2, 30, {
        align: "center",
      });

      // Add dotted cut lines instruction
      pdf.setFontSize(8);
      pdf.text(
        "Cut along dotted lines to separate QR codes",
        pageWidth / 2,
        pageHeight - 20,
        { align: "center" }
      );

      // Generate 6 QR codes in 2x3 grid
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = startX + col * (qrSize + spacing);
          const y = startY + row * (qrSize + labelHeight + spacing);

          // Add QR code image
          pdf.addImage(qrCodeDataUrl, "PNG", x, y, qrSize, qrSize);

          // Add binder name below QR code
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text(binderName, x + qrSize / 2, y + qrSize + 5, {
            align: "center",
          });

          // Add "Scan me!" text
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.text("Scan to view!", x + qrSize / 2, y + qrSize + 10, {
            align: "center",
          });

          // Add dotted cut lines around each QR code
          this.addCutLines(
            pdf,
            x - 5,
            y - 5,
            qrSize + 10,
            qrSize + labelHeight + 5
          );
        }
      }

      // Add footer with URL (truncated if too long)
      const truncatedUrl =
        shareUrl.length > 80 ? shareUrl.substring(0, 77) + "..." : shareUrl;
      pdf.setFontSize(8);
      pdf.text(`URL: ${truncatedUrl}`, pageWidth / 2, pageHeight - 10, {
        align: "center",
      });

      // Generate filename with sanitized binder name
      const sanitizedName = binderName
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `qr_codes_${sanitizedName}_${timestamp}.pdf`;

      // Download the PDF
      pdf.save(filename);

      return { success: true, filename };
    } catch (error) {
      console.error("Error generating QR code PDF:", error);
      throw new Error("Failed to generate QR code PDF");
    }
  }

  /**
   * Add dotted cut lines around a QR code area
   * @param {jsPDF} pdf - PDF document instance
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width of the area
   * @param {number} height - Height of the area
   */
  addCutLines(pdf, x, y, width, height) {
    pdf.setLineDashPattern([2, 2], 0);
    pdf.setDrawColor(150, 150, 150); // Light gray
    pdf.setLineWidth(0.2);

    // Top line
    pdf.line(x, y, x + width, y);
    // Bottom line
    pdf.line(x, y + height, x + width, y + height);
    // Left line
    pdf.line(x, y, x, y + height);
    // Right line
    pdf.line(x + width, y, x + width, y + height);

    // Reset line style
    pdf.setLineDashPattern([]);
    pdf.setDrawColor(0, 0, 0);
  }

  /**
   * Convert QR code canvas to data URL
   * @param {HTMLCanvasElement} canvas - QR code canvas element
   * @returns {string} - Base64 data URL
   */
  canvasToDataURL(canvas) {
    return canvas.toDataURL("image/png");
  }
}

export default new QRCodePdfService();
