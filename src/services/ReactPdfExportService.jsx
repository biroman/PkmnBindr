import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer";

// Create styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 20,
  },
  header: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "bold",
  },
  pageTitle: {
    fontSize: 12,
    marginBottom: 15,
    textAlign: "center",
    color: "#666",
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardSlot: {
    width: "23%",
    marginBottom: 15,
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 8,
    minHeight: 180,
  },
  cardImage: {
    width: "100%",
    height: 140,
    objectFit: "contain",
  },
  cardInfo: {
    marginTop: 5,
    fontSize: 8,
    color: "#333",
  },
  cardName: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 2,
  },
  cardDetails: {
    fontSize: 7,
    color: "#666",
    lineHeight: 1.2,
  },
  emptySlot: {
    width: "23%",
    marginBottom: 15,
    border: "1px dashed #ccc",
    borderRadius: 8,
    minHeight: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 10,
    color: "#999",
  },
  coverPage: {
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  },
  binderTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  binderSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  binderStats: {
    fontSize: 12,
    color: "#333",
  },
});

// Component for individual card
const CardComponent = ({ card }) => {
  if (!card || !card.cardData) {
    return (
      <View style={styles.emptySlot}>
        <Text style={styles.emptyText}>Empty</Text>
      </View>
    );
  }

  const { cardData } = card;

  return (
    <View style={styles.cardSlot}>
      {cardData.images?.small && (
        <Image style={styles.cardImage} src={cardData.images.small} />
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{cardData.name || "Unknown Card"}</Text>
        <View style={styles.cardDetails}>
          {cardData.set?.name && <Text>Set: {cardData.set.name}</Text>}
          {cardData.number && <Text>#{cardData.number}</Text>}
          {cardData.rarity && <Text>Rarity: {cardData.rarity}</Text>}
        </View>
      </View>
    </View>
  );
};

// Cover page component
const CoverPageComponent = ({ binder }) => (
  <View style={[styles.page, styles.coverPage]}>
    <Text style={styles.binderTitle}>{binder.name || "My Pokémon Binder"}</Text>
    <Text style={styles.binderSubtitle}>Card Collection</Text>
    <View style={styles.binderStats}>
      <Text>Total Pages: {binder.pages?.length || 0}</Text>
      <Text>Cards: {binder.totalCards || 0}</Text>
      <Text>Created: {new Date().toLocaleDateString()}</Text>
    </View>
  </View>
);

// Card page component
const CardPageComponent = ({ pageData, pageIndex, cardsPerPage = 16 }) => {
  const cards = pageData.cards || [];

  // Fill empty slots to maintain grid layout
  const filledCards = [...cards];
  while (filledCards.length < cardsPerPage) {
    filledCards.push(null);
  }

  return (
    <View style={styles.page}>
      <Text style={styles.pageTitle}>Page {pageIndex + 1}</Text>
      <View style={styles.cardGrid}>
        {filledCards.map((card, index) => (
          <CardComponent key={index} card={card} />
        ))}
      </View>
    </View>
  );
};

// Main PDF document component
const BinderPDFDocument = ({ binder, includeEmptyPages = false }) => {
  const pages = binder.pages || [];
  const filteredPages = includeEmptyPages
    ? pages
    : pages.filter((page) => page.cards && page.cards.length > 0);

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <CoverPageComponent binder={binder} />
      </Page>

      {/* Card Pages */}
      {filteredPages.map((page, index) => (
        <Page key={index} size="A4" style={styles.page}>
          <CardPageComponent
            pageData={page}
            pageIndex={index}
            cardsPerPage={16}
          />
        </Page>
      ))}
    </Document>
  );
};

export class ReactPdfExportService {
  /**
   * Export binder to PDF using @react-pdf/renderer
   */
  async exportBinderToPDF(binder, options = {}) {
    try {
      const { includeEmptyPages = false, filename = null } = options;

      console.log("PDF Export - Starting React PDF generation...");

      // Calculate total cards for stats
      const totalCards = (binder.pages || []).reduce((total, page) => {
        return total + (page.cards ? page.cards.length : 0);
      }, 0);

      const binderWithStats = {
        ...binder,
        totalCards,
      };

      // Generate PDF
      const doc = (
        <BinderPDFDocument
          binder={binderWithStats}
          includeEmptyPages={includeEmptyPages}
        />
      );

      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();

      console.log("PDF Export - PDF generated successfully");

      // Download the PDF
      const finalFilename = filename || `${binder.name || "binder"}-export.pdf`;
      this.downloadBlob(blob, finalFilename);

      return true;
    } catch (error) {
      console.error("PDF Export - Error generating PDF:", error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  /**
   * Download blob as file
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get cards for a specific page (helper method for compatibility)
   */
  getCardsForPage(binder, pageIndex) {
    if (!binder.pages || !binder.pages[pageIndex]) {
      return [];
    }
    return binder.pages[pageIndex].cards || [];
  }
}

export default ReactPdfExportService;
