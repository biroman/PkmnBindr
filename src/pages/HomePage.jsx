import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
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
} from "@heroicons/react/24/outline";

const HomePage = () => {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Welcome back to PokemonBindr
            </h1>
            <p className="text-xl text-gray-600 mb-8">
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
    "Create unlimited binders locally",
    "Add and organize Pokemon cards",
    "Works completely offline",
    "No account required",
    "Instant access",
  ];

  const registeredFeatures = [
    "Everything in Guest Mode",
    "Cloud sync across devices",
    "All upcoming features",
  ];

  const upcomingFeatures = [
    "Share binder with a link to friends",
    "Browse public community binders",
    "Top lists and leaderboards",
    "And more!",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              PokemonBindr
            </span>
          </h1>
          <p className="text-2xl text-gray-600 mb-8 max-w-4xl mx-auto">
            The ultimate platform for organizing your Pokemon card collection.
            Choose how you want to get started.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {/* Guest Mode Card */}
          <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Guest Mode
              </h3>
              <p className="text-gray-600 mb-4">
                Jump right in and start organizing
              </p>
              <div className="text-4xl font-bold text-gray-900 mb-2">Free</div>
              <p className="text-sm text-gray-500">No account needed</p>
            </div>

            <ul className="space-y-4 mb-8">
              {guestFeatures.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
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
          </div>
        </div>

        {/* Developer Notice */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-3">👨‍💻</div>
            <h3 className="text-lg font-semibold text-amber-900 mb-2">
              Built with ❤️ by a Solo Developer
            </h3>
            <p className="text-amber-800 mb-3 max-w-2xl mx-auto">
              Hey there! PokemonBindr is a passion project I'm actively
              developing. You might encounter some bugs, missing features, or
              changes as I continue to improve the experience.
            </p>
            <p className="text-sm text-amber-700">
              Thanks for your patience and for being part of this journey! 🚀
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose PokemonBindr?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <SparklesIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Beautiful Interface
              </h3>
              <p className="text-gray-600">
                Modern, intuitive design that makes organizing your collection a
                joy
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ComputerDesktopIcon className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Works Anywhere
              </h3>
              <p className="text-gray-600">
                Access your collection on any computer, online or offline*
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GiftIcon className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                All Customization Free
              </h3>
              <p className="text-gray-600">
                Every binder customization feature is completely free for
                everyone
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Start?</h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of trainers who trust PokemonBindr to organize
              their collections
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth/register">
                <Button
                  size="lg"
                  className="bg-white text-blue-700 hover:bg-gray-100 font-semibold"
                >
                  Get Started Free
                </Button>
              </Link>
              <Link to="/binders">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white bg-transparent text-white hover:bg-white/10"
                >
                  Try as Guest
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
