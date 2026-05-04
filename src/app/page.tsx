"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Play, ArrowRight, User } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function UserAuth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState(1);

  // Form State
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (step === 1) {
      if (!fullName || !username || !email || !phone) {
        setError("Please fill in all fields.");
        return;
      }
    } else if (step === 2) {
      if (!location) {
        setError("Please enter your location.");
        return;
      }
    }
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          throw new Error("Passphrases do not match!");
        }
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              username: username,
              phone: phone,
              location: location,
            },
          },
        });
        if (error) throw error;

        // Insert profile row so the user appears in admin management
        if (signUpData.user) {
          const res = await fetch("/api/auth/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: signUpData.user.id,
              email,
              full_name: fullName,
              username: username,
              phone: phone || null,
              location: location || null,
            }),
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error("Failed to create user profile: " + (errData.error || res.statusText));
          }
        }

        alert("Account created! Please check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setStep(1);
    setError(null);
  };

  const inputCls = "w-full bg-black/40 border border-white/10 text-white rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500/60 placeholder-gray-600 text-xs";
  const labelCls = "block text-[9px] font-bold text-white/70 uppercase tracking-widest mb-0.5";

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-black font-sans">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/original-8646640175afc0b42b08ed303436ba4b.jpg"
          alt="Magic World Background"
          fill
          className="object-cover opacity-70"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
      </div>

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-5">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="mx-auto w-10 h-10 relative mb-2 rounded-xl overflow-hidden">
              <Image src="/magic-logo-white.png" alt="Magic Games Logo" fill className="object-contain" priority />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-tight">Magic Games</h1>
            <p className="text-purple-200/60 text-[9px] tracking-widest uppercase font-medium mt-0.5">
              {isSignUp ? `Join the Adventure — Level ${step}/3` : "Enter the Realm"}
            </p>
            {isSignUp && (
              <div className="flex justify-center gap-1.5 mt-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`h-0.5 rounded-full transition-all duration-300 ${s <= step ? "w-5 bg-purple-500" : "w-1.5 bg-white/20"}`} />
                ))}
              </div>
            )}
          </div>

          <form onSubmit={isSignUp && step < 3 ? handleNextStep : handleAuth} className="space-y-2.5">
            {error && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-200 p-1.5 rounded-lg text-[10px] text-center">
                {error}
              </div>
            )}

            {/* LOGIN */}
            {!isSignUp && (
              <>
                <div>
                  <label className={labelCls}>Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <User className="h-3 w-3 text-gray-500" />
                    </div>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className={inputCls + " pl-7"} placeholder="hero@magicgames.com" required />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Passphrase</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <Play className="h-3 w-3 text-gray-500 fill-current" />
                    </div>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className={inputCls + " pl-7"} placeholder="••••••••" required />
                  </div>
                </div>
              </>
            )}

            {/* SIGN UP — LEVEL 1 */}
            {isSignUp && step === 1 && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Full Name</label>
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                        className={inputCls} placeholder="John Doe" required autoFocus />
                    </div>
                    <div>
                      <label className={labelCls}>Username</label>
                      <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                        className={inputCls} placeholder="gamer123" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Email</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        className={inputCls} placeholder="hero@magic.com" required />
                    </div>
                    <div>
                      <label className={labelCls}>Phone</label>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                        className={inputCls} placeholder="+1 555-0000" required />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SIGN UP — LEVEL 2 */}
            {isSignUp && step === 2 && (
              <div>
                <label className={labelCls}>Origin Location</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                  className={inputCls} placeholder="City, Country" required autoFocus />
                <p className="text-[9px] text-gray-500 mt-0.5 ml-0.5">Where does your journey begin?</p>
              </div>
            )}

            {/* SIGN UP — LEVEL 3 */}
            {isSignUp && step === 3 && (
              <div className="space-y-2">
                <div>
                  <label className={labelCls}>Create Passphrase</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className={inputCls} placeholder="••••••••" required minLength={6} autoFocus />
                </div>
                <div>
                  <label className={labelCls}>Confirm Passphrase</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputCls} placeholder="••••••••" required />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              {isSignUp && step > 1 && (
                <button type="button" onClick={handlePrevStep}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-all border border-white/10">
                  Back
                </button>
              )}
              <button type="submit" disabled={loading}
                className="flex-1 group relative flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg overflow-hidden disabled:opacity-50 text-sm">
                <span className="relative z-10 flex items-center gap-1.5">
                  {loading ? "Casting..." : isSignUp ? (step === 3 ? "Complete Quest" : "Next Level") : "Enter World"}
                  {!loading && <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />}
                </span>
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
            </div>
          </form>

          <p className="text-center text-[10px] text-gray-500 mt-3">
            {isSignUp ? "Already have an account?" : "New here?"}{" "}
            <span onClick={toggleMode} className="text-purple-400 hover:text-purple-300 cursor-pointer font-semibold">
              {isSignUp ? "Login" : "Create an account"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
