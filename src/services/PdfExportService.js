import jsPDF from "jspdf";
import html2canvas from "html2canvas";

class PdfExportService {
  constructor() {
    this.pdf = null;
    this.pageWidth = 210; // A4 width in mm
    this.pageHeight = 297; // A4 height in mm
    this.margin = 10; // 10mm margin
  }

  /**
   * Generate PDF from binder data
   * @param {Object} binder - The binder object with all card data
   * @param {Object} options - Export options (quality, format, etc.)
   * @returns {Promise<Blob>} - PDF blob for download
   */
  async generateBinderPdf(binder, options = {}) {
    const {
      quality = 0.95,
      format = "a4",
      includeEmptyPages = true,
      filename = null,
    } = options;

    // Validate input
    if (!binder) {
      throw new Error("Binder data is required");
    }

    if (!binder.metadata?.name) {
      console.warn("Binder missing name, using default");
    }

    try {
      // Initialize PDF document
      this.pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: format.toLowerCase(),
      });

      // Add binder metadata
      this.pdf.setProperties({
        title: binder.metadata?.name || "Pokémon Binder",
        subject: `Pokémon Trading Card Binder - ${
          binder.metadata?.name || "Untitled"
        }`,
        author: "PokémonBindr",
        creator: "PokémonBindr PDF Export",
        keywords: "pokemon, trading cards, collection, binder",
      });

      // Generate cover page
      await this.addCoverPage(binder);

      // Generate all card pages
      await this.addCardPages(binder, includeEmptyPages);

      // Ensure we have at least one page
      if (this.pdf.getNumberOfPages() === 0) {
        throw new Error("PDF generation failed: No pages generated");
      }

      // Get the PDF blob
      const pdfBlob = this.pdf.output("blob");

      // Validate blob size
      if (pdfBlob.size === 0) {
        throw new Error("PDF generation failed: Empty PDF generated");
      }

      // Download the PDF
      const downloadFilename = filename || this.generateFilename(binder);
      this.downloadPdf(pdfBlob, downloadFilename);

      return pdfBlob;
    } catch (error) {
      console.error("Error generating PDF:", error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  /**
   * Add cover page to PDF
   */
  async addCoverPage(binder) {
    // Create a temporary cover page element
    const coverElement = this.createCoverPageElement(binder);
    document.body.appendChild(coverElement);

    try {
      // Convert to canvas
      const canvas = await html2canvas(coverElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      // Add to PDF
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const imgWidth = this.pageWidth - 2 * this.margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      this.pdf.addImage(
        imgData,
        "JPEG",
        this.margin,
        this.margin,
        imgWidth,
        imgHeight
      );
    } finally {
      // Clean up
      document.body.removeChild(coverElement);
    }
  }

  /**
   * Add all card pages to PDF
   */
  async addCardPages(binder, includeEmptyPages) {
    const gridConfig = this.getGridConfig(binder.settings?.gridSize || "3x3");
    const cards = binder.cards || {};
    const cardPositions = Object.keys(cards)
      .map((pos) => parseInt(pos))
      .sort((a, b) => a - b);

    // Calculate total pages needed
    const maxPosition =
      cardPositions.length > 0 ? Math.max(...cardPositions) : 0;
    const totalPages = Math.ceil((maxPosition + 1) / gridConfig.total) || 1;

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const pageCards = this.getCardsForPage(cards, pageIndex, gridConfig);
      const hasCards = pageCards.some((card) => card !== null);

      if (hasCards || includeEmptyPages) {
        this.pdf.addPage();
        await this.addCardPage(binder, pageIndex, pageCards, gridConfig);
      }
    }
  }

  /**
   * Add a single card page to PDF
   */
  async addCardPage(binder, pageIndex, cards, gridConfig) {
    const pageElement = this.createCardPageElement(
      binder,
      pageIndex,
      cards,
      gridConfig
    );
    document.body.appendChild(pageElement);

    try {
      // Convert to canvas
      const canvas = await html2canvas(pageElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      // Add to PDF
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const imgWidth = this.pageWidth - 2 * this.margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      this.pdf.addImage(
        imgData,
        "JPEG",
        this.margin,
        this.margin,
        imgWidth,
        imgHeight
      );
    } finally {
      // Clean up
      document.body.removeChild(pageElement);
    }
  }

  /**
   * Create cover page HTML element for PDF
   */
  createCoverPageElement(binder) {
    const coverDiv = document.createElement("div");
    coverDiv.style.cssText = `
      width: 800px;
      height: 1100px;
      background: white;
      padding: 40px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      position: absolute;
      left: -10000px;
      top: 0;
      position: relative;
    `;

    // Add background logo watermark
    const backgroundDiv = document.createElement("div");
    backgroundDiv.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: url('/logo.png');
      background-repeat: no-repeat;
      background-position: center center;
      background-size: 300px auto;
      opacity: 0.08;
      z-index: 0;
      pointer-events: none;
    `;
    coverDiv.appendChild(backgroundDiv);

    const totalCards = Object.keys(binder.cards || {}).length;
    const createdDate = binder.metadata?.createdAt
      ? new Date(binder.metadata.createdAt).toLocaleDateString()
      : "Unknown";

    const contentDiv = document.createElement("div");
    contentDiv.style.cssText = `
      position: relative;
      z-index: 1;
      height: 100%;
    `;
    contentDiv.innerHTML = `
      <div style="text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center; position: relative;">
        <!-- Top watermark -->
        <div style="
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 14px;
          color: #d1d5db;
          font-weight: 500;
          letter-spacing: 1px;
        ">
          www.pkmnbindr.com
        </div>
        
        <div style="margin-bottom: 60px;">
          <h1 style="font-size: 48px; font-weight: bold; color: #1f2937; margin: 0 0 20px 0; line-height: 1.2;">
            ${binder.metadata?.name || "My Pokémon Binder"}
          </h1>
          ${
            binder.metadata?.description
              ? `
            <p style="font-size: 20px; color: #6b7280; margin: 0; line-height: 1.5;">
              ${binder.metadata.description}
            </p>
          `
              : ""
          }
        </div>
        
        <div style="background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%); border-radius: 20px; padding: 40px; margin: 40px 0;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center;">
            <div>
              <div style="font-size: 36px; font-weight: bold; color: #1d4ed8; margin-bottom: 8px;">
                ${totalCards}
              </div>
              <div style="font-size: 16px; color: #6b7280; font-weight: 500;">
                Total Cards
              </div>
            </div>
            <div>
              <div style="font-size: 36px; font-weight: bold; color: #1d4ed8; margin-bottom: 8px;">
                ${binder.settings?.gridSize || "3×3"}
              </div>
              <div style="font-size: 16px; color: #6b7280; font-weight: 500;">
                Grid Layout
              </div>
            </div>
          </div>
        </div>

                 <div style="margin-top: auto; padding-top: 40px; border-top: 2px solid #e5e7eb;">
           <p style="font-size: 16px; color: #9ca3af; margin: 0;">
             Created: ${createdDate}
           </p>
           <p style="font-size: 14px; color: #d1d5db; margin: 8px 0 0 0;">
             Generated by PokémonBindr
           </p>
           <p style="font-size: 14px; color: #9ca3af; margin: 8px 0 0 0; font-weight: 500;">
             www.pkmnbindr.com
           </p>
         </div>
      </div>
    `;
    coverDiv.appendChild(contentDiv);

    return coverDiv;
  }

  /**
   * Create card page HTML element for PDF
   */
  createCardPageElement(binder, pageIndex, cards, gridConfig) {
    // Calculate dynamic heights based on grid configuration
    // Fixed calculation to include watermark text and proper margins
    const watermarkHeight = 30; // Height for top watermark text + margin
    const pageHeaderHeight = 90; // Height for page header with binder holes
    const headerMargins = 35; // Total margins around header elements
    const bottomMargin = 20; // Extra margin at bottom to prevent cutoff
    const totalHeaderHeight =
      watermarkHeight + pageHeaderHeight + headerMargins; // Total header space needed
    const padding = 60; // Total padding (30px on each side)
    const availableHeight = 1100 - padding - totalHeaderHeight - bottomMargin; // Available height for cards
    const gap = 8;
    const totalGapHeight = (gridConfig.rows - 1) * gap; // Total height taken by gaps
    const cardHeight = Math.floor(
      (availableHeight - totalGapHeight) / gridConfig.rows
    ); // Height per card row

    // Debug logging to help troubleshoot layout issues
    if (gridConfig.rows > 3) {
      console.log(
        `PDF Layout Debug - ${gridConfig.rows}x${gridConfig.cols} grid:`,
        {
          availableHeight,
          cardHeight,
          totalHeight: cardHeight * gridConfig.rows + totalGapHeight,
          remainingSpace:
            availableHeight - (cardHeight * gridConfig.rows + totalGapHeight),
        }
      );
    }

    const pageDiv = document.createElement("div");
    pageDiv.style.cssText = `
      width: 800px;
      height: 1100px;
      background: white;
      padding: 30px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      position: absolute;
      left: -10000px;
      top: 0;
      box-sizing: border-box;
      position: relative;
    `;

    // Add background logo watermark
    const backgroundDiv = document.createElement("div");
    backgroundDiv.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: url('/logo.png');
      background-repeat: no-repeat;
      background-position: center center;
      background-size: 250px auto;
      opacity: 0.05;
      z-index: 0;
      pointer-events: none;
    `;
    pageDiv.appendChild(backgroundDiv);

    // Create page header
    const headerHtml = `
      <!-- Top watermark -->
      <div style="
        text-align: center;
        margin-bottom: 15px;
        font-size: 14px;
        color: #d1d5db;
        font-weight: 500;
        letter-spacing: 1px;
      ">
        www.pkmnbindr.com
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; height: ${pageHeaderHeight}px;">
        <div style="font-size: 16px; font-weight: 600; color: #374151;">
          Page ${pageIndex + 1}
        </div>
        <div style="display: flex; gap: 8px;">
          <div style="width: 20px; height: 20px; background: #e5e7eb; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <div style="width: 12px; height: 12px; background: #9ca3af; border-radius: 50%;"></div>
          </div>
          <div style="width: 20px; height: 20px; background: #e5e7eb; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <div style="width: 12px; height: 12px; background: #9ca3af; border-radius: 50%;"></div>
          </div>
          <div style="width: 20px; height: 20px; background: #e5e7eb; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <div style="width: 12px; height: 12px; background: #9ca3af; border-radius: 50%;"></div>
          </div>
        </div>
      </div>
    `;

    // Create card grid with dynamic height
    const cardSlots = [];
    for (let i = 0; i < gridConfig.total; i++) {
      const card = cards[i];
      cardSlots.push(this.createCardSlotHtml(card, i, cardHeight));
    }

    const gridHtml = `
      <div style="
        display: grid;
        grid-template-columns: repeat(${gridConfig.cols}, 1fr);
        grid-template-rows: repeat(${gridConfig.rows}, ${cardHeight}px);
        gap: ${gap}px;
        height: ${availableHeight}px;
        max-height: ${availableHeight}px;
        overflow: hidden;
      ">
        ${cardSlots.join("")}
      </div>
    `;

    // Create content container with z-index
    const contentDiv = document.createElement("div");
    contentDiv.style.cssText = `
      position: relative;
      z-index: 1;
      height: 100%;
    `;
    contentDiv.innerHTML = headerHtml + gridHtml;
    pageDiv.appendChild(contentDiv);
    return pageDiv;
  }

  /**
   * Create HTML for a single card slot
   */
  createCardSlotHtml(card, slotIndex, cardHeight = null) {
    // Calculate proper aspect ratio for card slots (standard Pokemon card is about 2.5:3.5 ratio)
    const cardAspectRatio = 2.5 / 3.5; // width / height
    const slotPadding = 8; // padding inside the slot

    if (card && card.image) {
      // Try to use imageSmall for better PDF performance, fallback to image
      const imageUrl = card.imageSmall || card.image;
      const cardName = this.escapeHtml(card.name || "Pokemon Card");

      return `
        <div style="
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: ${slotPadding}px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          height: 100%;
          box-sizing: border-box;
        ">
          <img 
            src="${imageUrl}" 
            alt="${cardName}"
            style="
              max-width: 100%;
              max-height: 100%;
              border-radius: 4px;
              object-fit: contain;
            "
            crossorigin="anonymous"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
          />
          <div style="
            display: none;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            background: #f3f4f6;
            border-radius: 4px;
            font-size: 10px;
            color: #6b7280;
            text-align: center;
            flex-direction: column;
          ">
            <div>🃏</div>
            <div style="margin-top: 4px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${cardName}
            </div>
          </div>

        </div>
      `;
    } else {
      // Empty slot
      return `
        <div style="
          background: #f9fafb;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-size: 12px;
          height: 100%;
          box-sizing: border-box;
        ">
          ${slotIndex + 1}
        </div>
      `;
    }
  }

  /**
   * Get cards for a specific page
   */
  getCardsForPage(cards, pageIndex, gridConfig) {
    const pageCards = [];
    const startPosition = pageIndex * gridConfig.total;

    for (let i = 0; i < gridConfig.total; i++) {
      const globalPosition = startPosition + i;
      const cardEntry = cards[globalPosition.toString()];

      if (cardEntry && cardEntry.cardData) {
        pageCards[i] = cardEntry.cardData;
      } else {
        pageCards[i] = null;
      }
    }

    return pageCards;
  }

  /**
   * Get grid configuration
   */
  getGridConfig(gridSize) {
    const configs = {
      "2x2": { cols: 2, rows: 2, total: 4 },
      "3x3": { cols: 3, rows: 3, total: 9 },
      "4x3": { cols: 4, rows: 3, total: 12 },
      "4x4": { cols: 4, rows: 4, total: 16 },
      "5x5": { cols: 5, rows: 5, total: 25 },
      "6x6": { cols: 6, rows: 6, total: 36 },
    };
    return configs[gridSize] || configs["3x3"];
  }

  /**
   * Generate filename for PDF
   */
  generateFilename(binder) {
    const binderName = binder.metadata?.name || "Pokemon-Binder";
    const cleanName = binderName.replace(/[^a-zA-Z0-9\-_]/g, "-");
    const timestamp = new Date().toISOString().split("T")[0];
    return `${cleanName}-${timestamp}.pdf`;
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Download PDF blob
   */
  downloadPdf(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const pdfExportService = new PdfExportService();
export default pdfExportService;
