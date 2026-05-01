// AuthContainer.tsx
import { useState, useEffect } from "react";
import { Users, MessageSquare, Shield, Sparkles } from "lucide-react";
import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";
import { motion, AnimatePresence } from "framer-motion";


const AuthContainer = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [direction, setDirection] = useState(1);

  const handleSwitchMode = (newMode: "login" | "signup") => {
    if (mode === newMode) return;

    setDirection(newMode === "signup" ? 1 : -1);
    setMode(newMode);
  };



  // const handleSwitchMode = (newMode: "login" | "signup") => {
  //   if (mode === newMode) return;

  //   setIsAnimating(true);
  //   setTimeout(() => {
  //     setMode(newMode);
  //     setIsAnimating(false);
  //   }, 300);
  // };

  const leftPanelVariants = {
    initial: (direction: number) => ({
      x: direction > 0 ? -40 : 40,
      opacity: 0,
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    exit: (direction: number) => ({
      x: direction > 0 ? 40 : -40,
      opacity: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      },
    }),
  };

  const slideVariants = {
    initial: (direction: number) => ({
      x: direction > 0 ? 80 : -80,
      opacity: 0,
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.45,
        ease: [0.4, 0, 0.2, 1], // BUTTER
      },
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -80 : 80,
      opacity: 0,
      transition: {
        duration: 0.35,
        ease: [0.4, 0, 0.2, 1],
      },
    }),
  };


  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="flex min-h-screen">
        {/* Left Side - Image/Content */}
        <div
          className={`hidden lg:flex lg:w-1/2 relative overflow-hidden ${
            mode === "login" ? "order-1" : "order-2"
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 dark:from-blue-900/30 dark:to-purple-900/30" />

          <div className="relative z-10 w-full flex items-center justify-center p-12">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={mode}
                custom={direction}
                variants={leftPanelVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="max-w-md mx-auto space-y-8"
              >
                {/* Logo */}
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 rounded-xl text-white">
                    <MessageSquare size={28} />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    AetherChat
                  </h1>
                </div>

                {/* Content */}
                {mode === "login" ? (
                  <>
                    <h2 className="text-4xl font-bold">Welcome Back</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                      Continue your conversations where you left off.
                    </p>
                    {/* features */}
                  </>
                ) : (
                  <>
                    <h2 className="text-4xl font-bold">Join AetherChat</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                      Create your account and start collaborating.
                    </p>
                    {/* features */}
                  </>
                )}

                {/* Stats */}
                <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
                  {/* stats here */}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* <div
          className={`hidden lg:flex lg:w-1/2 relative overflow-hidden transition-all duration-700 ${
            mode === "login" ? "order-1" : "order-2"
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 dark:from-blue-900/30 dark:to-purple-900/30" />

          <div className="relative z-10 w-full flex flex-col items-center justify-center p-12">
            <div className="max-w-md mx-auto space-y-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 rounded-xl text-white">
                  <MessageSquare size={28} />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  AetherChat
                </h1>
              </div>
              <div className="space-y-6">
                {mode === "login" ? (
                  <>
                    <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
                      Welcome Back
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                      Continue your conversations where you left off. Sign in to
                      connect with your team.
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Shield className="text-green-500" size={20} />
                        <span className="text-gray-700 dark:text-gray-300">
                          Enterprise-grade security
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="text-blue-500" size={20} />
                        <span className="text-gray-700 dark:text-gray-300">
                          Connect with your entire team
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Sparkles className="text-purple-500" size={20} />
                        <span className="text-gray-700 dark:text-gray-300">
                          Smart message organization
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
                      Join AetherChat
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                      Create your account and start collaborating with your team
                      in real-time.
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Shield className="text-green-500" size={20} />
                        <span className="text-gray-700 dark:text-gray-300">
                          End-to-end encryption
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="text-blue-500" size={20} />
                        <span className="text-gray-700 dark:text-gray-300">
                          Unlimited team members
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Sparkles className="text-purple-500" size={20} />
                        <span className="text-gray-700 dark:text-gray-300">
                          Advanced collaboration features
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      10K+
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Active Users
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      99.9%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Uptime
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      24/7
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Support
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div> */}

        {/* Right Side - Form */}
        {/* Right Side - Form */}
        <div
          className={`w-full lg:w-1/2 flex items-center justify-center p-4 md:p-8 ${
            mode === "login" ? "order-2" : "order-1"
          }`}
        >
          <div className="relative w-full max-w-md">
            <AnimatePresence mode="wait" custom={direction}>
              {mode === "login" ? (
                <motion.div
                  key="login"
                  custom={direction}
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <LoginPage
                    onSwitchToSignup={() => handleSwitchMode("signup")}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="signup"
                  custom={direction}
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <SignupPage
                    onSwitchToLogin={() => handleSwitchMode("login")}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthContainer;
