/**
 * ClientErrorResponses.jsx — Playful, creative HTTP error pages.
 *
 * Each error has its own:
 *   - Unique SVG illustration with animations
 *   - Distinctive color mood (matching Aumovio brand)
 *   - Personality-driven copy
 *   - Light & dark mode support
 *
 * Exports: Unauthorized, BadRequest, PageNotFound,
 *          LoginTimeOut, InvalidToken, ServiceUnavailable
 */

import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import Button from "../../components/ui/Button";
import AuthMiddleware from "../../middleware/authentication/AuthMiddleware";
import CsrfMiddleware from "../../middleware/security/CsrfMiddleware";

/* ─── Shared keyframe injection ─────────────────────────────────────────────── */
const KEYFRAMES = `
  @keyframes err-float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
  @keyframes err-spin-slow{ to{transform:rotate(360deg)} }
  @keyframes err-spin-rev { to{transform:rotate(-360deg)} }
  @keyframes err-blink    { 0%,100%{opacity:1} 49%{opacity:1} 50%,99%{opacity:0} }
  @keyframes err-glitch   { 0%,100%{clip-path:inset(0)} 10%{clip-path:inset(20% 0 60% 0)} 20%{clip-path:inset(70% 0 5% 0)} 30%{clip-path:inset(40% 0 40% 0)} 40%{clip-path:inset(0)} }
  @keyframes err-shake    { 0%,100%{transform:rotate(-1deg)} 50%{transform:rotate(1deg)} }
  @keyframes err-pulse-op { 0%,100%{opacity:.35} 50%{opacity:.9} }
  @keyframes err-drift-l  { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-8px)} }
  @keyframes err-drift-r  { 0%,100%{transform:translateX(0)} 50%{transform:translateX(8px)} }
  @keyframes err-drop     { 0%{transform:translateY(-6px);opacity:0} 100%{transform:translateY(0);opacity:1} }
  @keyframes err-slide-up { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes err-zzz      { 0%{opacity:0;transform:translate(0,0) scale(.6)} 20%{opacity:1} 80%{opacity:1} 100%{opacity:0;transform:translate(12px,-20px) scale(1)} }
  @keyframes err-tick     { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(8deg)} }
  @keyframes err-sand     { 0%{transform:scaleY(1) translateY(0)} 100%{transform:scaleY(0) translateY(10px)} }
  @keyframes err-orbit    { from{transform:rotate(0deg) translateX(60px) rotate(0deg)} to{transform:rotate(360deg) translateX(60px) rotate(-360deg)} }
  @keyframes err-wander   { 0%,100%{transform:translate(0,0) rotate(0deg)} 25%{transform:translate(12px,-8px) rotate(5deg)} 75%{transform:translate(-8px,6px) rotate(-3deg)} }
  @keyframes err-static   { 0%,100%{opacity:.7} 25%{opacity:.3} 50%{opacity:1} 75%{opacity:.4} }
  @keyframes err-spark    { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.4);opacity:1} }
`;

let injected = false;
function injectKeyframes() {
    if (injected) return;
    injected = true;
    const s = document.createElement("style");
    s.textContent = KEYFRAMES;
    document.head.appendChild(s);
}

/* ─── Shared layout wrapper ──────────────────────────────────────────────────── */
function ErrorLayout({
    code,
    title,
    subtitle,
    linkTo,
    linkLabel,
    accentClass,     // Tailwind text colour of the big number
    bgClass,         // page background gradient
    illustration,    // ReactNode — the SVG
    children,        // extra content (description, list, etc.)
}) {
    useEffect(() => { injectKeyframes(); }, []);

    return (
        <div
            className={`relative flex flex-col items-center justify-center min-h-screen overflow-hidden font-aumovio px-6 py-16 ${bgClass}`}
        >
            {/* Soft radial backdrop blob */}
            <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                aria-hidden="true"
            >
                <div className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full top-1/2 left-1/2 w-150 h-150 opacity-20 dark:opacity-10"
                    style={{ background: "radial-gradient(ellipse, currentColor 0%, transparent 70%)" }}
                />
            </div>

            {/* Illustration */}
            <div
                className="relative mb-8 drop-shadow-2xl"
                style={{ animation: "err-drop .6s ease both" }}
            >
                {illustration}
            </div>

            {/* Error code */}
            <p
                className={`font-aumovio-bold tracking-tight leading-none mb-2 select-none ${accentClass}`}
                style={{ fontSize: "clamp(5rem,18vw,9rem)", animation: "err-slide-up .5s .1s ease both", opacity: 0 }}
            >
                {code}
            </p>

            {/* Title */}
            <h1
                className="mb-3 text-2xl text-center md:text-3xl font-aumovio-bold text-black/85 dark:text-white/90"
                style={{ animation: "err-slide-up .5s .2s ease both", opacity: 0 }}
            >
                {title}
            </h1>

            {/* Subtitle */}
            <p
                className="max-w-md mb-6 text-base text-center text-grey-500 dark:text-grey-400"
                style={{ animation: "err-slide-up .5s .3s ease both", opacity: 0 }}
            >
                {subtitle}
            </p>

            {/* Extra content */}
            {children && (
                <div
                    className="w-full max-w-md mb-8 text-center"
                    style={{ animation: "err-slide-up .5s .35s ease both", opacity: 0 }}
                >
                    {children}
                </div>
            )}

            {/* CTA */}
            <div style={{ animation: "err-slide-up .5s .4s ease both", opacity: 0 }}>
                <NavLink to={linkTo}>
                    <Button variant="primary" size="lg" rounded>
                        {linkLabel}
                    </Button>
                </NavLink>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   400 — Bad Request
   Mood: glitchy terminal, scrambled input, confused computer
   ══════════════════════════════════════════════════════════════════════════════ */
export function BadRequest() {
    return (
        <ErrorLayout
            code="400"
            title="You said what now?"
            subtitle="The request arrived garbled beyond comprehension. Even the server looked twice."
            linkTo="/"
            linkLabel="Start fresh"
            accentClass="text-warn-500 dark:text-warn-400"
            bgClass="bg-gradient-to-br from-white via-warn-50/30 to-yellow-50/20 dark:from-[#0D0D14] dark:via-[#1a1030] dark:to-[#0D0D14]"
            illustration={<BadRequestIllustration />}
        />
    );
}

function BadRequestIllustration() {
    const lines = [
        { text: "POST /api/v1/????", y: 54, glitch: true },
        { text: "Content-Type: ␃␄⏎⌂", y: 74 },
        { text: "{ ¿¿id¿¿: NaN,", y: 94 },
        { text: '  name: "⟨◆☒⟩",', y: 114, glitch: true },
        { text: "  payload: undefined", y: 134 },
        { text: "  ██████: ░░░▓▓▓ }", y: 154 },
    ];

    return (
        <div className="relative" style={{ width: 280, height: 200 }}>
            {/* Terminal window */}
            <div className="overflow-hidden border rounded-xl border-warn-400/30 dark:border-warn-400/20 bg-grey-900 dark:bg-black/70"
                style={{ width: 280, animation: "err-shake 2.4s ease-in-out infinite" }}>
                {/* Title bar */}
                <div className="flex items-center gap-1.5 px-3 py-2 bg-grey-800/80">
                    <span className="w-3 h-3 rounded-full bg-danger-400" />
                    <span className="w-3 h-3 rounded-full bg-warn-400" />
                    <span className="w-3 h-3 rounded-full bg-success-400" />
                    <span className="ml-2 font-mono text-xs text-grey-500">request.json</span>
                </div>
                {/* Code lines */}
                <div className="px-4 py-3 font-mono text-xs space-y-0.5">
                    {lines.map((l, i) => (
                        <div key={i}
                            className="text-warn-300"
                            style={l.glitch ? { animation: `err-glitch 3s ${i * .4}s infinite` } : {}}>
                            <span className="mr-2 text-grey-600">{i + 1}</span>
                            {l.text}
                        </div>
                    ))}
                </div>
                {/* Blinking cursor */}
                <div className="px-4 pb-3 font-mono text-xs text-warn-400"
                    style={{ animation: "err-blink 1s step-end infinite" }}>
                    ▌
                </div>
            </div>
            {/* Error badge */}
            <div className="absolute px-2 py-1 text-xs text-black rounded-full shadow-lg -top-3 -right-3 bg-warn-400 font-aumovio-bold"
                style={{ animation: "err-spark 1.5s ease-in-out infinite" }}>
                MALFORMED
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   401 — Unauthorized
   Mood: secret vault, keyhole, spy thriller
   ══════════════════════════════════════════════════════════════════════════════ */
export function Unauthorized() {
    return (
        <ErrorLayout
            code="401"
            title="Access denied."
            subtitle="You don't have clearance for this zone. Credentials, please."
            linkTo="/"
            linkLabel="Return to safety"
            accentClass="text-purple-400"
            bgClass="bg-gradient-to-br from-white via-purple-50/20 to-white dark:from-[#0D0D14] dark:via-purple-950/30 dark:to-[#0D0D14]"
            illustration={<UnauthorizedIllustration />}
        />
    );
}

function UnauthorizedIllustration() {
    return (
        <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
            {/* Spinning outer ring */}
            <div className="absolute border-2 border-dashed rounded-full border-purple-400/30"
                style={{ width: 196, height: 196, animation: "err-spin-slow 12s linear infinite" }} />
            {/* Inner ring */}
            <div className="absolute border rounded-full border-purple-400/20"
                style={{ width: 160, height: 160, animation: "err-spin-rev 8s linear infinite" }}>
                {/* Dots on ring */}
                {[0,60,120,180,240,300].map(deg => (
                    <div key={deg} className="absolute w-2 h-2 rounded-full bg-purple-400/50"
                        style={{ top: "50%", left: "50%", transform: `rotate(${deg}deg) translateX(78px) translateY(-50%)` }} />
                ))}
            </div>
            {/* Vault door */}
            <div className="relative flex items-center justify-center border-4 border-purple-400 rounded-full bg-grey-100 dark:bg-grey-800"
                style={{ width: 120, height: 120, animation: "err-float 3.5s ease-in-out infinite" }}>
                {/* Spokes */}
                {[0,45,90,135].map(deg => (
                    <div key={deg} className="absolute bg-purple-400/60"
                        style={{ width: 3, height: 52, borderRadius: 2, transform: `rotate(${deg}deg)`, transformOrigin: "50% 50%" }} />
                ))}
                {/* Center hub */}
                <div className="absolute z-10 flex items-center justify-center w-10 h-10 bg-purple-400 rounded-full shadow-lg shadow-purple-400/40">
                    {/* Keyhole SVG */}
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <circle cx="11" cy="8" r="4" fill="white" />
                        <path d="M8 8 L7 18 H15 L14 8" fill="white" />
                    </svg>
                </div>
            </div>
            {/* Rejected label */}
            <div className="absolute bottom-0 px-3 py-1 text-xs text-white -translate-x-1/2 rounded-full left-1/2 bg-danger-400 font-aumovio-bold"
                style={{ animation: "err-pulse-op 2s ease-in-out infinite" }}>
                REJECTED
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   404 — Page Not Found
   Mood: lost in deep space, floating explorer
   ══════════════════════════════════════════════════════════════════════════════ */
export function PageNotFound() {
    return (
        <ErrorLayout
            code="404"
            title="Lost in the void."
            subtitle="This page packed its bags and went exploring. We have no idea where it ended up."
            linkTo="/"
            linkLabel="Beam me home"
            accentClass="text-blue-400"
            bgClass="bg-gradient-to-br from-white via-blue-50/20 to-white dark:from-[#06080F] dark:via-[#0a1020] dark:to-[#06080F]"
            illustration={<PageNotFoundIllustration />}
        />
    );
}

function PageNotFoundIllustration() {
    return (
        <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
            {/* Stars */}
            {[[20,30],[180,20],[40,160],[190,150],[100,10],[160,90]].map(([cx,cy],i) => (
                <div key={i} className="absolute bg-blue-400 rounded-full"
                    style={{ width: i%2?3:2, height: i%2?3:2, left:cx, top:cy,
                        animation: `err-pulse-op ${1+i*.3}s ${i*.2}s ease-in-out infinite` }} />
            ))}
            {/* Orbit path */}
            <div className="absolute border border-dashed rounded-full border-blue-400/20"
                style={{ width: 180, height: 180 }} />
            {/* Orbiting tiny planet */}
            <div className="absolute" style={{ width: 180, height: 180, animation: "err-orbit 6s linear infinite" }}>
                <div className="w-5 h-5 rounded-full bg-orange-400 shadow-lg shadow-orange-400/40 -mt-2.5" />
            </div>
            {/* Main planet */}
            <div className="relative border-2 rounded-full bg-linear-to-br from-blue-300 to-blue-500 dark:from-blue-700 dark:to-blue-900 border-blue-400/40"
                style={{ width: 90, height: 90, animation: "err-float 4s ease-in-out infinite" }}>
                {/* Crater marks */}
                <div className="absolute w-5 h-5 border rounded-full border-blue-400/30 dark:border-blue-300/20" style={{ top: 16, left: 14 }} />
                <div className="absolute w-3 h-3 border rounded-full border-blue-400/30 dark:border-blue-300/20" style={{ top: 44, left: 52 }} />
                {/* Question mark */}
                <div className="absolute inset-0 flex items-center justify-center text-2xl text-white font-aumovio-bold">
                    ?
                </div>
            </div>
            {/* Astronaut-ish figure floating off to side */}
            <div className="absolute" style={{ right: 8, top: 30, animation: "err-wander 5s ease-in-out infinite" }}>
                <div className="relative">
                    <div className="flex items-center justify-center w-10 h-10 border-2 rounded-full bg-grey-200 dark:bg-grey-700 border-grey-300 dark:border-grey-600">
                        <div className="w-6 h-6 bg-blue-100 border border-blue-300 rounded-full dark:bg-blue-900 dark:border-blue-600" />
                    </div>
                    <div className="w-8 mx-auto -mt-1 border-2 rounded-b-lg h-9 bg-grey-200 dark:bg-grey-700 border-grey-300 dark:border-grey-600" />
                    {/* Arms */}
                    <div className="absolute w-3 h-2 border rounded-full bg-grey-200 dark:bg-grey-700 border-grey-300 dark:border-grey-600 -left-3 top-10" style={{ transform: "rotate(-20deg)" }} />
                    <div className="absolute w-3 h-2 border rounded-full bg-grey-200 dark:bg-grey-700 border-grey-300 dark:border-grey-600 -right-3 top-10" style={{ transform: "rotate(20deg)" }} />
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   440 — Login Timeout
   Mood: melting clock, sand running out, time thief
   ══════════════════════════════════════════════════════════════════════════════ */
export function LoginTimeOut() {
    useEffect(() => {
        AuthMiddleware.signout();
        CsrfMiddleware.clearToken();
    }, []);

    return (
        <ErrorLayout
            code="440"
            title="Time stole your session."
            subtitle="You were gone a little too long. Your session slipped away while you were distracted."
            linkTo="/auth"
            linkLabel="Sign in again"
            accentClass="text-orange-400"
            bgClass="bg-gradient-to-br from-white via-orange-50/20 to-white dark:from-[#0D0D14] dark:via-[#180a00] dark:to-[#0D0D14]"
            illustration={<LoginTimeOutIllustration />}
        />
    );
}

function LoginTimeOutIllustration() {
    return (
        <div className="relative flex items-center justify-center" style={{ width: 200, height: 220 }}>
            {/* Hourglass body */}
            <div className="relative flex flex-col items-center" style={{ animation: "err-float 3s ease-in-out infinite" }}>
                {/* Top frame */}
                <div className="w-24 h-3 bg-orange-400 rounded-t-lg" />
                {/* Top glass */}
                <div className="relative overflow-hidden border-l-2 border-r-2 bg-orange-50 dark:bg-orange-950/40 border-orange-400/50"
                    style={{ width: 96, height: 72, clipPath: "polygon(0 0, 100% 0, 50% 100%, 50% 100%)" }}>
                    {/* Sand top (draining) */}
                    <div className="absolute bottom-0 left-0 right-0 bg-orange-400"
                        style={{ height: "30%", animation: "err-sand 2s ease-in-out infinite alternate" }} />
                </div>
                {/* Middle pinch */}
                <div className="flex flex-col items-center">
                    <div className="w-1 h-4 bg-orange-400/60" />
                    {/* Drip dot */}
                    <div className="w-2 h-2 bg-orange-400 rounded-full"
                        style={{ animation: "err-drop .8s ease-in-out infinite" }} />
                </div>
                {/* Bottom glass */}
                <div className="relative overflow-hidden border-l-2 border-r-2 bg-orange-50 dark:bg-orange-950/40 border-orange-400/50"
                    style={{ width: 96, height: 72, clipPath: "polygon(50% 0, 50% 0, 100% 100%, 0 100%)" }}>
                    {/* Sand bottom (filling) */}
                    <div className="absolute bottom-0 left-0 right-0 bg-orange-400 rounded-b"
                        style={{ height: "65%" }} />
                </div>
                {/* Bottom frame */}
                <div className="w-24 h-3 bg-orange-400 rounded-b-lg" />
            </div>
            {/* Spinning tick marks around hourglass */}
            <div className="absolute border border-dashed rounded-full border-orange-400/25"
                style={{ width: 190, height: 190, animation: "err-spin-slow 20s linear infinite" }} />
            {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => (
                <div key={deg} className={`absolute font-aumovio-bold text-orange-400/40 text-xs`}
                    style={{
                        width: 190, height: 190,
                        top: 0, left: 0,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        transform: `rotate(${deg}deg)`,
                        transformOrigin: "center center",
                        position: "absolute",
                        paddingTop: 4,
                    }}>
                    {i % 3 === 0 ? "—" : "·"}
                </div>
            ))}
            {/* EXPIRED badge */}
            <div className="absolute px-3 py-1 text-xs text-white bg-orange-400 rounded-full -bottom-2 font-aumovio-bold"
                style={{ animation: "err-pulse-op 1.5s ease-in-out infinite" }}>
                SESSION EXPIRED
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   498 — Invalid Token
   Mood: corrupted/shattered key, digital decay
   ══════════════════════════════════════════════════════════════════════════════ */
export function InvalidToken() {
    useEffect(() => {
        //AuthMiddleware.signout();
    }, []);

    return (
        <ErrorLayout
            code="498"
            title="Token corrupted."
            subtitle="Your access token arrived in pieces. Someone's been tampering — or time ate it."
            linkTo="/auth"
            linkLabel="Get a fresh token"
            accentClass="text-danger-400"
            bgClass="bg-gradient-to-br from-white via-danger-50/20 to-white dark:from-[#0D0D14] dark:via-[#160606] dark:to-[#0D0D14]"
            illustration={<InvalidTokenIllustration />}
        />
    );
}

function InvalidTokenIllustration() {
    return (
        <div className="relative flex items-center justify-center" style={{ width: 220, height: 200 }}>
            {/* Broken key pieces scattered */}
            {/* Key bow (ring part) — cracked */}
            <div className="absolute" style={{ left: 30, top: 30, animation: "err-drift-l 2.5s ease-in-out infinite" }}>
                <svg width="70" height="70" viewBox="0 0 70 70" fill="none">
                    <circle cx="35" cy="35" r="24" stroke="#D82822" strokeWidth="5" strokeDasharray="8 3" opacity=".8"/>
                    <circle cx="35" cy="35" r="14" stroke="#D82822" strokeWidth="3" opacity=".4"/>
                    {/* Crack line */}
                    <path d="M35 11 L32 25 L38 35 L30 50" stroke="#D82822" strokeWidth="2" strokeLinecap="round" opacity=".9"/>
                </svg>
            </div>
            {/* Key blade (teeth part) — broken */}
            <div className="absolute" style={{ right: 20, bottom: 30, animation: "err-drift-r 3s ease-in-out infinite" }}>
                <svg width="100" height="50" viewBox="0 0 100 50" fill="none">
                    <rect x="0" y="20" width="60" height="10" rx="2" fill="#D82822" opacity=".7"/>
                    <rect x="12" y="12" width="8" height="8" rx="1" fill="#D82822" opacity=".8"/>
                    <rect x="28" y="12" width="8" height="8" rx="1" fill="#D82822" opacity=".6"/>
                    <rect x="42" y="12" width="8" height="8" rx="1" fill="#D82822" opacity=".7"/>
                    {/* Jagged break */}
                    <path d="M60 18 L68 22 L63 26 L72 30" stroke="#D82822" strokeWidth="2" strokeLinecap="round" opacity=".6"/>
                    <rect x="72" y="16" width="22" height="14" rx="2" fill="#D82822" opacity=".3"
                        style={{ animation: "err-static 1.5s ease-in-out infinite" }}/>
                </svg>
            </div>
            {/* Center glow — the "explosion" point */}
            <div className="absolute border rounded-full bg-danger-400/15 border-danger-400/30"
                style={{ width: 90, height: 90, animation: "err-pulse-op 1.8s ease-in-out infinite" }}>
                <div className="absolute border rounded-full inset-4 bg-danger-400/20 border-danger-400/40"
                    style={{ animation: "err-pulse-op 1.8s .4s ease-in-out infinite" }} />
            </div>
            {/* Floating hash fragments */}
            {["0xA3", "FF", "??", "NaN", "err"].map((t, i) => (
                <div key={i} className="absolute font-mono text-xs text-danger-400/60 font-aumovio-bold"
                    style={{
                        top: [10, 60, 140, 20, 160][i],
                        left: [120, 160, 140, 60, 40][i],
                        animation: `err-${i%2?"drift-l":"drift-r"} ${2+i*.3}s ${i*.2}s ease-in-out infinite`,
                        transform: `rotate(${[-15,20,-10,25,-5][i]}deg)`
                    }}>
                    {t}
                </div>
            ))}
            {/* Bottom label */}
            <div className="absolute bottom-0 px-3 py-1 text-xs -translate-x-1/2 border rounded-md left-1/2 bg-danger-100 dark:bg-danger-400/15 border-danger-400/30 text-danger-400 font-aumovio-bold whitespace-nowrap">
                VERIFICATION FAILED
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   523 — Service Unavailable
   Mood: sleeping server robot, maintenance crew, snoring machine
   ══════════════════════════════════════════════════════════════════════════════ */
export function ServiceUnavailable() {
    return (
        <ErrorLayout
            code="523"
            title="The server is napping."
            subtitle="Something went sideways on our end. Our team has been paged — sit tight."
            linkTo="/"
            linkLabel="Try the home page"
            accentClass="text-purple-400 dark:text-purple-300"
            bgClass="bg-gradient-to-br from-white via-purple-50/20 to-white dark:from-[#0D0D14] dark:via-[#120a1e] dark:to-[#0D0D14]"
            illustration={<ServiceUnavailableIllustration />}
        >
            {/* Helpful info block */}
            <div className="p-4 mt-4 text-sm text-left border bg-white/60 dark:bg-white/5 border-purple-400/20 rounded-xl text-grey-600 dark:text-grey-400 font-aumovio">
                <p className="mb-2 font-aumovio-bold text-black/70 dark:text-white/70">If this keeps happening, note:</p>
                <ul className="space-y-1 list-disc list-inside">
                    <li>The time it occurred</li>
                    <li>What you were doing when it happened</li>
                    <li>Any error messages you saw</li>
                </ul>
            </div>
        </ErrorLayout>
    );
}

function ServiceUnavailableIllustration() {
    return (
        <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
            {/* Server body */}
            <div className="relative" style={{ animation: "err-float 4s ease-in-out infinite" }}>
                {/* Server tower */}
                <div className="relative overflow-hidden border-2 bg-grey-100 dark:bg-grey-800 border-grey-300 dark:border-grey-600 rounded-xl"
                    style={{ width: 110, height: 130 }}>
                    {/* Server rack stripes */}
                    {[0,1,2,3].map(i => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-grey-200 dark:border-grey-700">
                            {/* Status light — all red/off */}
                            <div className={`w-2 h-2 rounded-full ${i===1?"bg-danger-400":"bg-grey-400 dark:bg-grey-600"}`}
                                style={i===1?{animation:"err-pulse-op 1.5s ease-in-out infinite"}:{}} />
                            {/* Bar */}
                            <div className="flex-1 h-1.5 rounded-full bg-grey-200 dark:bg-grey-700" />
                        </div>
                    ))}
                    {/* Sleep face */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="flex gap-4 mb-2">
                            {/* Closed eyes */}
                            <svg width="14" height="8" viewBox="0 0 14 8">
                                <path d="M1 1 Q7 8 13 1" stroke="#9ca3af" strokeWidth="2" fill="none" strokeLinecap="round"/>
                            </svg>
                            <svg width="14" height="8" viewBox="0 0 14 8">
                                <path d="M1 1 Q7 8 13 1" stroke="#9ca3af" strokeWidth="2" fill="none" strokeLinecap="round"/>
                            </svg>
                        </div>
                        {/* Small smile */}
                        <svg width="20" height="10" viewBox="0 0 20 10">
                            <path d="M2 2 Q10 10 18 2" stroke="#9ca3af" strokeWidth="2" fill="none" strokeLinecap="round"/>
                        </svg>
                    </div>
                </div>
                {/* Server base */}
                <div className="w-full h-4 border-b-2 rounded-b-lg bg-grey-200 dark:bg-grey-700 border-x-2 border-grey-300 dark:border-grey-600" />
            </div>

            {/* Zzz floating letters */}
            {[
                { text: "z", size: 16, style: { left: 140, top: 80, animationDelay: "0s" } },
                { text: "Z", size: 20, style: { left: 158, top: 55, animationDelay: ".5s" } },
                { text: "Z", size: 26, style: { left: 172, top: 24, animationDelay: "1s" } },
            ].map(({ text, size, style }, i) => (
                <div key={i}
                    className="absolute text-purple-400 font-aumovio-bold"
                    style={{ fontSize: size, animation: `err-zzz 2.5s ${style.animationDelay} ease-in-out infinite`, ...style }}>
                    {text}
                </div>
            ))}

            {/* Warning cone */}
            <div className="absolute bottom-4 left-8" style={{ animation: "err-shake 2s ease-in-out infinite" }}>
                <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
                    <path d="M14 2L26 30H2L14 2Z" fill="#FFD600" stroke="#B39600" strokeWidth="1.5"/>
                    <rect x="2" y="24" width="24" height="4" rx="2" fill="#FFD600" stroke="#B39600" strokeWidth="1"/>
                    <path d="M13 10V18M13 22V23" stroke="#B39600" strokeWidth="2" strokeLinecap="round"/>
                </svg>
            </div>

            {/* Wrench tool */}
            <div className="absolute top-8 left-14" style={{ animation: "err-tick 1.5s ease-in-out infinite", transformOrigin: "bottom center" }}>
                <svg width="20" height="36" viewBox="0 0 20 36" fill="none">
                    <rect x="8" y="16" width="4" height="18" rx="2" fill="#888780"/>
                    <rect x="4" y="6" width="12" height="10" rx="3" fill="#888780"/>
                    <rect x="2" y="4" width="4" height="6" rx="1" fill="#888780"/>
                    <rect x="14" y="4" width="4" height="6" rx="1" fill="#888780"/>
                </svg>
            </div>
        </div>
    );
}

/* ─── Default exports (named) ─── */
export default {
    Unauthorized,
    BadRequest,
    PageNotFound,
    LoginTimeOut,
    InvalidToken,
    ServiceUnavailable,
};