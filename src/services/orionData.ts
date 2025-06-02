export type Impact = "high" | "medium" | "low";

export type Insight = {
  title: string;
  summary: string;
  proposedActions: {
    content: string;
    value: number;
    effort: number;
  }[];
};

export type AiInsight = {
  company: string;
  homepage: string;
  insight: Insight;
  impact: Impact;
  links: readonly string[];
};

export type IResponse = {
  aiInsights: AiInsight[];
};

export const orion_data: IResponse = {
  aiInsights: [
    {
      company: "Digital Guardian",
      homepage: "https://www.digitalguardian.com",
      insight: {
        title: "Emphasis on Regulatory Compliance",
        summary:
          "Digital Guardian (part of Fortra) is heavily emphasizing assistance with various compliance standards, particularly CMMC 2.0 for defense contractors, ISO 27001, and UK GSC. This indicates a strong market focus on regulated industries and the importance of data classification for meeting these requirements.",
        proposedActions: [
          {
            content:
              "Research relevant industry compliance standards (e.g., CMMC if working with DoD) and assess your current posture.",
            value: 6,
            effort: 3,
          },
          {
            content:
              "Identify tools or services that specifically address the data classification and compliance needs relevant to your business.",
            value: 7,
            effort: 4,
          },
          {
            content:
              "Highlight your own compliance capabilities in marketing materials to attract clients in regulated sectors.",
            value: 8,
            effort: 5,
          },
        ],
      },
      impact: "medium" as Impact,
      links: [
        "https://t.co/yYkIpoDnTY",
        "https://t.co/0EcsjSoNFX",
        "https://t.co/tvXeivil4D",
        "https://t.co/yxpSmJ073H",
        "https://t.co/lbEmhnTepY",
        "https://t.co/cDTXLmCiSB",
        "https://t.co/jPDCTxXD7T",
        "https://t.co/PsF8gJjZtd",
        "https://t.co/4ypjlqV7Qu",
        "https://t.co/0lSW4rGBNu",
      ] as const,
    },
    {
      company: "Digital Guardian",
      homepage: "https://www.digitalguardian.com",
      insight: {
        title: "Promoting Integrated SSE Security",
        summary:
          "Digital Guardian is promoting its Secure Service Edge (SSE) solution, integrating DLP, CASB, SWG, and ZTNA, and highlighting specific features like secure collaboration and support for new processors. This points to a strategy of offering a comprehensive security platform.",
        proposedActions: [
          {
            content:
              "Analyze your current security stack to identify potential gaps addressed by an integrated SSE approach.",
            value: 5,
            effort: 4,
          },
          {
            content:
              "Evaluate if offering bundled security solutions or integrations could be valuable to your customers.",
            value: 7,
            effort: 6,
          },
          {
            content:
              "Communicate the benefits of your specific security components or integrations clearly to differentiate from broad platforms.",
            value: 6,
            effort: 5,
          },
        ],
      },
      impact: "medium" as Impact,
      links: [
        "https://t.co/mtuNw5uy8T",
        "https://t.co/3ADhPb9M0U",
        "https://t.co/sA6T0teQlb",
        "https://t.co/H67nVxYK35",
        "https://t.co/uix54jCLf7",
        "https://t.co/FYwpc9cw3v",
        "https://t.co/1KXY5Otiif",
      ] as const,
    },
    {
      company: "Digital Guardian",
      homepage: "https://www.digitalguardian.com",
      insight: {
        title: "Transparent Pricing and Fortra Branding",
        summary:
          "Digital Guardian is highlighting transparent pricing for data protection and is actively transitioning its presence to the parent company, Fortra. This suggests a strategic move towards clearer offerings and leveraging the parent brand.",
        proposedActions: [
          {
            content:
              "Ensure your own pricing structure is clear, easy to understand, and readily available to potential customers.",
            value: 5,
            effort: 3,
          },
          {
            content:
              "Evaluate opportunities to align more closely with any parent company or key partners to leverage their brand recognition.",
            value: 6,
            effort: 5,
          },
          {
            content:
              "Gather feedback on customer perception of your pricing and compare it to competitors emphasizing transparency.",
            value: 4,
            effort: 3,
          },
        ],
      },
      impact: "low" as Impact,
      links: [
        "https://t.co/TD91CH5fRI",
        "https://www.linkedin.com/posts/digitalguardian_so-called-free-dlp-may-sound-enticing-activity-7303145006427426816-_nXk?utm_source=share&utm_medium=member_desktop&rcm=ACoAABqPb3sBQMB85qi1NJk8roTXHVauBU5tTcE",
        "https://www.linkedin.com/posts/digitalguardian_find-the-same-great-content-from-digital-activity-7313249995590090752-kmcy?utm_source=share&utm_medium=member_desktop&rcm=ACoAABqPb3sBQMB85qi1NJk8roTXHVauBU5tTcE",
      ] as const,
    },
    {
      company: "Zscaler",
      homepage: "https://www.zscaler.com/",
      insight: {
        title: "Expanding Leadership in Key Areas",
        summary:
          "Zscaler has recently hired leaders for IoT GTM and VP of Product Strategy for ZDX. This signals a strategic focus on expanding their Zero Trust platform into the IoT/OT space and accelerating the development of their digital experience monitoring solution.",
        proposedActions: [
          {
            content:
              "Research the growing importance of IoT/OT security for SMBs in relevant industries.",
            value: 5,
            effort: 3,
          },
          {
            content:
              "Evaluate your own product roadmap or service offerings to see if there are opportunities in IoT/OT security or digital experience monitoring.",
            value: 7,
            effort: 6,
          },
        ],
      },
      impact: "medium" as Impact,
      links: [
        "https://www.linkedin.com/posts/zscaler_zscaler-could-not-be-more-excited-to-welcome-activity-7320936776963936258-SGnL?utm_source=share&utm_medium=member_desktop&rcm=ACoAABqPb3sBQMB85qi1NJk8roTXHVauBU5tTcE",
        "https://www.linkedin.com/posts/zscaler_zscalerlife-activity-7320170477300199426-hrAH?utm_source=share&utm_medium=member_desktop&rcm=ACoAABqPb3sBQMB85qi1NJk8roTXHVauBU5tTcE",
      ] as const,
    },
    {
      company: "Zscaler",
      homepage: "https://www.zscaler.com/",
      insight: {
        title: "Leveraging AI and Threat Research",
        summary:
          "Zscaler is leveraging AI for new DLP features (discovery, Email DLP, GenAI prompt inspection) and their ThreatLabz team is publishing research on AI-driven phishing and specific threat actor tactics. This highlights their investment in advanced threat intelligence and proactive security measures. They were also recognized as a Leader in the IDC MarketScape: Worldwide DLP 2025.",
        proposedActions: [
          {
            content:
              "Investigate how AI can be integrated into your security offerings or internal security practices.",
            value: 8,
            effort: 7,
          },
          {
            content:
              "Follow Zscaler ThreatLabz reports and other threat intelligence sources to stay informed about the latest attack trends relevant to your customers.",
            value: 7,
            effort: 3,
          },
          {
            content:
              "Communicate your own expertise or capabilities in detecting and mitigating advanced threats, including AI-driven ones.",
            value: 7,
            effort: 5,
          },
        ],
      },
      impact: "high" as Impact,
      links: [
        "https://t.co/FodTJCIZuZ",
        "https://t.co/u44fRzuu17",
        "https://www.zscaler.com/press/zscaler-threatlabz-uncovers-surge-ai-driven-cyberattacks-targeting-critical-business",
        "https://t.co/YfFCBxNwxh",
        "https://t.co/5O5XAnpwcw",
        "https://www.zscaler.com/blogs/security-research/latest-mustang-panda-arsenal-paklog-corklog-and-splatcloak-p2",
        "https://t.co/MjdScypHDq",
      ] as const,
    },
    {
      company: "Zscaler",
      homepage: "https://www.zscaler.com/",
      insight: {
        title: "Promoting Zero Trust and Market Presence",
        summary:
          "Zscaler is actively promoting the cost-saving and security benefits of their Zero Trust approach across various channels and sectors (e.g., automotive, government), while targeting potential customers in France between ages 30-60. They are also participating in major events like AWS Summit London. This indicates a strong marketing push and focus on demonstrating tangible value and broad applicability.",
        proposedActions: [
          {
            content:
              "Clearly articulate the specific security benefits and ROI of your own solutions or services for SMBs.",
            value: 8,
            effort: 6,
          },
          {
            content:
              "Explore opportunities to participate in industry events or webinars to increase your market visibility and engage with potential customers.",
            value: 7,
            effort: 7,
          },
          {
            content:
              "Develop marketing content that directly addresses how your solutions compare to or integrate with Zero Trust frameworks, positioning your unique value.",
            value: 9,
            effort: 8,
          },
        ],
      },
      impact: "high" as Impact,
      links: [
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&q=Zscaler&search_type=keyword_unordered",
        "https://t.co/F1L6QHq2oX",
        "https://t.co/ZBmRD1ma0p",
        "https://t.co/3EWfRyNVMP",
        "https://go.aws/3IDZCAD",
      ] as const,
    },
    {
      company: "Forcepoint",
      homepage: "https://www.forcepoint.com/",
      insight: {
        title: "Acquired GetVisibility, Boosts AI Security",
        summary:
          "Forcepoint recently acquired GetVisibility, integrating its AI Mesh, DSPM, and DDR capabilities. This significantly enhances their AI-powered data security offerings, focusing on real-time visibility, context, and control across hybrid cloud and GenAI environments.",
        proposedActions: [
          {
            content:
              "Research GetVisibility's AI Mesh and DSPM/DDR capabilities to understand Forcepoint's enhanced offering.",
            value: 6,
            effort: 4,
          },
          {
            content:
              "Evaluate your own capabilities in AI-powered data discovery, classification, and data security posture management.",
            value: 7,
            effort: 5,
          },
          {
            content:
              "Communicate your approach to AI-driven data security and how it differentiates from newly integrated competitor solutions.",
            value: 8,
            effort: 6,
          },
        ],
      },
      impact: "high" as Impact,
      links: [
        "https://www.linkedin.com/posts/forcepoint_its-official-getvisibility-is-now-part-activity-7314982308942368768-PmoV?utm_source=share&utm_medium=member_desktop&rcm=ACoAABqPb3sBQMB85qi1NJk8roTXHVauBU5tTcE",
        "https://www.linkedin.com/posts/forcepoint_at-forcepoint-we-have-been-working-hard-activity-7319062168493064194-lOVQ?utm_source=share&utm_medium=member_desktop&rcm=ACoAABqPb3sBQMB85qi1NJk8roTXHVauBU5tTcE",
        "https://bit.ly/41MXCRY",
      ] as const,
    },
    {
      company: "Forcepoint",
      homepage: "https://www.forcepoint.com/",
      insight: {
        title: "Evolving DLP for Cloud/GenAI",
        summary:
          "Forcepoint is emphasizing the need for DLP to evolve to address modern threats in cloud and GenAI environments, highlighting features like behavioral context, user intent, and risk scoring. They are also promoting solutions for M365 security and addressing specific infostealer/ransomware threats.",
        proposedActions: [
          {
            content:
              "Assess your current DLP capabilities or data protection strategy against risks posed by cloud services and generative AI usage.",
            value: 6,
            effort: 4,
          },
          {
            content:
              "Explore solutions that provide visibility and control over data use within common cloud applications like Microsoft 365.",
            value: 7,
            effort: 5,
          },
          {
            content:
              "Educate your customers or team on the evolving threat landscape, including ransomware and infostealers, and how your solutions help mitigate them.",
            value: 6,
            effort: 4,
          },
        ],
      },
      impact: "medium" as Impact,
      links: [
        "https://t.co/qESuqezHMg",
        "https://t.co/XNeutFlgA7",
        "https://t.co/XhF5QsE5vW",
        "https://t.co/jJtaMJqSnE",
        "https://t.co/PrZBbp9mVt",
        "https://www.linkedin.com/posts/forcepoint_false-positives-insider-risk-genai-threats-activity-7320838005034819584-g7F8?utm_source=share&utm_medium=member_desktop&rcm=ACoAABqPb3sBQMB85qi1NJk8roTXHVauBU5tTcE",
      ] as const,
    },
    {
      company: "Forcepoint",
      homepage: "https://www.forcepoint.com/",
      insight: {
        title: "Targeting Compliance and Events",
        summary:
          "Forcepoint is addressing specific government compliance programs like the U.S. DOJ Data Security Program and actively participating in events like RSA Conference and GISEC Global. This shows a focus on the compliance market and maintaining visibility, particularly post-divestiture of their government business.",
        proposedActions: [
          {
            content:
              "Investigate the U.S. DOJ Data Security Program  or other relevant government compliance requirements if you serve clients in that sector.",
            value: 5,
            effort: 3,
          },
          {
            content:
              "Evaluate participation in key industry events to connect with potential customers and partners.",
            value: 7,
            effort: 7,
          },
          {
            content:
              "Monitor Forcepoint's activities in the government or regulated sectors to understand their go-to-market strategy.",
            value: 5,
            effort: 2,
          },
        ],
      },
      impact: "medium" as Impact,
      links: [
        "https://www.linkedin.com/posts/forcepoint_the-us-department-of-justice-doj-has-activity-7321630846107410434-sOwH?utm_source=share&utm_medium=member_desktop&rcm=ACoAABqPb3sBQMB85qi1NJk8roTXHVauBU5tTcE",
        "https://www.forcepoint.com/blog/insights/doj-data-security-program-what-to-know",
        "https://www.linkedin.com/posts/forcepoint_with-over-750-companies-and-25000-attendees-activity-7320310413689061376-CN5u?utm_source=share&utm_medium=member_desktop&rcm=ACoAABqPb3sBQMB85qi1NJk8roTXHVauBU5tTcE",
      ] as const,
    },
    {
      company: "Forcepoint",
      homepage: "www.forcepoint.com",
      insight: {
        title: "Competitor Opportunities from Weaknesses",
        summary:
          "Based on available data, Forcepoint faces challenges including complex setup, non-intuitive UI, higher pricing for SMBs, and inconsistent support. These identified weaknesses provide direct opportunities for competitors.",
        proposedActions: [
          {
            content:
              "Simplify your product's user interface and onboarding process to attract customers seeking ease of use.",
            value: 9,
            effort: 8,
          },
          {
            content:
              "Develop pricing models that are more accessible and cost-effective for small to medium-sized businesses.",
            value: 9,
            effort: 7,
          },
          {
            content:
              "Invest in providing superior, consistent customer support to build trust and address a key competitor weakness.",
            value: 8,
            effort: 6,
          },
        ],
      },
      impact: "high" as Impact,
      links: [
        "https://www.strac.io/proofpoint-vs-forcepoint",
        "https://www.nightfall.ai/compare/nightfall-vs-forcepoint",
        "https://www.peerspot.com/products/forcepoint-secure-web-gateway-pros-and-cons",
      ] as const,
    },
  ],
};
