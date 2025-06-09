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

export const data: IResponse = {
  aiInsights: [
    {
      company: "Asperii",
      homepage: "https://www.asperii.com",
      insight: {
        title: "Salesforce AI Agent Conference Sponsorship",
        summary:
          "Asperii is actively participating in major Salesforce events such as the Agentforce World Tour in Tel Aviv and London, showcasing their expertise in Field Service, Service Cloud, Health Cloud, MuleSoft, and AgentForce solutions. They also use networking and after-event gatherings to deepen client and partner relationships.",
        proposedActions: [
          {
            content:
              "Attend or monitor Asperii's participation in Salesforce global tours to stay updated on their solution offerings and innovations.",
            value: 7,
            effort: 3,
          },
          {
            content:
              "Evaluate and adopt complementary technologies in Field Service and AgentForce to enhance your Salesforce practice.",
            value: 7,
            effort: 6,
          },
          {
            content:
              "Organize client-facing events around major Salesforce conferences to build brand and customer engagement.",
            value: 5,
            effort: 4,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/asperii_asperii-salesforceworldtour-london2025-activity-7334553086817894400-ZmN6",
        "https://www.linkedin.com/posts/asperii_%D7%90%D7%AA%D7%9D-%D7%9C%D7%90-%D7%9E%D7%97%D7%9E%D7%99%D7%A6%D7%99%D7%9D-%D7%90%D7%AA-%D7%96%D7%94-%D7%A0%D7%9B%D7%95%D7%9F-%D7%9B%D7%A0%D7%A1-%D7%94-ai-%D7%A9%D7%9C-activity-7330482413124337664-eWFH",
        "https://www.linkedin.com/posts/asperii_%D7%A9%D7%A0%D7%9E%D7%A9%D7%99%D7%9A-%D7%9C%D7%91%D7%A0%D7%95%D7%AA-%D7%90%D7%AA-%D7%94%D7%91%D7%99%D7%AA-%D7%A9%D7%9C%D7%A0%D7%95-%D7%A9%D7%A0%D7%9E%D7%A9%D7%99%D7%9A-%D7%9C%D7%A6%D7%9E%D7%95%D7%97-activity-7323390703273697281-nqbr",
      ],
    },
    {
      company: "Elad Software Systems",
      homepage: "https://eladsoft.com",
      insight: {
        title: "Salesforce AI Agent Conference Sponsorship",
        summary:
          "Elad Software Systems is sponsoring and speaking at the Agentforce World Tour 2025, a Salesforce annual conference highlighting autonomous AI agents transforming service, sales and marketing workflows.",
        proposedActions: [
          {
            content:
              "Monitor Elad’s presentations and materials from the Agentforce World Tour to identify emerging AI agent use cases.",
            value: 7,
            effort: 3,
          },
          {
            content:
              "Attend similar Salesforce or AI-focused events to benchmark your own AI roadmap against leading practices.",
            value: 6,
            effort: 4,
          },
          {
            content:
              "Develop an autonomous AI agent feature for your platform, marketing it around proactive task execution and continuous improvement.",
            value: 9,
            effort: 8,
          },
        ],
      },
      impact: "high",
      links: [
        "https://www.linkedin.com/posts/elad-systems_%D7%90%D7%A1%D7%98%D7%A8%D7%98%D7%92%D7%99%D7%94-%D7%98%D7%9B%D7%A0%D7%95%D7%9C%D7%95%D7%92%D7%99%D7%AA-%D7%A4%D7%95%D7%92%D7%A9%D7%AA-%D7%A4%D7%A8%D7%A7%D7%98%D7%99%D7%A7%D7%94-%D7%91%D7%A9%D7%98%D7%97-%D7%91-agentforce-activity-7336312623644180482-KD3R?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAAFt9d-ABZJsvoISfvSh1A6iTFRaqKszi6vY",
      ],
    },
    {
      company: "Elad Software Systems",
      homepage: "https://eladsoft.com",
      insight: {
        title: "Agentic AI Campaign – Social Push for Autonomous Tech",
        summary:
          "Elad Software Systems launched a campaign on Facebook and Instagram promoting their vision of 'Agentic AI' – smart autonomous agents that act proactively across service, marketing, and sales. In a new Ynet article, company leaders describe how this next-gen AI transforms real business touchpoints, from online stores to service centers.",
        proposedActions: [
          {
            content:
              "Use Elad’s messaging as a reference to shape your own AI communication — focusing on proactive, goal-driven features that customers can relate to.",
            value: 7,
            effort: 3,
          },
          {
            content:
              "Track engagement and feedback on Elad's campaign to gauge how local markets respond to autonomous AI messaging.",
            value: 6,
            effort: 4,
          },
          {
            content:
              "Develop a social media mini-series or ad concept around real use cases of AI agents improving customer experience, inspired by Elad’s storytelling style.",
            value: 8,
            effort: 5,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.ynet.co.il/economy/article/sklqppiakg",
        "https://www.facebook.com/photo/?fbid=1218751043325208&set=a.464634349877758",
      ],
      // campaign: {
      //   platforms: ["Facebook", "Instagram"],
      //   country: "Israel",
      //   image_url:
      //     "https://scontent-atl3-2.xx.fbcdn.net/v/t39.35426-6/503813860_1218751043325208_4734092279442494411_n.jpg",
      // },
    },
    {
      company: "Elad Software Systems",
      homepage: "https://eladsoft.com",
      insight: {
        title: "Nonprofit AI Solutions",
        summary:
          "Elad hosted a conference showcasing its Agentforce AI platform tailored for nonprofit organizations, demonstrating Marketing Cloud integrations and real-world impact in crisis management and strategic planning.",
        proposedActions: [
          {
            content:
              "Research AI use cases in the nonprofit sector to develop or partner on specialized solutions.",
            value: 7,
            effort: 5,
          },
          {
            content:
              "Engage leading nonprofits for pilot programs to refine AI features around donation management, volunteer coordination, and impact reporting.",
            value: 8,
            effort: 7,
          },
          {
            content:
              "Launch a targeted marketing campaign highlighting AI benefits for nonprofits, citing Elad’s case studies as proof points.",
            value: 6,
            effort: 4,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/elad-systems_%D7%A4%D7%AA%D7%A8%D7%95%D7%A0%D7%95%D7%AA-ai-%D7%9C%D7%A2%D7%95%D7%9C%D7%9D-%D7%94%D7%A2%D7%9E%D7%95%D7%AA%D7%95%D7%AA-%D7%A2%D7%95%D7%A9%D7%99%D7%9D-%D7%98%D7%95%D7%91-%D7%91%D7%93%D7%A8%D7%9A-activity-7335599631487098880-21Yd?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAAFt9d-ABZJsvoISfvSh1A6iTFRaqKszi6vY",
      ],
    },
    {
      company: "Elad Software Systems",
      homepage: "https://eladsoft.com",
      insight: {
        title: "Snowflake Partnership Debut",
        summary:
          "Elad announced its first official strategic partnership with Snowflake at the Data for Breakfast conference, enhancing its cloud data analytics capabilities to unify sources, build advanced models, and deliver real-time insights.",
        proposedActions: [
          {
            content:
              "Evaluate integration with Snowflake or similar cloud data platforms to expand your analytics offerings.",
            value: 7,
            effort: 5,
          },
          {
            content:
              "Form alliances with leading data platform providers to access best-in-class tooling and co-market solutions.",
            value: 8,
            effort: 7,
          },
          {
            content:
              "Conduct internal training on cloud data warehousing and real-time BI to accelerate adoption and client readiness.",
            value: 6,
            effort: 4,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/elad-systems_%D7%91%D7%95%D7%A7%D7%A8-%D7%A9%D7%9C-%D7%A9%D7%95%D7%AA%D7%A4%D7%95%D7%AA-%D7%91%D7%9B%D7%A0%D7%A1-data-for-breakfast-%D7%A9%D7%9C-activity-7325774981542436865--KPu?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAAFt9d-ABZJsvoISfvSh1A6iTFRaqKszi6vY",
      ],
    },
    {
      company: "Elad Software Systems",
      homepage: "https://eladsoft.com",
      insight: {
        title: "Public Sector Crisis Tech",
        summary:
          "Elad, alongside Salesforce and municipal clients, developed an emergency management system that synchronizes and reports data across rescue and relief agencies, improving decision-making during infrastructure failures, mass events, and security crises.",
        proposedActions: [
          {
            content:
              "Develop or partner on digital emergency response platforms with data synchronization and real-time dashboards.",
            value: 9,
            effort: 8,
          },
          {
            content:
              "Collaborate with public sector bodies to pilot crisis management solutions and gather operational feedback.",
            value: 7,
            effort: 6,
          },
          {
            content:
              "Showcase crisis readiness technology in government forums to build credibility and drive adoption.",
            value: 6,
            effort: 4,
          },
        ],
      },
      impact: "high",
      links: [
        "https://www.linkedin.com/posts/elad-systems_%D7%90%D7%99%D7%9A-%D7%9E%D7%AA%D7%9B%D7%95%D7%A0%D7%A0%D7%99%D7%9D-%D7%9B%D7%91%D7%A8-%D7%94%D7%99%D7%95%D7%9D-%D7%9C%D7%90%D7%AA%D7%92%D7%A8%D7%99%D7%9D-%D7%A4%D7%AA%D7%90%D7%95%D7%9E%D7%99%D7%99%D7%9D-%D7%A9%D7%94%D7%A2%D7%AA%D7%99%D7%93-activity-7330929321508868098-sMPK?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAAFt9d-ABZJsvoISfvSh1A6iTFRaqKszi6vY",
      ],
    },
    {
      company: "Elad Software Systems",
      homepage: "https://eladsoft.com",
      insight: {
        title: "Veterans Data Training Program",
        summary:
          "Elad launched a six-month data course in partnership with the Lohamim LeHightech program, integrating military veterans into real projects and facilitating post-course placement at Elad or client organizations, combining social impact with talent development.",
        proposedActions: [
          {
            content:
              "Partner with veteran transition programs to create practical tech training courses and tap into a motivated talent pool.",
            value: 7,
            effort: 5,
          },
          {
            content:
              "Promote veteran-focused training initiatives in your employer branding to enhance CSR and recruitment pipelines.",
            value: 6,
            effort: 4,
          },
          {
            content:
              "Offer project-based internships during training to accelerate skill acquisition and improve placement rates.",
            value: 8,
            effort: 6,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/elad-systems_%D7%9E%D7%9E%D7%99%D7%9C%D7%95%D7%90%D7%99%D7%9D-%D7%9C%D7%94%D7%99%D7%99%D7%98%D7%A7-%D7%A7%D7%95%D7%A8%D7%A1-%D7%93%D7%90%D7%98%D7%94-%D7%97%D7%93%D7%A9-%D7%A9%D7%9E%D7%A9%D7%9C%D7%91-%D7%9C%D7%95%D7%97%D7%9E%D7%99%D7%9D-activity-7325545364583804929-wH7f?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAAFt9d-ABZJsvoISfvSh1A6iTFRaqKszi6vY",
      ],
    },
    {
      company: "iCloudius - Cloud IT Solutions",
      homepage: "https://www.icloudius.com",
      insight: {
        title: "NetSuite & Sales Tax Webinar",
        summary:
          "iCloudius is hosting a special session with Avalara for NetSuite users to showcase best practices and automation tools for sales tax management, addressing complexities like digital goods taxation and nexus laws, emphasizing the shift from manual to automated tax processes.",
        proposedActions: [
          {
            content:
              "Attend or monitor this webinar to understand how sales tax automation can benefit your operations.",
            value: 7,
            effort: 3,
          },
          {
            content:
              "Evaluate integrating Avalara or similar sales tax automation within your ERP or finance systems to reduce compliance risks.",
            value: 8,
            effort: 6,
          },
          {
            content:
              "Develop educational content or campaigns focusing on simplifying complex sales tax regulations to attract finance clients.",
            value: 6,
            effort: 4,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/cloudius_tax-salestax-taxsoftware-activity-7335963948740968449-gVOd",
      ],
    },
    {
      company: "iCloudius - Cloud IT Solutions",
      homepage: "https://www.icloudius.com",
      insight: {
        title: "Partnership with Nilus for AI Treasury",
        summary:
          "iCloudius announced a partnership with Nilus, an agentic AI platform providing real-time cash visibility, AI forecasting, and liquidity optimization integrated natively with NetSuite, enhancing ERP's treasury capabilities for finance teams.",
        proposedActions: [
          {
            content:
              "Explore adopting AI-powered treasury solutions to provide smarter cash flow forecasts and liquidity management.",
            value: 8,
            effort: 6,
          },
          {
            content:
              "Partner with innovative AI platforms like Nilus to enhance your finance service offerings.",
            value: 7,
            effort: 7,
          },
          {
            content:
              "Promote integrated AI-enhanced treasury solutions to NetSuite users and finance departments to increase market share.",
            value: 6,
            effort: 5,
          },
        ],
      },
      impact: "high",
      links: [
        "https://www.linkedin.com/posts/cloudius_fintech-treasuryops-erp-activity-7333436253733842945-WkJ4",
      ],
    },
    {
      company: "iCloudius - Cloud IT Solutions",
      homepage: "https://www.icloudius.com",
      insight: {
        title: "Salesforce Agentforce World Tour Presence",
        summary:
          "iCloudius is exhibiting and presenting at the upcoming Salesforce Agentforce World Tour Tel Aviv event, showcasing CRM solutions tailored for growing businesses with a session on Deep Fake detection using AI.",
        proposedActions: [
          {
            content:
              "Attend the Salesforce Agentforce event to network and gather insights on AI in CRM from iCloudius and other leaders.",
            value: 6,
            effort: 3,
          },
          {
            content:
              "Develop or enhance CRM AI capabilities, including AI-powered security features like deep fake detection, to stay competitive.",
            value: 8,
            effort: 7,
          },
          {
            content:
              "Collaborate with Salesforce-based platforms and build targeted marketing to leverage event participation and partnerships.",
            value: 7,
            effort: 5,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/cloudius_%D7%94%D7%9B%D7%A0%D7%A1-%D7%94%D7%A9%D7%A0%D7%AA%D7%99-%D7%A9%D7%9C-salesforce-agentforce-world-activity-7330910605349941249-4lDf",
      ],
    },
    {
      company: "iCloudius - Cloud IT Solutions",
      homepage: "https://www.icloudius.com",
      insight: {
        title: "Expanding ERP Customer Analytics",
        summary:
          "iCloudius promotes leveraging Oracle NetSuite and NetSuite Analytics Warehouse for improved customer satisfaction via real-time dashboards, quarterly business reviews, and transparency for strategic B2B clients, enhancing decision making.",
        proposedActions: [
          {
            content:
              "Implement or enhance real-time performance dashboards for key clients to boost engagement and decision speed.",
            value: 7,
            effort: 5,
          },
          {
            content:
              "Use data analytics platforms like NetSuite Analytics Warehouse to support regular business review meetings with clients.",
            value: 8,
            effort: 6,
          },
          {
            content:
              "Market value-added data transparency tools to attract and retain strategic customers in B2B segments.",
            value: 6,
            effort: 4,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/cloudius_netsuite-netsuitedevelopment-erp-activity-7328354512698494976-m3Kd",
      ],
    },
    {
      company: "iCloudius - Cloud IT Solutions",
      homepage: "https://www.icloudius.com",
      insight: {
        title: "Hiring Sales and Cloud Experts",
        summary:
          "iCloudius is actively recruiting for various roles including Professional Services Sales Executive and Cloud Computing Experts focused on Salesforce, HubSpot, Zendesk, and NetSuite platforms, highlighting growth and specialization in cloud business applications.",
        proposedActions: [
          {
            content:
              "Monitor iCloudius hiring trends to anticipate their expansion and skill focus areas.",
            value: 6,
            effort: 2,
          },
          {
            content:
              "Strengthen your own recruiting and training efforts in SaaS and cloud platforms to stay competitive.",
            value: 7,
            effort: 6,
          },
          {
            content:
              "Build specialized cloud teams capable of implementing robust SaaS solutions, including Salesforce and NetSuite integration.",
            value: 9,
            effort: 9,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/cloudius_jobs-wearehiring-salesforce-activity-7325829230108262400-Bk9z",
      ],
    },
    {
      company: "Asperii",
      homepage: "https://www.asperii.com",
      insight: {
        title: "Healthcare AI & Field Service Focus",
        summary:
          "Asperii is actively highlighting its expertise in digital transformation for the healthcare sector, emphasizing customer relationship management under stringent regulation and distributed staff management. They are featuring real-world success stories with leading healthcare clients like Danel Group at the upcoming Salesforce Agentforce World Tour 2025 in Tel Aviv.",
        proposedActions: [
          {
            content:
              "Engage healthcare clients by developing tailored AI and CRM solutions that adapt to complex regulations and decentralized teams.",
            value: 8,
            effort: 6,
          },
          {
            content:
              "Participate in or monitor Salesforce Agentforce events to understand client success cases and innovative healthcare workflows.",
            value: 7,
            effort: 4,
          },
          {
            content:
              "Build marketing campaigns featuring case studies from healthcare digitalization projects to strengthen domain credibility.",
            value: 6,
            effort: 4,
          },
        ],
      },
      impact: "high",
      links: [
        "https://www.linkedin.com/posts/asperii_%D7%91%D7%A2%D7%95%D7%9C%D7%9E%D7%95%D7%AA-%D7%94%D7%91%D7%A8%D7%99%D7%90%D7%95%D7%AA-%D7%90%D7%99%D7%9F-%D7%A2%D7%A8%D7%9A-%D7%97%D7%A9%D7%95%D7%91-%D7%99%D7%95%D7%AA%D7%A8-%D7%9E%D7%94%D7%98%D7%99%D7%A4%D7%95%D7%9C-activity-7336036529514917889-uUFz",
      ],
    },
    {
      company: "Asperii",
      homepage: "https://www.asperii.com",
      insight: {
        title: "Focused Salesforce Consultant Hiring",
        summary:
          "Asperii recently hired a new Salesforce Consultant, indicating expansion and investment in Salesforce-related capabilities. Combined with their active participation in Salesforce events, this suggests a growth strategy centered on Salesforce service delivery and expertise.",
        proposedActions: [
          {
            content:
              "Monitor Asperii’s consultant hiring trends to evaluate their growing Salesforce channel capabilities.",
            value: 6,
            effort: 2,
          },
          {
            content:
              "Invest in developing or hiring Salesforce-focused consultants to remain competitive and meet client demand.",
            value: 8,
            effort: 7,
          },
          {
            content:
              "Explore Salesforce specialization certifications to broaden your team's skillset and attract Salesforce clients.",
            value: 7,
            effort: 5,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/asperii_welcomeyael-merhavi-our-new-salesforce-activity-7332283279502417920-0Qgr",
      ],
    },
    {
      company: "Asperii",
      homepage: "https://www.asperii.com",
      insight: {
        title: "Recognition in IT Consulting Sector",
        summary:
          "Asperii is recognized in the 2025 rankings as a leading cloud consulting and system integrator company with presence in New York, London, and expertise in Salesforce and AWS. They focus on enabling superior business results with cloud, data, CRM and AI solutions.",
        proposedActions: [
          {
            content:
              "Review Asperii’s cloud and AI service models to benchmark your offerings and identify areas for enhancement.",
            value: 7,
            effort: 5,
          },
          {
            content:
              "Leverage recognition in industry rankings to position your own brand and build trust with prospective clients.",
            value: 6,
            effort: 4,
          },
          {
            content:
              "Expand global footprint or partnerships to emulate Asperii’s presence in multinational markets.",
            value: 8,
            effort: 9,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://clutch.co/il/it-services",
        "https://appexchange.salesforce.com/appxListingDetail?listingId=a0N3A00000DvPOAUA3",
      ],
    },
    {
      company: "Top Vision",
      homepage: "https://netsuite.top-vision.co.il/",
      insight: {
        title: "BlueSnap Partnership for Payments",
        summary:
          "Top Vision partnered with BlueSnap to deliver an enhanced, unified global payments experience integrated into NetSuite for Israeli businesses, offering real-time payment data sync, multi-currency support, and actionable reporting.",
        proposedActions: [
          {
            content:
              "Analyze Top Vision's BlueSnap integration to improve your own payment process automation and user experience.",
            value: 7,
            effort: 4,
          },
          {
            content:
              "Consider similar partnerships or implement global payment platforms with real-time ERP integration.",
            value: 8,
            effort: 6,
          },
          {
            content:
              "Develop targeted marketing campaigns highlighting seamless payment experiences to attract NetSuite users.",
            value: 6,
            effort: 3,
          },
        ],
      },
      impact: "high",
      links: [
        "https://www.linkedin.com/posts/bluesnap_%D7%A9%D7%99%D7%AA%D7%95%D7%A3-%D7%A4%D7%A2%D7%95%D7%9C%D7%94-%D7%97%D7%93%D7%A9-%D7%91%D7%93%D7%A8%D7%9A-%D7%9C%D7%99%D7%99%D7%A2%D7%95%D7%9C-%D7%97%D7%95%D7%95%D7%99%D7%99%D7%AA-%D7%94%D7%AA%D7%A9%D7%9C%D7%95%D7%9E%D7%99%D7%9D-activity-7336287413738070018-6fZh",
        "https://www.linkedin.com/posts/top-vision-fusion-oracle_%D7%A9%D7%99%D7%AA%D7%95%D7%A3-%D7%A4%D7%A2%D7%95%D7%9C%D7%94-%D7%97%D7%93%D7%A9-%D7%91%D7%93%D7%A8%D7%9A-%D7%9C%D7%99%D7%99%D7%A2%D7%95%D7%9C-%D7%97%D7%95%D7%95%D7%99%D7%99%D7%AA-%D7%94%D7%AA%D7%A9%D7%9C%D7%95%D7%9E%D7%99%D7%9D-activity-7333411530991939585-FAQ5",
      ],
    },
    {
      company: "Top Vision",
      homepage: "https://netsuite.top-vision.co.il/",
      insight: {
        title: "Comprehensive Oracle & NetSuite Services",
        summary:
          "Top Vision is a leading Oracle partner in Israel, specializing in the implementation and integration of key organizational systems including Oracle Fusion Cloud, HCM, EPM, ERP, and NetSuite ERP products, with over 20 years of experience supporting major companies.",
        proposedActions: [
          {
            content:
              "Build expertise in advanced Oracle and NetSuite solutions, particularly in financial and logistics domains.",
            value: 8,
            effort: 7,
          },
          {
            content:
              "Leverage Top Vision’s experience to optimize your own ERP implementation strategies and customer success.",
            value: 7,
            effort: 5,
          },
          {
            content:
              "Explore regional and global partnership networks to enhance solution localization and client support.",
            value: 6,
            effort: 6,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://top-group.co.il/en/group-companies/",
        "https://www.top-vision.co.il/top-vision-en/",
        "https://netsuite.top-vision.co.il/about/?lang=en",
      ],
    },
    {
      company: "Top Vision",
      homepage: "https://netsuite.top-vision.co.il/",
      insight: {
        title: "Finance Event Leadership",
        summary:
          "Top Vision hosted a ‘Finance Forward’ event with Oracle for CFOs and finance leaders in Israel, focusing on adapting to new regulations like IFRS 18, adopting digital financial tools, and enabling accurate, insight-driven financial management.",
        proposedActions: [
          {
            content:
              "Attend or track Top Vision's finance-focused events to stay current on regulatory changes and advanced financial technologies.",
            value: 7,
            effort: 4,
          },
          {
            content:
              "Collaborate with Oracle and finance leaders to co-host events and workshops on cutting-edge financial solutions.",
            value: 8,
            effort: 6,
          },
          {
            content:
              "Create educational materials about IFRS 18 and digital finance transformation to attract and inform finance professionals.",
            value: 6,
            effort: 4,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/top-vision-fusion-oracle_%D7%AA%D7%95%D7%93%D7%94-%D7%A9%D7%94%D7%A6%D7%98%D7%A8%D7%A4%D7%AA%D7%9D-%D7%90%D7%9C%D7%99%D7%A0%D7%95-%D7%90%D7%99%D7%A8%D7%95%D7%A2-finance-forward-activity-7329834314076975104-Je3o",
      ],
    },
    {
      company: "ONE Technologies",
      homepage: "https://www.one1.co.il",
      insight: {
        title: "Cloud-Based Identity Management Deployment",
        summary:
          "ONE Technologies recently completed an intensive four-month deployment of a cloud-based Identity and Access Management (IDM) system by SailPoint, enhancing security for client Tadhar. The IDM system offers precise lifecycle management of users and authorizations aligned with current and future regulations, improving organizational cybersecurity posture.",
        proposedActions: [
          {
            content:
              "Monitor cloud IDM deployment trends to evaluate opportunities for secure cloud identity solutions.",
            value: 7,
            effort: 3,
          },
          {
            content:
              "Develop or partner to offer cloud-based identity and access management solutions targeting regulated industries.",
            value: 8,
            effort: 7,
          },
          {
            content:
              "Educate clients on cybersecurity risks stemming from manual or misconfigured access control and promote automated IDM adoption.",
            value: 6,
            effort: 4,
          },
        ],
      },
      impact: "high",
      links: [
        "https://bit.ly/3HpK7Bn",
        "https://www.linkedin.com/posts/one1_%D7%94%D7%96%D7%94%D7%95%D7%99%D7%95%D7%AA-%D7%91%D7%99%D7%93%D7%99%D7%99%D7%9D-%D7%91%D7%98%D7%95%D7%97%D7%95%D7%AA-go-%D7%9E%D7%A2%D7%A8%D7%9B%D7%AA-%D7%A0%D7%99%D7%94%D7%95%D7%9C-%D7%96%D7%94%D7%95%D7%99%D7%95%D7%AA-activity-7336396100506955776-TNzi?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAAFuKFEcBd7ADVcIQtZVwy38TbtHpi94wioM",
      ],
    },
    {
      company: "ONE Technologies",
      homepage: "https://www.one1.co.il",
      insight: {
        title: "ServiceNow Partner of the Year Award",
        summary:
          "ONE Technologies’ ServiceNow division won the 2025 'Partner of the Year' award in consulting and implementation for the EMEA region, reflecting their commitment to delivering innovative, results-driven digital transformation solutions and deep expertise in ServiceNow platform deployment.",
        proposedActions: [
          {
            content:
              "Track ONE's progress and methodologies in ServiceNow implementations to learn best practices for digital transformation projects.",
            value: 7,
            effort: 4,
          },
          {
            content:
              "Invest in ServiceNow skills and certifications to build a competitive edge in the EMEA market.",
            value: 9,
            effort: 7,
          },
          {
            content:
              "Develop case studies around digital transformation Hubs built with ServiceNow to showcase capabilities to enterprise clients.",
            value: 6,
            effort: 5,
          },
        ],
      },
      impact: "high",
      links: [
        "https://lnkd.in/d-yPqTys",
        "https://www.linkedin.com/posts/one1_%D7%97%D7%98%D7%99%D7%91%D7%AA-%D7%94-servicenow-%D7%A9%D7%9C%D7%A0%D7%95-%D7%96%D7%9B%D7%AA%D7%94-%D7%91%D7%A4%D7%A8%D7%A1-%D7%A9%D7%95%D7%AA%D7%A3-%D7%94%D7%A9%D7%A0%D7%94-activity-7327686290475208704-O3Ov?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAAFuKFEcBd7ADVcIQtZVwy38TbtHpi94wioM",
      ],
    },
    {
      company: "ONE Technologies",
      homepage: "https://www.one1.co.il",
      insight: {
        title: "Innovative AI Development Approaches",
        summary:
          "At the Data TLV 2025 conference, ONE Technologies demonstrated their 'ONE Success' approach to AI solution deployment, highlighting their capability to deliver both quick, efficient AI features and complex, integrated AI systems tailored to diverse business challenges.",
        proposedActions: [
          {
            content:
              "Assess and incorporate agile AI development frameworks similar to ONE Technologies to balance speed and complexity in AI projects.",
            value: 8,
            effort: 6,
          },
          {
            content:
              "Invest in building teams capable of delivering end-to-end AI solutions that scale with evolving business needs.",
            value: 9,
            effort: 8,
          },
          {
            content:
              "Leverage case studies from ONE’s AI deployments for sales and marketing to demonstrate AI maturity to prospects.",
            value: 7,
            effort: 4,
          },
        ],
      },
      impact: "high",
      links: [
        "https://www.linkedin.com/posts/one1_%D7%A9%D7%AA%D7%99-%D7%92%D7%99%D7%A9%D7%95%D7%AA-%D7%A4%D7%99%D7%AA%D7%95%D7%97-%D7%A9%D7%91%D7%95%D7%A0%D7%95%D7%AA-one-success-%D7%9B%D7%A0%D7%A1-activity-7331194610683154432-HSdV?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAAFuKFEcBd7ADVcIQtZVwy38TbtHpi94wioM",
      ],
    },
    {
      company: "ONE Technologies",
      homepage: "https://www.one1.co.il",
      insight: {
        title: "Social Impact Initiative for Haredi Veterans",
        summary:
          "ONE Technologies is actively promoting the social initiative 'Businesses for Haredim Joining the Army,' supporting integration of Haredi army recruits into the workforce with employment opportunities and tailored work environments after service.",
        proposedActions: [
          {
            content:
              "Engage in or support workforce inclusion programs targeting minority communities to enhance social responsibility and access diverse talent.",
            value: 6,
            effort: 4,
          },
          {
            content:
              "Use social initiatives as a brand differentiator and corporate social responsibility showcase.",
            value: 5,
            effort: 3,
          },
          {
            content:
              "Develop specialized on-boarding and career support programs for minority groups to build long-term workforce engagement.",
            value: 7,
            effort: 6,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://jobforsure.co.il/",
        "https://www.linkedin.com/posts/one1_%D7%90%D7%A0%D7%95-%D7%92%D7%90%D7%99%D7%9D-%D7%95%D7%A0%D7%97%D7%95%D7%A9%D7%99%D7%9D-%D7%9C%D7%A7%D7%93%D7%9D-%D7%90%D7%AA-%D7%9E%D7%99%D7%96%D7%9D-%D7%A2%D7%A1%D7%A7%D7%99%D7%9D-%D7%9C%D7%9E%D7%A2%D7%9F-activity-7330539917061582849-1c4Z?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAAFuKFEcBd7ADVcIQtZVwy38TbtHpi94wioM",
      ],
    },
  ],
};
