import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { useState } from "react";
import {
  CheckIcon,
  UserIcon,
  CloudIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
  StarIcon,
  SparklesIcon,
  ComputerDesktopIcon,
  GiftIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const HomePage = () => {
  const { user } = useAuth();
  const [modalImage, setModalImage] = useState(null);

  const openImageModal = (imageSrc, altText) => {
    setModalImage({ src: imageSrc, alt: altText });
  };

  const closeImageModal = () => {
    setModalImage(null);
  };

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-text-primary mb-6">
              Welcome back to PkmnBindr
            </h1>
            <p className="text-xl text-text-secondary mb-8">
              Welcome back,{" "}
              <span className="font-semibold">
                {user.displayName || user.email}
              </span>
              !
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/dashboard">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Go to Dashboard
                </Button>
              </Link>
              <Link to="/binders">
                <Button size="lg" className="bg-green-600 hover:bg-green-700">
                  View My Binders
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const guestFeatures = [
    "Add and organize Pokemon cards",
    "Works completely offline",
    "No account required",
    "Instant access",
    "Browser storage limit (~5-10MB per web standard)",
  ];

  const registeredFeatures = [
    "Everything in Guest Mode",
    "Unlimited storage*",
    "Cloud sync across devices",
    "Browse public community binders",
    "All upcoming features",
  ];

  const upcomingFeatures = [
    "Share binder with just a link to friends",
    "Top lists and leaderboards",
    "Add labels to cards for example, 'For sale' '50$' etc.",
    "And more!",
  ];

  return (
    <>
      {/* Image Modal */}
      {modalImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeImageModal}
        >
          <div className="relative max-w-6xl max-h-full">
            <button
              onClick={closeImageModal}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-8 h-8" />
            </button>
            <img
              src={modalImage.src}
              alt={modalImage.alt}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div className="min-h-screen bg-background">
        {/* Full-width container for hero */}
        <div className="w-full">
          {/* SEO-Optimized Hero Section with Image */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
              <div className="text-left lg:text-left">
                <h1 className="text-5xl lg:text-6xl font-bold text-text-primary mb-6">
                  Free Pokemon Card Binder Organizer{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    PkmnBindr
                  </span>
                </h1>
                <p className="text-xl text-text-secondary mb-4">
                  The ultimate digital Pokemon binder generator for organizing
                  your Pokemon TCG collection. Create your own binders, track
                  cards by set, and sync across devices.
                </p>
                <p className="text-lg text-text-secondary mb-8">
                  Join thousands of Pokemon collectors using the easiest way to
                  manage their card collection online. Choose how you want to
                  get started below.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/auth/register">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                      Create Free Account
                    </Button>
                  </Link>
                  <Link to="/binders">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-gray-300"
                    >
                      Start as Guest
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="rounded-sm overflow-hidden shadow-2xl border border-border cursor-zoom-in hover:shadow-3xl transition-shadow duration-300 group">
                  <img
                    src="/frontpage-images/destined-rivals-binder.png"
                    alt="Pokemon binder showing organized card collection with Destined Rivals cards"
                    className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
                    loading="eager"
                    onClick={() =>
                      openImageModal(
                        "/frontpage-images/destined-rivals-binder.png",
                        "Pokemon binder showing organized card collection with Destined Rivals cards"
                      )
                    }
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                  ✨ 100% Free
                </div>
              </div>
            </div>
          </div>

          {/* See It In Action Section - Full Width */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4 text-white">
                  See PkmnBindr in Action
                </h2>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Experience the beautiful interface and powerful features that
                  make organizing your Pokemon collection effortless
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-semibold mb-3">
                      Drag & Drop Organization
                    </h3>
                    <p className="text-gray-300 mb-4">
                      Easily organize your cards with intuitive drag and drop.
                      Rearrange cards, create custom layouts, and build the
                      perfect binder for your collection.
                    </p>
                  </div>
                  <div className="rounded-sm overflow-hidden shadow-2xl cursor-zoom-in hover:shadow-3xl transition-shadow duration-300 group">
                    <img
                      src="/frontpage-images/binder-click-drag-example.png"
                      alt="Demonstration of drag and drop functionality for organizing Pokemon cards"
                      className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onClick={() =>
                        openImageModal(
                          "/frontpage-images/binder-click-drag-example.png",
                          "Demonstration of drag and drop functionality for organizing Pokemon cards"
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-semibold mb-3">
                      Complete Card Database
                    </h3>
                    <p className="text-gray-300 mb-4">
                      Access every Pokemon card ever released. Search by name,
                      browse by set, or add entire expansions with just a few
                      clicks.
                    </p>
                  </div>

                  {/* Two images side by side showing both features */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="rounded-sm overflow-hidden shadow-2xl cursor-zoom-in hover:shadow-3xl transition-shadow duration-300 group">
                        <img
                          src="/frontpage-images/add-cards-modal-set.png"
                          alt="Add cards modal showing Pokemon TCG database with complete set browsing"
                          className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onClick={() =>
                            openImageModal(
                              "/frontpage-images/add-cards-modal-set.png",
                              "Add cards modal showing Pokemon TCG database with complete set browsing"
                            )
                          }
                        />
                      </div>
                      <div className="bg-blue-600/20 border border-blue-400/30 rounded-lg p-3 text-center">
                        <p className="text-blue-100 text-sm font-medium">
                          📦 You can generate full master sets
                        </p>
                        <p className="text-blue-200 text-xs mt-1">
                          Click image to view larger
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-sm overflow-hidden shadow-2xl cursor-zoom-in hover:shadow-3xl transition-shadow duration-300 group">
                        <img
                          src="/frontpage-images/add-cards-modal.png"
                          alt="Add cards modal showing individual Pokemon card selection"
                          className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onClick={() =>
                            openImageModal(
                              "/frontpage-images/add-cards-modal.png",
                              "Add cards modal showing individual Pokemon card selection"
                            )
                          }
                        />
                      </div>
                      <div className="bg-purple-600/20 border border-purple-400/30 rounded-lg p-3 text-center">
                        <p className="text-purple-100 text-sm font-medium">
                          🎯 You can also select single cards
                        </p>
                        <p className="text-purple-200 text-xs mt-1">
                          Click image to view larger
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="rounded-sm overflow-hidden shadow-2xl cursor-zoom-in hover:shadow-3xl transition-shadow duration-300 group">
                  <img
                    src="/frontpage-images/binder-with-sidebar.png"
                    alt="Pokemon binder interface with sidebar showing collection management tools"
                    className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onClick={() =>
                      openImageModal(
                        "/frontpage-images/binder-with-sidebar.png",
                        "Pokemon binder interface with sidebar showing collection management tools"
                      )
                    }
                  />
                </div>
                <div className="flex flex-col justify-center space-y-6">
                  <div>
                    <h3 className="text-2xl font-semibold mb-3">
                      Professional Binder Views
                    </h3>
                    <p className="text-gray-300 mb-4">
                      Create stunning digital binders that showcase your
                      collection beautifully. Multiple layout options,
                      customizable grids, and professional presentation.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold mb-3">
                      Smart Organization Tools
                    </h3>
                    <p className="text-gray-300">
                      Built-in sidebar with collection stats, quick actions, and
                      organizational tools to help you manage thousands of cards
                      effortlessly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Cards Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Choose Your Experience
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Start organizing immediately as a guest, or create an account
                for the full experience with cloud sync
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
              {/* Guest Mode Card */}
              <div className="relative bg-card-background rounded-2xl shadow-xl border border-border p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="text-center mb-8 mt-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserIcon className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Guest Mode
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Jump right in and start organizing
                  </p>
                  <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Free
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No account needed
                  </p>
                </div>

                <ul className="space-y-4 mb-8">
                  {guestFeatures.map((feature, index) => {
                    const isStorageLimitation = feature.includes(
                      "Browser storage limit"
                    );
                    return (
                      <li key={index} className="flex items-start">
                        {isStorageLimitation ? (
                          <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
                        ) : (
                          <CheckIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        )}
                        <span
                          className={`${
                            isStorageLimitation
                              ? "text-amber-700 dark:text-amber-300"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {feature}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <Link to="/binders" className="block">
                  <Button
                    size="lg"
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    Start as Guest
                  </Button>
                </Link>

                <p className="text-xs text-gray-500 text-center mt-4">
                  ✨ Upgrade to an account anytime to unlock cloud features
                </p>
              </div>

              {/* Registered Account Card */}
              <div className="relative bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl shadow-xl p-8 text-white hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-blue-500">
                {/* Popular Badge */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 px-4 py-1 rounded-full text-sm font-bold flex items-center">
                    <StarIcon className="w-4 h-4 mr-1" />
                    RECOMMENDED
                  </div>
                </div>

                <div className="text-center mb-8 mt-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CloudIcon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Create Account</h3>
                  <p className="text-blue-100 mb-4">
                    Full-featured experience with cloud sync
                  </p>
                  <div className="text-4xl font-bold mb-2">Free</div>
                  <p className="text-sm text-blue-200">Free forever</p>
                </div>

                <ul className="space-y-4 mb-8">
                  {registeredFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckIcon className="w-5 h-5 text-green-300 mr-3 mt-0.5 flex-shrink-0" />
                      <div className="text-white">
                        <span>{feature}</span>
                        {feature === "All upcoming features" && (
                          <ul className="mt-2 ml-4 space-y-1">
                            {upcomingFeatures.map(
                              (upcomingFeature, upcomingIndex) => (
                                <li
                                  key={upcomingIndex}
                                  className="text-sm text-blue-200 flex items-center"
                                >
                                  <span className="w-1.5 h-1.5 bg-blue-300 rounded-full mr-2 flex-shrink-0"></span>
                                  {upcomingFeature}
                                </li>
                              )
                            )}
                          </ul>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                <Link to="/auth/register" className="block">
                  <Button
                    size="lg"
                    className="w-full bg-white text-blue-700 hover:bg-gray-100 font-semibold"
                  >
                    Create Free Account
                  </Button>
                </Link>

                <p className="text-xs text-blue-200 text-center mt-4">
                  Already have an account?{" "}
                  <Link to="/auth/login" className="text-white hover:underline">
                    Sign in here
                  </Link>
                </p>

                <p className="text-xs text-blue-300 text-center mt-3">
                  *Subject to Firebase storage limits and fair use policy
                </p>
              </div>
            </div>
          </div>

          {/* How It Works Section - Visual */}
          <div className="bg-background py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  How to Create Your Pokemon Card Binder
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                  Get started in just three simple steps and have your digital
                  collection organized in minutes
                </p>
              </div>

              <div className="space-y-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                        1
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        Create Your First Digital Binder
                      </h3>
                    </div>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                      Start by creating a new digital Pokemon binder. Name it,
                      customize the layout, and choose your preferred grid size
                      for optimal card organization. Your binder will have a
                      clean, professional look that showcases your collection
                      beautifully.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800 text-sm">
                        💡 <strong>Pro tip:</strong> Create separate binders for
                        different purposes - by set, by favorite Pokemon, or by
                        deck type!
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl overflow-hidden shadow-xl cursor-zoom-in hover:shadow-2xl transition-shadow duration-300 group">
                    <img
                      src="/frontpage-images/page-overview.png"
                      alt="Overview of Pokemon binder page showing clean layout and organization"
                      className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onClick={() =>
                        openImageModal(
                          "/frontpage-images/page-overview.png",
                          "Overview of Pokemon binder page showing clean layout and organization"
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div className="order-2 lg:order-1 rounded-xl overflow-hidden shadow-xl cursor-zoom-in hover:shadow-2xl transition-shadow duration-300 group">
                    <img
                      src="/frontpage-images/add-cards-modal.png"
                      alt="Add cards modal interface showing Pokemon card search and selection"
                      className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onClick={() =>
                        openImageModal(
                          "/frontpage-images/add-cards-modal.png",
                          "Add cards modal interface showing Pokemon card search and selection"
                        )
                      }
                    />
                  </div>
                  <div className="order-1 lg:order-2">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                        2
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        Add Pokemon Cards from Any Set
                      </h3>
                    </div>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                      Search our complete Pokemon TCG database and add cards to
                      your binder instantly. Browse by set, search by name,
                      filter by type or rarity, or add entire sets at once.
                      Every card from Base Set to the latest releases is
                      available.
                    </p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 text-sm">
                        🔍 <strong>Advanced search:</strong> Find exactly what
                        you're looking for with powerful filters and instant
                        search results.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                      3
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      Track & Organize Your Collection
                    </h3>
                  </div>
                  <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
                    View your collection progress, organize by sets, rarity, or
                    custom categories. Your data syncs across all devices
                    automatically, so you can access your collection anywhere,
                    anytime.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                      <div className="text-blue-600 text-2xl mb-2">📊</div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Collection Stats
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Track completion percentage, total cards, and set
                        progress
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                      <div className="text-green-600 text-2xl mb-2">☁️</div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Cloud Sync
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Access your binders from any device, anywhere
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                      <div className="text-purple-600 text-2xl mb-2">🎨</div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Custom Layouts
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Personalize your binder appearance and organization
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Developer Notice */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-8 text-center">
                <div className="text-4xl mb-4">👨‍💻</div>
                <h3 className="text-2xl font-semibold text-amber-900 mb-3">
                  Built with ❤️ by a Solo Developer
                </h3>
                <p className="text-amber-800 mb-4 max-w-2xl mx-auto text-lg">
                  Hey there! PkmnBindr is a passion project I'm actively
                  developing. You might encounter some bugs, missing features,
                  or changes as I continue to improve the experience for fellow
                  collectors.
                </p>
                <p className="text-amber-700">
                  Thanks for being part of this collector-driven journey! 🚀
                </p>
              </div>
            </div>
          </div>

          {/* SEO-Enhanced Feature Highlights */}
          <div className="bg-white dark:bg-gray-800 py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-gray-100 mb-4">
                Why Choose PkmnBindr?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 text-center mb-12 max-w-3xl mx-auto">
                Built by an active Pokemon collector for the community. I
                created this tool to organize my own collection and decided to
                share it with fellow collectors. Expect exciting new features
                and customizations - all binder features stay free.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <SparklesIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Digital Pokemon Binders
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Create unlimited digital binders to organize your Pokemon
                    TCG collection. Modern, intuitive design that makes
                    organizing your collection a joy. No physical space
                    limitations.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ComputerDesktopIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Pokemon Card Search & Database
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Access complete Pokemon TCG database with every card ever
                    released. Search by set, rarity, type, or card name. Works
                    anywhere, online or offline.*
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <GiftIcon className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Cloud Sync & Free Forever
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Your Pokemon collection syncs across all devices
                    automatically. Every binder customization feature is
                    completely free for everyone, forever.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section for SEO */}
          <div className="bg-background py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-gray-100 mb-12">
                Frequently Asked Questions
              </h2>

              <div className="space-y-6">
                <div className="bg-card-background dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Is PkmnBindr really free to use?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Yes! PkmnBindr is completely free forever. Create digital
                    Pokemon binders, add thousands of cards, and sync across
                    devices at no cost.
                  </p>
                </div>

                <div className="bg-card-background dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    How does the Pokemon card database work?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    We use Pokemon TCG API to include every official Pokemon TCG
                    cards ever released*, from Base Set to the latest
                    expansions. Search by set, card name, type, or rarity to
                    find exactly what you're looking for instantly.
                  </p>
                </div>

                <div className="bg-card-background dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Can I access my Pokemon binders on different devices?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Absolutely! Your Pokemon collection syncs automatically
                    across all your devices with a free account.
                  </p>
                </div>

                <div className="bg-card-background dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    How do I organize my Pokemon card collection digitally?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Create separate binders for different purposes - by Pokemon
                    set, by favorite Pokemon, by deck type, or any custom system
                    you prefer. Each binder can hold hundreds of cards with
                    custom layouts.
                  </p>
                </div>

                <div className="bg-card-background dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    What makes PkmnBindr different from other virtual binders?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    PkmnBindr focuses specifically on the visual binder
                    experience that Pokemon collectors love. Beautiful card
                    layouts and completely free access to all binder features.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white text-center">
              <h2 className="text-4xl font-bold mb-4">
                Ready to Start Your Digital Pokemon Collection?
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Join thousands of Pokemon trainers who trust PkmnBindr to
                organize their TCG collections. Start building your digital
                binders today!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth/register">
                  <Button
                    size="lg"
                    className="bg-white text-blue-700 hover:bg-gray-100 font-semibold"
                  >
                    Create Free Pokemon Binder
                  </Button>
                </Link>
                <Link to="/binders">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white bg-transparent text-white hover:bg-white/10"
                  >
                    Try Pokemon Binder Generator
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomePage;
