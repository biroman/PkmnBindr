import { useState } from "react";
import { Link } from "react-router-dom";
import { useDocumentHead } from "../hooks/useDocumentHead";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

const FAQPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [openSections, setOpenSections] = useState({});

  // SEO meta tags
  useDocumentHead({
    title:
      "Pokemon Card Organizer FAQ - Digital Binder Questions Answered | PkmnBindr",
    description:
      "Get answers about organizing Pokemon cards digitally. Learn how to create digital binders, sync collections, and track Pokemon TCG cards with PkmnBindr's comprehensive FAQ.",
    keywords:
      "pokemon card organizer FAQ, digital pokemon binder questions, pokemon collection tracker help, pokemon TCG database questions, how to organize pokemon cards online",
    canonicalUrl: "https://www.pkmnbindr.com/faq",
  });

  const toggleSection = (sectionId) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const faqData = [
    {
      id: "getting-started",
      title: "Getting Started",
      questions: [
        {
          id: "what-is-PkmnBindr",
          question: "What is PkmnBindr and how does it work?",
          answer: (
            <div>
              <p className="mb-3">
                PkmnBindr is the ultimate digital Pokemon card organizer that
                lets you create beautiful, customizable binders for your Pokemon
                TCG collection. Unlike physical binders, you can organize
                thousands of cards digitally, search instantly, and access your
                collection from any device.
              </p>
              <p className="mb-3">
                Our platform includes every official Pokemon TCG card ever
                released, from Base Set to the latest expansions, making it the
                most comprehensive Pokemon card database available.
              </p>
              <p>
                Whether you're a casual collector or managing massive
                collections, PkmnBindr provides the tools you need to organize,
                showcase, and track your Pokemon cards efficiently. Learn more
                about
                <Link
                  to="/blog/ultimate-guide-organizing-pokemon-cards"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  transitioning from physical to digital organization
                </Link>
                .
              </p>
            </div>
          ),
          keywords: [
            "pokemon card organizer",
            "digital pokemon binder",
            "pokemon collection tracker",
          ],
        },
        {
          id: "guest-vs-account",
          question: "Should I use PkmnBindr as a guest or create an account?",
          answer: (
            <div>
              <p className="mb-3">
                <strong>Guest Mode:</strong> Perfect for trying out PkmnBindr.
                You can create binders, add cards, and use all features
                instantly. Your data is stored locally in your browser, so it
                works completely offline. However, your collection won't sync
                between devices.
              </p>
              <p className="mb-3">
                <strong>Registered Account:</strong> Recommended for serious
                collectors. You get everything in guest mode PLUS cloud sync
                across all your devices, backup protection, and access to
                community features like public binder sharing.
              </p>
              <p>
                Both options include unlimited access to all features - there's
                no premium tier or hidden costs. Choose based on whether you
                want your collection to sync across devices.
              </p>
            </div>
          ),
          keywords: [
            "pokemon binder guest mode",
            "pokemon organizer account",
            "sync pokemon collection",
          ],
        },
        {
          id: "first-binder",
          question: "How do I create my first digital Pokemon binder?",
          answer: (
            <div>
              <p className="mb-3">Creating your first binder is simple:</p>
              <ol className="list-decimal list-inside mb-3 space-y-2">
                <li>
                  Visit the{" "}
                  <Link
                    to="/binders"
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Binders page
                  </Link>
                </li>
                <li>Click "Create New Binder"</li>
                <li>Choose a name and customize your binder colors</li>
                <li>
                  Start adding cards using our comprehensive Pokemon TCG
                  database
                </li>
                <li>
                  Organize cards by set, type, rarity, or create custom
                  arrangements
                </li>
              </ol>
              <p>
                You can customize everything from grid layouts to color themes,
                making each binder uniquely yours. For inspiration, check out
                our{" "}
                <Link
                  to="/binders/151"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Pokemon 151 showcase binder
                </Link>
                .
              </p>
            </div>
          ),
          keywords: [
            "create pokemon binder",
            "how to make digital pokemon binder",
            "pokemon binder tutorial",
          ],
        },
      ],
    },
    {
      id: "features-organization",
      title: "Features & Organization",
      questions: [
        {
          id: "card-database",
          question: "How comprehensive is the Pokemon card database?",
          answer: (
            <div>
              <p className="mb-3">
                Our database includes every official Pokemon Trading Card Game
                card ever released, powered by the Pokemon TCG API. This covers:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-1">
                <li>All main sets from Base Set (1998) to current releases</li>
                <li>Promotional cards and special releases</li>
                <li>
                  Japanese exclusive cards and international variants (Coming
                  later)
                </li>
                <li>High-resolution card images and complete metadata</li>
                <li>Accurate set information, rarity, and card numbers</li>
              </ul>
              <p>
                The database updates automatically as new sets are released,
                ensuring you always have access to the latest Pokemon cards.
                Compare this to other
                <Link
                  to="/blog/best-pokemon-tcg-tracking-apps-2025-guide"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Pokemon TCG tracking apps
                </Link>{" "}
                to see why our database is the most complete.
              </p>
            </div>
          ),
          keywords: [
            "pokemon card database",
            "pokemon tcg api",
            "complete pokemon card list",
          ],
        },
        {
          id: "organization-methods",
          question:
            "What are the best ways to organize Pokemon cards in digital binders?",
          answer: (
            <div>
              <p className="mb-3">
                PkmnBindr offers multiple organization methods to suit different
                collecting styles:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>By Set:</strong> Perfect for set completion - organize
                  chronologically or by personal preference
                </li>
                <li>
                  <strong>By Type:</strong> Group Fire, Water, Grass, and other
                  Pokemon types together
                </li>
                <li>
                  <strong>By Rarity:</strong> Separate your rare holos, ultra
                  rares, and common cards
                </li>
                <li>
                  <strong>Custom Organization:</strong> Create your own system
                  using drag-and-drop functionality
                </li>
                <li>
                  <strong>Master Set Organization:</strong> Track complete sets
                  including all variants
                </li>
              </ul>
              <p>
                Our advanced sorting tools make it easy to reorganize your
                collection as it grows. For detailed organization strategies,
                read our comprehensive guide on
                <Link
                  to="/blog/ultimate-guide-organizing-pokemon-cards"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  organizing Pokemon cards from physical to digital
                </Link>
                .
              </p>
            </div>
          ),
          keywords: [
            "organize pokemon cards",
            "pokemon card organization methods",
            "sort pokemon collection",
          ],
        },
        {
          id: "customization-options",
          question: "How can I customize my Pokemon binders?",
          answer: (
            <div>
              <p className="mb-3">
                PkmnBindr offers extensive customization options:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>Grid Layouts:</strong> Choose from 2x2, 3x3, 3x4 or
                  4x4
                </li>
                <li>
                  <strong>Color Themes:</strong> Customize binder colors to
                  match your favorite Pokemon types or themes
                </li>
                <li>
                  <strong>Binder Names & Descriptions:</strong> Add detailed
                  information about each collection
                </li>
                <li>
                  <strong>Card Arrangements:</strong> Drag and drop cards to
                  create perfect layouts
                </li>
              </ul>
              <p>
                All customization features are included - no premium upgrades
                needed. Make each binder reflect your personal collecting style
                and preferences.
              </p>
            </div>
          ),
          keywords: [
            "customize pokemon binder",
            "pokemon binder themes",
            "digital binder customization",
          ],
        },
        {
          id: "search-functionality",
          question: "How do I search for specific Pokemon cards?",
          answer: (
            <div>
              <p className="mb-3">
                Our advanced search system helps you find any Pokemon card
                instantly:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>Card Name Search:</strong> Type any Pokemon name to
                  find all variants
                </li>
                <li>
                  <strong>Set Search:</strong> Browse specific sets like Base
                  Set, Jungle, or latest releases
                </li>
                <li>
                  <strong>Type Filtering:</strong> Filter by Pokemon types
                  (Fire, Water, Grass, etc.)
                </li>
                <li>
                  <strong>Rarity Filtering:</strong> Find cards by rarity
                  (Common, Rare, Ultra Rare, etc.)
                </li>
                <li>
                  <strong>Advanced Filters:</strong> Combine multiple criteria
                  for precise searches
                </li>
                <li>
                  <strong>Visual Search:</strong> Browse card images in grid or
                  list view
                </li>
              </ul>
              <p>
                The search works instantly even with thousands of cards, making
                it faster than physical organization methods. Whether you're
                looking for a specific Charizard variant or completing a master
                set, our search tools make card management effortless.
              </p>
            </div>
          ),
          keywords: [
            "search pokemon cards",
            "pokemon card finder",
            "pokemon tcg search",
          ],
        },
      ],
    },
    {
      id: "sync-accounts",
      title: "Accounts & Sync",
      questions: [
        {
          id: "cloud-sync",
          question: "How does cloud sync work across devices?",
          answer: (
            <div>
              <p className="mb-3">
                With a registered account, your Pokemon collection automatically
                syncs across all devices:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>Real-time Sync:</strong> Changes appear instantly on
                  all your devices
                </li>
                <li>
                  <strong>Automatic Backup:</strong> Your collection is safely
                  stored in the cloud
                </li>
              </ul>
            </div>
          ),
          keywords: [
            "pokemon collection sync",
            "sync pokemon cards",
            "pokemon binder cloud sync",
          ],
        },
        {
          id: "data-safety",
          question: "Is my Pokemon collection data safe and backed up?",
          answer: (
            <div>
              <p className="mb-3">
                Your Pokemon collection data is protected with enterprise-grade
                security:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>Cloud Storage:</strong> Data stored on Google Firebase
                  with automatic backups
                </li>
              </ul>
              <p>
                For guest users, data is stored locally in your browser. While
                this works offline, we recommend creating an account for maximum
                data protection and backup security.
              </p>
            </div>
          ),
          keywords: [
            "pokemon collection backup",
            "pokemon data safety",
            "secure pokemon organizer",
          ],
        },
        {
          id: "switching-modes",
          question: "Can I switch from guest mode to a registered account?",
          answer: (
            <div>
              <p className="mb-3">
                Yes! You can easily upgrade from guest mode to a registered
                account:
              </p>
              <ol className="list-decimal list-inside mb-3 space-y-2">
                <li>Create an account using the "Register" button</li>
                <li>Your local guest data will be automatically imported</li>
                <li>
                  All binders and cards transfer to your new cloud account
                </li>
                <li>Enable sync across all your devices</li>
              </ol>
              <p className="mb-3">
                <strong>Important:</strong> Guest data is stored locally in your
                browser. If you clear browser data or use a different device,
                guest collections won't be accessible. Registering an account
                protects against data loss.
              </p>
              <p>
                The upgrade process is seamless - you won't lose any of your
                organization work or custom binder settings.
              </p>
            </div>
          ),
          keywords: [
            "upgrade pokemon account",
            "import guest data",
            "pokemon account benefits",
          ],
        },
      ],
    },
    {
      id: "collecting-strategies",
      title: "Collection Strategies",
      questions: [
        {
          id: "start-collecting-pokemon-cards",
          question: "How do I start collecting Pokemon cards in 2025?",
          answer: (
            <div>
              <p className="mb-3">
                Starting your Pokemon card collection has never been easier with
                digital organization:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>Choose Your Focus:</strong> Decide if you want to
                  collect specific sets, favorite Pokemon, or build a master
                  collection
                </li>
                <li>
                  <strong>Start Digital First:</strong> Use PkmnBindr to track
                  what you want before buying physical cards
                </li>
                <li>
                  <strong>Set Completion:</strong> Focus on completing modern
                  sets like Pokemon 151 or Paldea Evolved
                </li>
                <li>
                  <strong>Budget Planning:</strong> Track which cards you need
                  to avoid buying duplicates
                </li>
                <li>
                  <strong>Research Values:</strong> Understand card rarity and
                  market values before purchasing
                </li>
              </ul>
              <p>
                PkmnBindr helps new collectors avoid common mistakes by
                providing a clear overview of set completion and allowing you to
                plan purchases strategically. Check out our{" "}
                <Link
                  to="/binders/151"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Pokemon 151 showcase
                </Link>{" "}
                for inspiration on how to organize a complete set.
              </p>
            </div>
          ),
          keywords: [
            "start collecting pokemon cards",
            "pokemon card collecting guide",
            "how to collect pokemon cards",
          ],
        },
        {
          id: "which-pokemon-cards-valuable",
          question: "Which Pokemon cards are worth collecting and valuable?",
          answer: (
            <div>
              <p className="mb-3">
                The most valuable Pokemon cards to focus on include:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>First Edition Base Set:</strong> Charizard, Blastoise,
                  Venusaur (highest value)
                </li>
                <li>
                  <strong>Modern Ultra Rares:</strong> Rainbow rares, secret
                  rares, alternate art cards
                </li>
                <li>
                  <strong>Japanese Exclusives:</strong> Often more valuable than
                  English versions
                </li>
                <li>
                  <strong>Error Cards:</strong> Legitimate misprints from
                  official releases
                </li>
                <li>
                  <strong>Graded Cards:</strong> PSA 10 or BGS 10 condition
                  significantly increases value
                </li>
                <li>
                  <strong>Promo Cards:</strong> Tournament prizes, convention
                  exclusives, special events
                </li>
              </ul>
              <p>
                Use PkmnBindr to track these valuable cards in your collection
                and plan your collecting strategy. Our database helps you
                identify authentic versions and avoid counterfeits. Learn more
                about{" "}
                <Link
                  to="/blog/how-to-spot-fake-pokemon-cards-protect-collection"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  spotting fake Pokemon cards
                </Link>{" "}
                to protect your investment.
              </p>
            </div>
          ),
          keywords: [
            "valuable pokemon cards",
            "most expensive pokemon cards",
            "pokemon cards worth money",
          ],
        },
        {
          id: "organize-pokemon-cards-by-set",
          question: "How should I organize my Pokemon cards by set or rarity?",
          answer: (
            <div>
              <p className="mb-3">
                The best organization method depends on your collecting goals:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>Set Completion:</strong> Organize by set and card
                  number for easy tracking of what you need
                </li>
                <li>
                  <strong>Rarity Focus:</strong> Group all rare holos, ultra
                  rares, and secret rares together
                </li>
                <li>
                  <strong>Type Organization:</strong> Arrange by Pokemon types
                  (Fire, Water, Grass, etc.)
                </li>
                <li>
                  <strong>Value-Based:</strong> Separate high-value cards from
                  common cards for better protection
                </li>
                <li>
                  <strong>Personal Favorites:</strong> Create custom categories
                  for your favorite Pokemon
                </li>
              </ul>
              <p>
                PkmnBindr supports all these organization methods with powerful
                sorting and filtering tools. You can easily switch between
                different views and create multiple binders for different
                purposes. Read our detailed guide on{" "}
                <Link
                  to="/blog/ultimate-guide-organizing-pokemon-cards"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Pokemon card organization strategies
                </Link>{" "}
                for expert tips.
              </p>
            </div>
          ),
          keywords: [
            "organize pokemon cards by set",
            "pokemon card organization",
            "sort pokemon collection",
          ],
        },
      ],
    },
    {
      id: "comparison-physical",
      title: "Digital vs Physical Binders",
      questions: [
        {
          id: "digital-vs-physical",
          question:
            "What are the advantages of digital Pokemon binders over physical ones?",
          answer: (
            <div>
              <p className="mb-3">
                Digital binders offer significant advantages over physical
                storage:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>Unlimited Space:</strong> Store thousands of cards
                  without physical storage concerns
                </li>
                <li>
                  <strong>Perfect Condition:</strong> Digital cards never get
                  damaged, bent, or faded
                </li>
                <li>
                  <strong>Instant Search:</strong> Find any card in seconds vs.
                  flipping through pages
                </li>
                <li>
                  <strong>Multiple Views:</strong> Same card can appear in
                  multiple binders
                </li>
                <li>
                  <strong>Easy Reorganization:</strong> Drag-and-drop vs.
                  physical card handling
                </li>
                <li>
                  <strong>Backup Protection:</strong> Never lose your collection
                  to damage or theft
                </li>
                <li>
                  <strong>Sharing:</strong> Show your collection to friends
                  without physical transport
                </li>
              </ul>
              <p>
                However, physical binders still have their place for tactile
                enjoyment and display. Many collectors use both - physical for
                prized cards and digital for comprehensive organization. Learn
                more about
                <Link
                  to="/blog/fort-knox-pokemon-card-binder-guide-2025"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  choosing the right physical binder
                </Link>{" "}
                if you're maintaining both collections.
              </p>
            </div>
          ),
          keywords: [
            "digital vs physical pokemon binders",
            "pokemon binder comparison",
            "digital pokemon collection benefits",
          ],
        },
        {
          id: "complement-physical",
          question:
            "Can digital binders complement my physical Pokemon card collection?",
          answer: (
            <div>
              <p className="mb-3">
                Absolutely! Many collectors use digital and physical
                organization together:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>Complete Tracking:</strong> Digital binders track your
                  entire binder collection
                </li>
                <li>
                  <strong>Planning Tool:</strong> Use digital binders to plan
                  physical organization
                </li>
                <li>
                  <strong>Investment Tracking:</strong> Monitor complete
                  collection value digitally(coming soon)
                </li>
                <li>
                  <strong>Trade Management:</strong> Easily show available cards
                  to potential trading partners(coming soon)
                </li>
                <li>
                  <strong>Set Completion:</strong> Track progress on sets
                  regardless of storage method
                </li>
              </ul>
              <p>
                This hybrid approach gives you the best of both worlds - the
                tactile pleasure of physical cards for your favorites, plus
                comprehensive digital organization for everything else. Our
                <Link
                  to="/blog/ultimate-guide-organizing-pokemon-cards"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  complete organization guide
                </Link>{" "}
                covers strategies for managing both digital and physical
                collections.
              </p>
            </div>
          ),
          keywords: [
            "digital physical pokemon collection",
            "hybrid pokemon organization",
            "complement physical binders",
          ],
        },
      ],
    },
    {
      id: "troubleshooting-alternatives",
      title: "Troubleshooting & Alternatives",
      questions: [
        {
          id: "pokemon-live-vs-PkmnBindr",
          question: "How does PkmnBindr compare to Pokemon Live app?",
          answer: (
            <div>
              <p className="mb-3">
                PkmnBindr and Pokemon Live serve different purposes for
                collectors:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>Pokemon Live:</strong> Digital card game with limited
                  collection tracking
                </li>
                <li>
                  <strong>PkmnBindr:</strong> Comprehensive collection organizer
                  for physical and digital cards
                </li>
                <li>
                  <strong>Scope:</strong> Pokemon Live focuses on gameplay,
                  PkmnBindr on organization
                </li>
                <li>
                  <strong>Card Coverage:</strong> PkmnBindr includes every TCG
                  card ever released
                </li>
                <li>
                  <strong>Customization:</strong> PkmnBindr offers unlimited
                  binder customization options
                </li>
                <li>
                  <strong>Offline Access:</strong> PkmnBindr works completely
                  offline in guest mode
                </li>
              </ul>
              <p>
                Many collectors use both - Pokemon Live for playing the TCG
                digitally and PkmnBindr for organizing their complete
                collection. PkmnBindr is ideal for tracking which physical cards
                you own and planning future purchases.
              </p>
            </div>
          ),
          keywords: [
            "pokemon live vs PkmnBindr",
            "pokemon live alternative",
            "better than pokemon live",
          ],
        },
        {
          id: "tcgplayer-vs-PkmnBindr",
          question:
            "Is PkmnBindr better than TCGPlayer for collection tracking?",
          answer: (
            <div>
              <p className="mb-3">
                PkmnBindr and TCGPlayer serve different primary functions:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>TCGPlayer:</strong> Marketplace for buying/selling
                  cards with basic collection features
                </li>
                <li>
                  <strong>PkmnBindr:</strong> Dedicated collection organizer
                  with advanced binder creation
                </li>
                <li>
                  <strong>Organization:</strong> PkmnBindr offers superior
                  visual organization and customization
                </li>
                <li>
                  <strong>Binder Creation:</strong> Create beautiful, shareable
                  digital binders vs. simple lists
                </li>
                <li>
                  <strong>Free Access:</strong> PkmnBindr's core features are
                  completely free
                </li>
                <li>
                  <strong>Focus:</strong> TCGPlayer for transactions, PkmnBindr
                  for organization and display
                </li>
              </ul>
              <p>
                For serious collectors who want more than basic tracking,
                PkmnBindr provides the visual organization and customization
                that TCGPlayer lacks. Use TCGPlayer for market research and
                purchasing, PkmnBindr for showcasing and organizing your
                collection.
              </p>
            </div>
          ),
          keywords: [
            "tcgplayer vs PkmnBindr",
            "better than tcgplayer",
            "pokemon collection organizer vs tcgplayer",
          ],
        },
        {
          id: "collection-not-saving",
          question: "Why is my Pokemon collection not saving or syncing?",
          answer: (
            <div>
              <p className="mb-3">
                If your collection isn't saving properly, try these solutions:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>Guest Mode:</strong> Collections save locally - check
                  if browser data was cleared
                </li>
                <li>
                  <strong>Account Issues:</strong> Ensure you're logged in for
                  cloud sync functionality
                </li>
                <li>
                  <strong>Browser Storage:</strong> Clear browser cache and
                  reload the page
                </li>
                <li>
                  <strong>Internet Connection:</strong> Check connection for
                  registered account sync
                </li>
                <li>
                  <strong>Browser Compatibility:</strong> Use latest version of
                  Chrome, Firefox, or Safari
                </li>
                <li>
                  <strong>JavaScript Enabled:</strong> Ensure JavaScript is
                  enabled in browser settings
                </li>
              </ul>
              <p>
                For the most reliable experience, we recommend creating a
                registered account for automatic cloud backup. If problems
                persist, try switching from guest mode to a registered account
                to enable cloud sync functionality.
              </p>
            </div>
          ),
          keywords: [
            "pokemon collection not saving",
            "PkmnBindr not syncing",
            "collection disappeared",
          ],
        },
        {
          id: "missing-pokemon-cards",
          question:
            "What if I can't find specific Pokemon cards in the database?",
          answer: (
            <div>
              <p className="mb-3">
                Our database includes virtually every official Pokemon TCG card,
                but if you're missing something:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>Search Variations:</strong> Try different spellings or
                  partial card names
                </li>
                <li>
                  <strong>Set Filters:</strong> Browse by specific set if you
                  know the card's origin
                </li>
                <li>
                  <strong>Recent Releases:</strong> Very new cards may take a
                  few days to appear
                </li>
                <li>
                  <strong>Promo Cards:</strong> Some promotional cards have
                  unique numbering systems
                </li>
                <li>
                  <strong>Regional Variants:</strong> Japanese cards may be
                  listed separately from English versions
                </li>
                <li>
                  <strong>Database Updates:</strong> Our database updates
                  automatically from Pokemon TCG API
                </li>
              </ul>
              <p>
                If you consistently cannot find legitimate Pokemon cards, please{" "}
                <Link
                  to="/contact"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  contact our support team
                </Link>{" "}
                with the specific card details and we'll investigate the
                database coverage.
              </p>
            </div>
          ),
          keywords: [
            "can't find pokemon card",
            "missing pokemon cards database",
            "pokemon card not showing up",
          ],
        },
      ],
    },
    {
      id: "technical-support",
      title: "Technical Questions",
      questions: [
        {
          id: "browser-support",
          question: "What browsers and devices support PkmnBindr?",
          answer: (
            <div>
              <p className="mb-3">
                PkmnBindr works on all modern browsers and devices:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>Desktop Browsers:</strong> Chrome, Firefox, Safari,
                  Edge (latest versions)
                </li>
                <li>
                  <strong>Mobile Devices:</strong> iOS Safari, Android Chrome,
                  mobile Firefox(coming soon)
                </li>
                <li>
                  <strong>Tablets:</strong> iPad, Android tablets with full
                  functionality
                </li>
                <li>
                  <strong>Operating Systems:</strong> Windows, macOS, Linux,
                  iOS, Android
                </li>
              </ul>
              <p className="mb-3">
                The responsive design adapts perfectly to your screen size,
                whether you're on a phone, tablet, or desktop computer. Touch
                interfaces work seamlessly for mobile organization.
              </p>
              <p>
                For the best experience, we recommend using the latest browser
                versions with JavaScript enabled. The app works offline once
                loaded, making it perfect for organizing cards anywhere.
              </p>
            </div>
          ),
          keywords: [
            "pokemon organizer browser support",
            "pokemon binder mobile app",
            "device compatibility pokemon",
          ],
        },
        {
          id: "export-options",
          question: "Can I export or backup my Pokemon collection data?",
          answer: (
            <div>
              <p className="mb-3">
                Yes, PkmnBindr provides multiple export options:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>PDF Export:</strong> Create printable binder pages
                  with card images
                </li>
                <li>
                  <strong>Excel/CSV:</strong> Export collection data for
                  spreadsheet analysis(coming soon)
                </li>
                <li>
                  <strong>JSON Format:</strong> Complete data export for
                  technical users(coming soon)
                </li>
                <li>
                  <strong>Individual Binders:</strong> Export specific binders
                  or entire collection(coming soon)
                </li>
                <li>
                  <strong>Visual Exports:</strong> Generate shareable collection
                  images(coming soon)
                </li>
              </ul>
              <p>
                Export features ensure you're never locked into the platform.
                Whether you want physical printouts, data analysis, or backup
                copies, you have full control over your collection data.
              </p>
            </div>
          ),
          keywords: [
            "export pokemon collection",
            "pokemon data backup",
            "pokemon binder pdf export",
          ],
        },
        {
          id: "performance-limits",
          question: "Are there any limits on collection size or performance?",
          answer: (
            <div>
              <p className="mb-3">
                PkmnBindr is optimized for collections of all sizes:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>500 cards per binder</strong>
                </li>
                <li>
                  <strong>Efficient Caching:</strong> Smart loading reduces
                  bandwidth usage
                </li>
                <li>
                  <strong>Scalable Architecture:</strong> Built to handle
                  massive collections
                </li>
                <li>
                  <strong>Browser Storage:</strong> Guest mode limited by
                  browser storage (~5-10MB typical)
                </li>
              </ul>
            </div>
          ),
          keywords: [
            "pokemon collection size limits",
            "large pokemon collection organizer",
            "pokemon database performance",
          ],
        },
      ],
    },
    {
      id: "authenticity-protection",
      title: "Card Authenticity & Protection",
      questions: [
        {
          id: "fake-card-database",
          question:
            "Does the database include counterfeit or fake Pokemon cards?",
          answer: (
            <div>
              <p className="mb-3">
                No, PkmnBindr only includes authentic, officially released
                Pokemon TCG cards:
              </p>
              <ul className="list-disc list-inside mb-3 space-y-2">
                <li>
                  <strong>Official Sources:</strong> Data sourced directly from
                  Pokemon TCG API
                </li>
                <li>
                  <strong>Verified Cards:</strong> Only cards with official set
                  numbers and releases
                </li>
                <li>
                  <strong>Quality Control:</strong> Regular database updates
                  remove any erroneous entries
                </li>
                <li>
                  <strong>Authentication Help:</strong> Compare your physical
                  cards to official digital versions
                </li>
              </ul>
              <p>
                This makes PkmnBindr an excellent tool for authentication -
                compare your physical cards to our verified database entries.
                For detailed authentication guidance, read our comprehensive
                guide on
                <Link
                  to="/blog/how-to-spot-fake-pokemon-cards-protect-collection"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  how to spot fake Pokemon cards
                </Link>{" "}
                which covers advanced detection techniques.
              </p>
            </div>
          ),
          keywords: [
            "authentic pokemon cards",
            "pokemon card authentication",
            "fake pokemon card detection",
          ],
        },
      ],
    },
  ];

  const filteredFAQ = faqData
    .map((section) => ({
      ...section,
      questions: section.questions.filter(
        (q) =>
          searchTerm === "" ||
          q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.keywords.some((keyword) =>
            keyword.toLowerCase().includes(searchTerm.toLowerCase())
          )
      ),
    }))
    .filter((section) => section.questions.length > 0);

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqData.flatMap((section) =>
      section.questions.map((q) => ({
        "@type": "Question",
        name: q.question,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            typeof q.answer === "string"
              ? q.answer
              : q.question.replace(/[<>]/g, ""),
        },
      }))
    ),
  };

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Pokemon Binder Planner FAQ
              </h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-6">
                Everything you need to know about organizing your Pokemon TCG
                collection digitally. Get expert answers about digital binders,
                card databases, and collection management.
              </p>
            </div>
          </div>
        </div>

        {/* Search and Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
            <Link to="/" className="hover:text-blue-600 transition-colors">
              Home
            </Link>
            <ChevronRightIcon className="w-4 h-4" />
            <span className="text-gray-900">FAQ</span>
          </nav>

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search frequently asked questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Quick Links */}
          <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Navigation
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {faqData.map((section) => (
                <button
                  key={section.id}
                  onClick={() =>
                    document
                      .getElementById(section.id)
                      .scrollIntoView({ behavior: "smooth" })
                  }
                  className="text-left p-3 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-700 transition-colors text-sm font-medium"
                >
                  {section.title}
                </button>
              ))}
            </div>
          </div>

          {/* FAQ Sections */}
          <div className="space-y-6">
            {filteredFAQ.map((section) => (
              <div
                key={section.id}
                id={section.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 rounded-t-lg"
                >
                  <h2 className="text-xl font-semibold text-gray-900">
                    {section.title}
                  </h2>
                  {openSections[section.id] ? (
                    <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {openSections[section.id] && (
                  <div className="px-6 pb-6">
                    <div className="space-y-6">
                      {section.questions.map((q) => (
                        <div
                          key={q.id}
                          className="border-l-4 border-blue-200 pl-4"
                        >
                          <h3 className="text-lg font-medium text-gray-900 mb-3">
                            {q.question}
                          </h3>
                          <div className="text-gray-700 leading-relaxed">
                            {q.answer}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Additional Resources */}
          <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Additional Resources
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">
                  Expert Guides
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link
                      to="/blog/ultimate-guide-organizing-pokemon-cards"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Complete Pokemon Card Organization Guide
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/blog/best-pokemon-tcg-tracking-apps-2025-guide"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Best Pokemon TCG Tracking Apps 2025
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/blog/how-to-spot-fake-pokemon-cards-protect-collection"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      How to Spot Fake Pokemon Cards
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Get Started</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link
                      to="/binders"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Create Your First Binder
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/binders/151"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View Pokemon 151 Showcase
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/contact"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Contact Support
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Contact CTA */}
          <div className="mt-8 text-center p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Still have questions?
            </h2>
            <p className="text-gray-600 mb-4">
              Can't find what you're looking for? Our support team is here to
              help.
            </p>
            <Link to="/contact">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors">
                Contact Support
              </button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default FAQPage;
