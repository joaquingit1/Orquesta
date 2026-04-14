"use client";

import { useEffect, useRef, useState } from "react";

const features = [
  {
    number: "01",
    title: "Multi-Agent Debate",
    description: "Two AI agents — an Advocate and a Challenger — analyze every PR, debating strengths and weaknesses to surface a balanced, evidence-based verdict.",
    visual: "debate",
  },
  {
    number: "02",
    title: "Deep Code Analysis",
    description: "Every pull request is scanned for complexity, quality, and impact. No self-reported metrics — just what the code reveals.",
    visual: "ai",
  },
  {
    number: "03",
    title: "Live Streaming Reviews",
    description: "Watch the review unfold in real-time via SSE. See the AI think, debate, and reach a verdict for each engineer.",
    visual: "collab",
  },
  {
    number: "04",
    title: "Evidence-Based Rankings",
    description: "Final rankings are grounded in code evidence with transparent reasoning. No hidden algorithms, no black boxes.",
    visual: "security",
  },
];

function DebateVisual() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      {/* Advocate node */}
      <circle cx="60" cy="80" r="18" fill="none" stroke="currentColor" strokeWidth="2">
        <animate attributeName="r" values="18;20;18" dur="2s" repeatCount="indefinite" />
      </circle>
      <text x="60" y="85" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="currentColor">ADV</text>

      {/* Challenger node */}
      <circle cx="140" cy="80" r="18" fill="none" stroke="currentColor" strokeWidth="2">
        <animate attributeName="r" values="18;20;18" dur="2s" begin="1s" repeatCount="indefinite" />
      </circle>
      <text x="140" y="85" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="currentColor">CHA</text>

      {/* Connection lines - debate arrows */}
      <line x1="78" y1="75" x2="122" y2="75" stroke="currentColor" strokeWidth="1.5">
        <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite" />
      </line>
      <line x1="122" y1="85" x2="78" y2="85" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2">
        <animate attributeName="opacity" values="0.2;1;0.2" dur="1.5s" repeatCount="indefinite" />
      </line>

      {/* Verdict output */}
      <rect x="75" y="115" width="50" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5">
        <animate attributeName="opacity" values="0;1;1" dur="3s" repeatCount="indefinite" />
      </rect>
      <text x="100" y="129" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="currentColor">
        <animate attributeName="opacity" values="0;1;1" dur="3s" repeatCount="indefinite" />
        VERDICT
      </text>

      {/* Lines to verdict */}
      <line x1="60" y1="98" x2="90" y2="115" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="140" y1="98" x2="110" y2="115" stroke="currentColor" strokeWidth="1" opacity="0.4" />

      {/* Pulse ring on verdict */}
      <circle cx="100" cy="125" r="30" fill="none" stroke="currentColor" strokeWidth="1" opacity="0">
        <animate attributeName="r" values="25;50" dur="2s" begin="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0" dur="2s" begin="1s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function AIVisual() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      {/* Central node */}
      <circle cx="100" cy="80" r="12" fill="currentColor">
        <animate attributeName="r" values="12;14;12" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Orbiting nodes */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i * 60) * (Math.PI / 180);
        const radius = 50;
        const x2 = +(100 + Math.cos(angle) * radius).toFixed(4);
        const y2 = +(80 + Math.sin(angle) * radius).toFixed(4);
        return (
          <g key={i}>
            <line
              x1="100"
              y1="80"
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.3"
            >
              <animate
                attributeName="opacity"
                values="0.3;0.8;0.3"
                dur="2s"
                begin={`${i * 0.3}s`}
                repeatCount="indefinite"
              />
            </line>
            <circle
              cx={x2}
              cy={y2}
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <animate
                attributeName="r"
                values="6;8;6"
                dur="2s"
                begin={`${i * 0.3}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        );
      })}

      <circle cx="100" cy="80" r="30" fill="none" stroke="currentColor" strokeWidth="1" opacity="0">
        <animate attributeName="r" values="20;60" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function CollabVisual() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      {/* Stream indicator */}
      <rect x="30" y="30" width="140" height="100" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />

      {/* Streaming lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x="45"
          y={45 + i * 16}
          height="8"
          rx="2"
          fill="currentColor"
          opacity="0.2"
          width="0"
        >
          <animate
            attributeName="width"
            values="0;110;110"
            dur="3s"
            begin={`${i * 0.4}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.2;0.8;0.2"
            dur="3s"
            begin={`${i * 0.4}s`}
            repeatCount="indefinite"
          />
        </rect>
      ))}

      {/* Live indicator */}
      <circle cx="155" cy="40" r="4" fill="currentColor">
        <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function SecurityVisual() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      {/* Shield */}
      <path
        d="M 100 20 L 150 40 L 150 90 Q 150 130 100 145 Q 50 130 50 90 L 50 40 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />

      {/* Inner shield */}
      <path
        d="M 100 35 L 135 50 L 135 85 Q 135 115 100 128 Q 65 115 65 85 L 65 50 Z"
        fill="currentColor"
        opacity="0.1"
      >
        <animate attributeName="opacity" values="0.1;0.2;0.1" dur="2s" repeatCount="indefinite" />
      </path>

      {/* Check inside */}
      <path
        d="M 82 80 L 95 93 L 118 68"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
      </path>

      {/* Scan lines */}
      <line x1="60" y1="60" x2="140" y2="60" stroke="currentColor" strokeWidth="1" opacity="0">
        <animate attributeName="y1" values="40;120;40" dur="3s" repeatCount="indefinite" />
        <animate attributeName="y2" values="40;120;40" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;0.5;0" dur="3s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

function AnimatedVisual({ type }: { type: string }) {
  switch (type) {
    case "debate":
      return <DebateVisual />;
    case "ai":
      return <AIVisual />;
    case "collab":
      return <CollabVisual />;
    case "security":
      return <SecurityVisual />;
    default:
      return <DebateVisual />;
  }
}

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`group relative transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 py-12 lg:py-20 border-b border-foreground/10">
        {/* Number */}
        <div className="shrink-0">
          <span className="font-mono text-sm text-muted-foreground">{feature.number}</span>
        </div>

        {/* Content */}
        <div className="flex-1 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-3xl lg:text-4xl font-display mb-4 group-hover:translate-x-2 transition-transform duration-500">
              {feature.title}
            </h3>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </div>

          {/* Visual */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-48 h-40 text-foreground">
              <AnimatedVisual type={feature.visual} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-24 lg:py-32"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-16 lg:mb-24">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-foreground/30" />
            Capabilities
          </span>
          <h2
            className={`text-4xl lg:text-6xl font-display tracking-tight transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Everything you need.
            <br />
            <span className="text-muted-foreground">Nothing you don&apos;t.</span>
          </h2>
        </div>

        {/* Features List */}
        <div>
          {features.map((feature, index) => (
            <FeatureCard key={feature.number} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
