import { Link } from "react-router-dom";
import {
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";

const BlogIndexPage = () => {
  const blogPosts = [
    {
      id: 1,
      slug: "ultimate-guide-organizing-pokemon-cards",
      title: "From Physical Binders to Digital Dominance",
      excerpt:
        "Master the art of Pokemon card organization with professional techniques that protect your investment and enhance your collecting experience. Learn the four key methods for organizing your collection.",
      readTime: "15 min read",
      date: "June 14, 2025",
      category: "Organization",
      featured: true,
      tags: ["Organization", "Digital", "Collection Management", "Binders"],
    },
    {
      id: 2,
      slug: "fort-knox-pokemon-card-binder-guide-2025",
      title: "Your 2025 Guide to Choosing the Right Card Binder",
      excerpt:
        "Not all binders are created equal. Discover the anatomy of a perfect binder, compare top brands like Vault X vs Ultra PRO vs Dragon Shield, and find the ideal Fort Knox for your treasured collection.",
      readTime: "12 min read",
      date: "June 14, 2025",
      category: "Equipment",
      featured: false,
      tags: ["Binders", "Protection", "Equipment", "Reviews"],
    },
    {
      id: 3,
      slug: "best-pokemon-card-binders-2025-complete-guide",
      title:
        "Best Pokemon Card Binders 2025: Ringless vs D-Ring vs O-Ring Complete Guide",
      excerpt:
        "The ultimate collector's guide to choosing between ringless, D-Ring, and O-Ring binders. Discover which type protects your collection best and why most Pokemon binders on Amazon aren't safe for valuable cards.",
      readTime: "18 min read",
      date: "June 14, 2025",
      category: "Comparison",
      featured: false,
      tags: ["Binders", "Comparison", "Protection", "Safety", "Investment"],
    },
    {
      id: 4,
      slug: "ultimate-pokemon-binder-showdown-2025",
      title: "Vault X vs. Ultra PRO vs. Dragon Shield",
      excerpt:
        "An exhaustive, expert-level comparison of the three biggest binder brands. Feature-by-feature analysis, collector persona matching, and definitive recommendations for your perfect card sanctuary.",
      readTime: "22 min read",
      date: "June 14, 2025",
      category: "Comparison",
      featured: false,
      tags: [
        "VaultX",
        "Ultra PRO",
        "Dragon Shield",
        "Brand Comparison",
        "Expert Review",
      ],
    },
    {
      id: 5,
      slug: "how-to-spot-fake-pokemon-cards-protect-collection",
      title: "How to Spot Fake Pokémon Cards and Protect Your Collection",
      excerpt:
        "Master the art of authentication with this comprehensive guide. From instant red flags to advanced forensic techniques, learn to protect your collection from sophisticated counterfeits that could fool even experienced collectors.",
      readTime: "25 min read",
      date: "June 14, 2025",
      category: "Authentication",
      featured: false,
      tags: [
        "Authentication",
        "Fake Cards",
        "Collection Security",
        "Buyer Protection",
        "Counterfeits",
      ],
    },
    {
      id: 6,
      slug: "best-pokemon-tcg-tracking-apps-2025-guide",
      title:
        "The Ultimate Guide to the Best Pokémon TCG Tracking Apps of 2025: From Scanner to Portfolio",
      excerpt:
        "Discover the top digital tools that will transform your chaotic card collection into an organized, valuable, and accessible portfolio. In-depth reviews of Collectr, Dex, Pokécardex, and more with expert recommendations for every collector type.",
      readTime: "20 min read",
      date: "June 14, 2025",
      category: "Digital",
      featured: false,
      tags: [
        "Apps",
        "Digital Collection",
        "Portfolio Management",
        "Technology",
        "Collection Tracking",
      ],
    },
  ];

  const categories = [
    "All",
    "Organization",
    "Equipment",
    "Comparison",
    "Authentication",
    "Digital",
    "Reviews",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Pokemon Binder Blog
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-6">
              Expert guides, tips, and insights for Pokemon card collectors.
              From organization strategies to equipment reviews, master your
              collecting journey.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-text-secondary dark:text-gray-400 mb-8">
          <Link to="/" className="hover:text-blue-600 transition-colors">
            Home
          </Link>
          <ChevronRightIcon className="w-4 h-4" />
          <span className="text-text-primary dark:text-gray-100">Blog</span>
        </nav>

        {/* Featured Post */}
        {blogPosts.find((post) => post.featured) && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-text-primary dark:text-gray-100 mb-6">
              Featured Article
            </h2>
            <div className="bg-card-background dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-border dark:border-gray-700">
              <div className="md:flex">
                <div className="md:w-1/3 relative">
                  <img
                    src="/blog/1/jt-digital.png"
                    alt="Digital Pokemon collection management interface showing organized card tracking"
                    className="w-full h-full object-cover min-h-[300px]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                    <div className="p-6 text-white">
                      <p className="text-blue-100 text-sm font-medium uppercase tracking-wide">
                        FEATURED GUIDE
                      </p>
                    </div>
                  </div>
                </div>
                <div className="md:w-2/3 p-8">
                  <div className="flex items-center space-x-4 text-sm text-text-secondary dark:text-gray-400 mb-4">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span>
                        {blogPosts.find((post) => post.featured).date}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="w-4 h-4" />
                      <span>
                        {blogPosts.find((post) => post.featured).readTime}
                      </span>
                    </div>
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                      {blogPosts.find((post) => post.featured).category}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-text-primary dark:text-gray-100 mb-4">
                    {blogPosts.find((post) => post.featured).title}
                  </h3>
                  <p className="text-text-secondary dark:text-gray-300 mb-6 leading-relaxed">
                    {blogPosts.find((post) => post.featured).excerpt}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {blogPosts
                      .find((post) => post.featured)
                      .tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-secondary dark:bg-gray-700 text-text-primary dark:text-gray-100 px-3 py-1 rounded-full text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                  <Link
                    to={`/blog/${blogPosts.find((post) => post.featured).slug}`}
                    className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
                  >
                    Read Full Article
                    <ChevronRightIcon className="w-4 h-4 ml-2" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Articles */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            All Articles
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                className="bg-card-background dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-border dark:border-gray-700 hover:shadow-xl transition-shadow duration-300"
              >
                {post.id === 6 ? (
                  <div className="h-48 relative">
                    <img
                      src="/blog/6/tcg-apps-hero.png"
                      alt="Pokemon TCG tracking apps interface showing digital collection management"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                      <div className="p-4 text-white">
                        <p className="text-xs font-medium uppercase tracking-wide opacity-90">
                          {post.category}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : post.id === 1 ? (
                  <div className="h-48 relative">
                    <img
                      src="/blog/1/jt-digital.png"
                      alt="Digital Pokemon collection management interface showing organized card tracking"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                      <div className="p-4 text-white">
                        <p className="text-xs font-medium uppercase tracking-wide opacity-90">
                          {post.category}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : post.id === 2 ? (
                  <div className="h-48 relative">
                    <img
                      src="/blog/2/types.jpeg"
                      alt="Different types of Pokemon card binders showing ringless, D-ring, and O-ring comparison"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                      <div className="p-4 text-white">
                        <p className="text-xs font-medium uppercase tracking-wide opacity-90">
                          {post.category}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : post.id === 4 ? (
                  <div className="h-48 relative">
                    <img
                      src="/blog/4/dragon.png"
                      alt="Dragon Shield Card Codex Zipster binder showcasing the ultimate binder showdown between top brands"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                      <div className="p-4 text-white">
                        <p className="text-xs font-medium uppercase tracking-wide opacity-90">
                          {post.category}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : post.id === 3 ? (
                  <div className="h-48 relative">
                    <img
                      src="/blog/3/ringdent.png"
                      alt="Pokemon card showing binder ring damage and indentations from O-ring binder mechanism"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                      <div className="p-4 text-white">
                        <p className="text-xs font-medium uppercase tracking-wide opacity-90">
                          {post.category}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : post.id === 5 ? (
                  <div className="h-48 relative">
                    <img
                      src="/blog/5/dark-layer.png"
                      alt="Fake Pokemon card showing obvious authentication errors and poor quality"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                      <div className="p-4 text-white">
                        <p className="text-xs font-medium uppercase tracking-wide opacity-90">
                          {post.category}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="w-16 h-16 mx-auto mb-2 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-xl font-bold">
                          {post.category === "Organization"
                            ? "📋"
                            : post.category === "Equipment"
                            ? "🛡️"
                            : post.category === "Comparison"
                            ? "⚖️"
                            : post.category === "Authentication"
                            ? "🔍"
                            : post.category === "Digital"
                            ? "📱"
                            : "📖"}
                        </span>
                      </div>
                      <p className="text-blue-100 text-xs font-medium uppercase tracking-wide">
                        {post.category}
                      </p>
                    </div>
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <div className="flex items-center space-x-1">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{post.date}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {post.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {post.tags.length > 2 && (
                      <span className="text-gray-400 dark:text-gray-500 text-xs px-2 py-1">
                        +{post.tags.length - 2} more
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors duration-200"
                  >
                    Read Article
                    <ChevronRightIcon className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogIndexPage;
