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
      company: "Elad Software Systems",
      homepage: "https://eladsoft.com",
      insight: {
        title: "Aggressive AI Healthcare Expansion",
        summary:
          "Elad is rapidly promoting new AI tools for hospitals—showcasing workflow-automation projects at Israel’s Digital Health Conference (Jun 26 2025) and unveiling an anesthesiology assistant with Ichilov at AWS events—signaling a strategic push to dominate healthcare AI.",
        proposedActions: [
          {
            content:
              "Audit your healthcare accounts to spot 2–3 quick AI workflow wins and launch pilot automations before Q4.",
            value: 6,
            effort: 3,
          },
          {
            content:
              "Publish a results-focused case study on your existing clinical-AI deployment to counter Elad’s publicity and boost credibility.",
            value: 7,
            effort: 4,
          },
          {
            content:
              "Co-host a webinar with a leading hospital IT director within 30 days to attract the same audience Elad is targeting.",
            value: 8,
            effort: 5,
          },
        ],
      },
      impact: "high",
      links: [
        "https://www.linkedin.com/posts/elad-systems_%D7%95%D7%A2%D7%99%D7%93%D7%AA-digital-health-%D7%94%D7%91%D7%9E%D7%94-%D7%9C%D7%A4%D7%AA%D7%A8%D7%95%D7%A0%D7%95%D7%AA-%D7%94-ai-activity-7343920985231757313-YO2T",
        "https://www.linkedin.com/posts/elad-systems_%D7%9B%D7%9C%D7%99-%D7%94-ai-%D7%9E%D7%92%D7%99%D7%A2%D7%99%D7%9D-%D7%9C%D7%97%D7%93%D7%A8%D7%99-%D7%94%D7%A0%D7%99%D7%AA%D7%95%D7%97-%D7%A9%D7%9C-%D7%90%D7%99%D7%9B%D7%99%D7%9C%D7%95%D7%91-activity-7342875587050418176-hSQp",
      ],
    },
    {
      company: "Elad Software Systems",
      homepage: "https://eladsoft.com",
      insight: {
        title: "Web Traffic Decline Opportunity",
        summary:
          "SimilarWeb (scraped Jun 26 2025) shows eladsoft.com traffic dropped 17.3% month-on-month, relies almost entirely on Israeli organic searches and LinkedIn referrals—revealing limited ongoing SEO or paid-media investment.",
        proposedActions: [
          {
            content:
              "Bid on Hebrew and English PPC terms such as “פתרונות AI בריאות” and “AI healthcare Israel” to capture search demand Elad is missing.",
            value: 5,
            effort: 2,
          },
          {
            content:
              "Publish an SEO-optimised blog series on healthcare-AI ROI to outrank Elad on core industry keywords within 60 days.",
            value: 6,
            effort: 4,
          },
          {
            content:
              "Launch LinkedIn retargeting ads aimed at Israeli tech decision-makers aged 25-44, promoting your latest healthcare-AI case study.",
            value: 7,
            effort: 5,
          },
        ],
      },
      impact: "medium",
      links: ["https://similarweb.com/website/eladsoft.com"],
    },
    {
      company: "Elad Software Systems",
      homepage: "https://eladsoft.com",
      insight: {
        title: "IBM watsonx Partnership Move",
        summary:
          "On Jun 12 2025 Elad announced that IBM Israel selected it to deploy watsonx and broader IBM software, indicating a shift toward enterprise AI platform collaborations.",
        proposedActions: [
          {
            content:
              "Engage IBM PartnerWorld to explore co-selling opportunities or gain watsonx certification to match Elad’s new capability.",
            value: 7,
            effort: 6,
          },
          {
            content:
              "Update sales decks to emphasise your vendor-neutral or open-source AI stack as an alternative to IBM-centric solutions.",
            value: 6,
            effort: 3,
          },
          {
            content:
              "Monitor public tenders mentioning watsonx and enter early to position against forthcoming Elad-IBM bids.",
            value: 5,
            effort: 4,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/elad-systems_%D7%A9%D7%99%D7%AA%D7%95%D7%A3-%D7%A4%D7%A2%D7%95%D7%9C%D7%94-%D7%97%D7%93%D7%A9-ibm-%D7%99%D7%A9%D7%A8%D7%90%D7%9C-%D7%91%D7%97%D7%A8%D7%94-%D7%91%D7%90%D7%9C%D7%A2%D7%93-%D7%9E%D7%A2%D7%A8%D7%9B%D7%95%D7%AA-activity-7338818251293966337-K97w",
      ],
    },
    {
      company: "Elad Software Systems",
      homepage: "https://eladsoft.com",
      insight: {
        title: "CRM Talent Ramp-Up",
        summary:
          "Elad has opened at least 10 new CRM roles—ranging from Junior/Senior Dynamics 365 and Salesforce developers to QA, implementers and project managers—across central Israel, indicating a major capacity expansion of its Salesforce/Dynamics practices.",
        proposedActions: [
          {
            content:
              "Fast-track a graduate training program (4–6 weeks) to secure junior CRM talent before Elad pulls them from the market.",
            value: 6,
            effort: 4,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://careers.eladsoft.com/%D7%9B%D7%9C-%D7%94%D7%9E%D7%A9%D7%A8%D7%95%D7%AA-crm/",
        "https://careers.eladsoft.com/jobs/1003957/",
      ],
    },
    {
      company: "iCloudius",
      homepage: "https://icloudius.com",
      insight: {
        title: "AI Cash-Management Tie-Up",
        summary:
          "iCloudius has partnered with Nilus to embed AI-driven cash-management and treasury forecasting into NetSuite projects, positioning itself as a one-stop finance-transformation partner for mid-market firms.",
        proposedActions: [
          {
            content:
              "Publish a comparison white-paper showing how your own treasury tools outperform the Nilus + NetSuite bundle on forecasting accuracy and implementation cost.",
            value: 8,
            effort: 5,
          },
          {
            content:
              "Offer a limited-time discount to finance teams migrating from spreadsheets to your solution in Q3 2025 to capture prospects attracted by the new partnership buzz.",
            value: 6,
            effort: 4,
          },
          {
            content:
              "Set up SimilarWeb and LinkedIn keyword alerts inside Loomii for future partnership announcements to react faster than competitors.",
            value: 3,
            effort: 2,
          },
        ],
      },
      impact: "high",
      links: [
        "https://www.linkedin.com/posts/cloudius_fintech-treasuryops-erp-activity-7333436253733842945-WkJ4",
      ],
    },
    {
      company: "iCloudius",
      homepage: "https://icloudius.com",
      insight: {
        title: "Tax-Automation Webinar Drive",
        summary:
          "On June 23, 2025, a joint iCloudius–Avalara webinar series targeted NetSuite users with messaging around automating complex U.S. sales-tax compliance, signaling an active lead-generation campaign in tax-automation services.",
        proposedActions: [
          {
            content:
              "Host a counter-webinar with a tax attorney to highlight gaps in Avalara’s coverage (e.g., EU VAT, digital-services taxes) and position your firm as the holistic compliance partner.",
            value: 7,
            effort: 5,
          },
          {
            content:
              "Run LinkedIn and Google Ads at NetSuite user groups during the webinar week with retargeting to steal top-of-funnel traffic.",
            value: 5,
            effort: 4,
          },
          {
            content:
              "Create a 2-page guide on automated tax compliance for NetSuite and gate it behind an email form to grow your lead list.",
            value: 4,
            effort: 3,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/cloudius_so-next-week-its-going-to-happen-avalara-activity-7341049775070294016-oflz",
      ],
    },
    {
      company: "iCloudius",
      homepage: "https://icloudius.com",
      insight: {
        title: "Push Into Subscription CRM",
        summary:
          "Multiple recent posts spotlight Salesforce Subscription Management and recurring-revenue strategy, showing iCloudius is doubling down on subscription-economy consulting and services.",
        proposedActions: [
          {
            content:
              "Release a client case study quantifying ROI from your own subscription-billing integration versus Salesforce’s tooling to position your offer as higher value.",
            value: 7,
            effort: 4,
          },
          {
            content:
              'Publish an SEO blog series on "subscription management for SMBs" to capture organic traffic before iCloudius’s content gains traction.',
            value: 6,
            effort: 3,
          },
          {
            content:
              "Equip sales reps with a one-page battlecard contrasting your platform with Salesforce Subscription Management on pricing flexibility and time-to-launch.",
            value: 5,
            effort: 2,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/cloudius_salesforce-crm-salesforcepartner-activity-7343578675340029952-ansG",
      ],
    },
    {
      company: "iCloudius",
      homepage: "https://icloudius.com",
      insight: {
        title: "Site Traffic Falls 36%",
        summary:
          "SimilarWeb shows icloudius.com visits dropping 36.5% to only 640 monthly, with 82% of traffic from Israel and negligible organic reach—signalling weakened digital visibility.",
        proposedActions: [
          {
            content:
              'Accelerate blog and backlink campaigns targeting keywords such as "NetSuite partner Israel" to win share while iCloudius’s visibility is low.',
            value: 9,
            effort: 4,
          },
          {
            content:
              "Launch LinkedIn ads in Ireland—iCloudius’s second-largest traffic source—to capture prospects they may be neglecting.",
            value: 6,
            effort: 4,
          },
          {
            content:
              "Integrate SimilarWeb tracking for icloudius.com into Loomii dashboards to continuously monitor their traffic trend and react quickly.",
            value: 3,
            effort: 1,
          },
        ],
      },
      impact: "high",
      links: ["https://similarweb.com/website/icloudius.com"],
    },
    {
      company: "iCloudius",
      homepage: "https://icloudius.com",
      insight: {
        title: "Scaling Sales & Delivery",
        summary:
          "New job ads for a professional-services sales executive and a cloud-computing expert suggest iCloudius is expanding outbound sales and technical capacity to win larger projects.",
        proposedActions: [
          {
            content:
              "Map new iCloudius sales hires on LinkedIn and proactively engage their likely target accounts before relationships solidify.",
            value: 7,
            effort: 5,
          },
          {
            content:
              "Fast-track recruitment of certified Salesforce and NetSuite consultants to avoid capacity gaps if deal flow accelerates industry-wide.",
            value: 6,
            effort: 6,
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
      homepage: "https://asperii.com",
      insight: {
        title: "Hiring for AI Talent",
        summary:
          "On 24 June 2025 Asperii advertised five senior Salesforce roles, signalling rapid growth and a push to deliver more AI-driven projects.",
        proposedActions: [
          {
            content:
              "Monitor Asperii’s job board weekly to spot new skill trends and anticipate service offerings.",
            value: 6,
            effort: 2,
          },
          {
            content:
              "Highlight your own AI case studies on LinkedIn to attract similar talent and clients.",
            value: 5,
            effort: 3,
          },
          {
            content:
              "Launch an employee-referral bonus program to fill matching roles quickly.",
            value: 4,
            effort: 4,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/asperii_%D7%9C%D7%90-%D7%A1%D7%AA%D7%9D-%D7%A7%D7%A8%D7%90%D7%95-%D7%9C%D7%9E%D7%91%D7%A6%D7%A2-%D7%A2%D7%9D-%D7%9B%D7%9C%D7%91%D7%99%D7%90-%D7%92%D7%9D-%D7%91%D7%99%D7%9E%D7%99%D7%9D-%D7%9C%D7%90-activity-7343187004781735937-F3Gb",
      ],
    },
    {
      company: "Asperii",
      homepage: "https://asperii.com",
      insight: {
        title: "Salesforce Partner Award Win",
        summary:
          "At Salesforce’s Agentforce World Tour (posted 12 June 2025) Asperii won the “Sales Elite Partner of the Year” award and showcased high-profile AI customer stories, boosting brand authority.",
        proposedActions: [
          {
            content:
              "Publish fresh client success stories on your website to strengthen credibility with prospects.",
            value: 7,
            effort: 3,
          },
          {
            content:
              "Apply to speak or sponsor the next regional Salesforce event to match Asperii’s visibility.",
            value: 6,
            effort: 5,
          },
          {
            content:
              "Encourage key staff to obtain advanced Salesforce certifications this quarter.",
            value: 5,
            effort: 4,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/asperii_%D7%9B%D7%9B%D7%94-%D7%A0%D7%A8%D7%90%D7%99%D7%AA-%D7%A9%D7%95%D7%AA%D7%A4%D7%95%D7%AA-%D7%91%D7%A2%D7%99%D7%93%D7%9F-%D7%94-ai-%D7%97%D7%95%D7%95%D7%99%D7%99%D7%94-%D7%91%D7%9C%D7%AA%D7%99-activity-7338957340936691712-a97m",
      ],
    },
    {
      company: "Asperii",
      homepage: "https://asperii.com",
      insight: {
        title: "Website Traffic Falling",
        summary:
          "SimilarWeb reports a 37 % drop in visits (to ~1.2 k/month) and high reliance on direct traffic, suggesting limited inbound marketing momentum.",
        proposedActions: [
          {
            content:
              "Publish SEO articles targeting ‘Salesforce field service’ queries to capture organic demand Asperii is missing.",
            value: 6,
            effort: 4,
          },
          {
            content:
              "Run a small paid-search pilot to win traffic while Asperii spends little on ads.",
            value: 4,
            effort: 2,
          },
          {
            content:
              "Add lead magnets (e-book, demo) to reduce bounce and increase pages per visit above Asperii’s 2.3.",
            value: 6,
            effort: 5,
          },
        ],
      },
      impact: "high",
      links: ["https://similarweb.com/website/asperii.com"],
    },
    {
      company: "Top Vision",
      homepage: "https://top-vision.co.il",
      insight: {
        title: "Organic Traffic Down 24%",
        summary:
          "Site visits dropped 23.9 % month-over-month to only 492, with 56 % coming direct and 30 % from organic search. The fall suggests shrinking brand awareness and weaker SEO momentum.",
        proposedActions: [
          {
            content:
              "Publish keyword-rich blog posts and NetSuite/Oracle case studies to revive organic search traffic.",
            value: 7,
            effort: 6,
          },
          {
            content:
              'Improve page titles, meta descriptions and internal links for top Oracle Cloud and "NetSuite ישראל" keywords.',
            value: 5,
            effort: 3,
          },
          {
            content:
              "Launch retargeting ads to recapture bounced visitors and push them toward a demo form.",
            value: 5,
            effort: 4,
          },
        ],
      },
      impact: "high",
      links: ["https://similarweb.com/website/top-vision.co.il"],
    },
    {
      company: "Top Vision",
      homepage: "https://top-vision.co.il",
      insight: {
        title: "BlueSnap Payments Partnership",
        summary:
          "A new alliance with BlueSnap enables unified global payments inside NetSuite for Israeli customers, expanding Top Vision’s fintech footprint and adding cross-border commerce capabilities.",
        proposedActions: [
          {
            content:
              "Add a BlueSnap integration page and case study to the website to attract NetSuite prospects.",
            value: 6,
            effort: 4,
          },
          {
            content:
              "Co-host a webinar with BlueSnap explaining how unified payments accelerate cash flow and reporting.",
            value: 7,
            effort: 5,
          },
          {
            content:
              "Create a bundled pricing offer for NetSuite clients adopting the BlueSnap connector.",
            value: 5,
            effort: 3,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/bluesnap_%D7%A9%D7%99%D7%AA%D7%95%D7%A3-%D7%A4%D7%A2%D7%95%D7%9C%D7%94-%D7%97%D7%93-%D7%A9%D7%91%D7%A8-%D7%93%D7%A8%D7%9A-%D7%9C%D7%99%D7%99%D7%A2%D7%95%D7%9C-%D7%97%D7%95%D7%95%D7%99%D7%99%D7%AA-%D7%94%D7%AA%D7%A9%D7%9C%D7%95%D7%9E%D7%99%D7%9D-activity-7336287413738070018-6fZh",
        "https://www.linkedin.com/posts/top-vision-fusion-oracle_%D7%A9%D7%99%D7%AA%D7%95%D7%A3-%D7%A4%D7%A2%D7%95%D7%9C%D7%94-%D7%97%D7%93%D7%A9-%D7%91%D7%93%D7%A8%D7%9A-%D7%9C%D7%99%D7%99%D7%A2%D7%95%D7%9C-%D7%97%D7%95%D7%95%D7%99%D7%99%D7%AA-%D7%94%D7%AA%D7%A9%D7%9C%D7%95%D7%9E%D7%99%D7%9D-activity-7333411530991939585-FAQ5",
      ],
    },
    {
      company: "Top Vision",
      homepage: "https://top-vision.co.il",
      insight: {
        title: "Oracle FCCS Campaign",
        summary:
          "LinkedIn content highlights Oracle FCCS as the top solution for faster close (3–5 days) and full transparency, signalling an aggressive push to own finance-consolidation projects.",
        proposedActions: [
          {
            content:
              "Build an interactive ROI calculator showing days saved and error reduction when switching to FCCS.",
            value: 8,
            effort: 5,
          },
          {
            content:
              "Pitch an FCCS customer success story to local finance publications for brand authority.",
            value: 6,
            effort: 4,
          },
          {
            content:
              "Offer a limited-time implementation discount for registrants of upcoming CFO events.",
            value: 5,
            effort: 3,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/shimi-ben-baruch-90a80849_fccs-financialclose-cfo-activity-7340716965658812416-KrMb",
      ],
    },
    {
      company: "ONE Technologies",
      homepage: "https://one1.co.il",
      insight: {
        title: "Sharp traffic drop: -15.5%",
        summary:
          "ONE Technologies' website experienced a -15.5% drop in traffic, totaling just 6,147 visits in the last period, with 100% of visits from Israel and no growth among younger or international audiences. Engagement is low (2.17 pages/visit, 60% bounce rate), and traffic is entirely organic with LinkedIn as the sole social source.",
        proposedActions: [
          {
            content:
              "Integrate SimilarWeb data for one1.co.il into Loomii to monitor ongoing traffic and engagement trends.",
            value: 6,
            effort: 2,
          },
          {
            content:
              "Launch a targeted LinkedIn ad campaign to boost traffic and expand beyond the Israeli audience, particularly targeting age 25-44 tech buyers.",
            value: 8,
            effort: 6,
          },
          {
            content:
              "Redesign website to improve user engagement (lower bounce rate, increase pages per visit) with clearer calls to action and mobile optimization.",
            value: 9,
            effort: 7,
          },
        ],
      },
      impact: "high",
      links: ["https://similarweb.com/website/one1.co.il"],
    },
    {
      company: "ONE Technologies",
      homepage: "https://one1.co.il",
      insight: {
        title: "Cyber readiness during war",
        summary:
          "ONE Technologies is actively promoting its cybersecurity readiness and solutions tailored for wartime conditions, emphasizing admin restriction, system segmentation, SOC monitoring, recovery plans, and team preparedness. The company also initiated direct contact channels for incident response.",
        proposedActions: [
          {
            content:
              "Highlight your cyber resilience in LinkedIn posts to reassure current clients and attract prospects in sensitive sectors (e.g. finance, healthcare).",
            value: 6,
            effort: 3,
          },
          {
            content:
              "Bundle emergency cybersecurity audits and BCP services as limited-time offers for Israeli SMBs.",
            value: 7,
            effort: 5,
          },
          {
            content:
              "Develop a downloadable 'Cyber War Readiness Kit' to generate leads from companies seeking immediate solutions.",
            value: 9,
            effort: 7,
          },
        ],
      },
      impact: "medium",
      links: [
        "https://www.linkedin.com/posts/one1_%D7%94%D7%92%D7%A0%D7%94-%D7%95%D7%94%D7%99%D7%A2%D7%A8%D7%9B%D7%95%D7%AA-%D7%A1%D7%99%D7%99%D7%91%D7%A8-%D7%90%D7%A8%D7%92%D7%95%D7%A0%D7%99%D7%AA-%D7%91%D7%96%D7%9E%D7%9F-%D7%9E%D7%9C%D7%97%D7%9E%D7%94-activity-7340752979832049664--DM8",
      ],
    },
    {
      company: "ONE Technologies",
      homepage: "https://one1.co.il",
      insight: {
        title: "Emergency offshore program",
        summary:
          "ONE Offshore launched a wartime emergency program offering immediate, no-commitment development support from its Eastern Europe centers. The campaign targets Israeli tech firms needing backup during the conflict, highlighting flexibility and high-profile clients like McDonald's and HSBC.",
        proposedActions: [
          {
            content:
              "Benchmark similar emergency outsourcing services among competitors to refine your own value prop.",
            value: 5,
            effort: 4,
          },
          {
            content:
              "Approach Israeli startups struggling with continuity and offer a 2-week pilot of your offshore teams.",
            value: 8,
            effort: 6,
          },
          {
            content:
              "Develop co-branded case studies with major clients (e.g., McDonald's, Teva) to build trust in emergency deployments.",
            value: 10,
            effort: 7,
          },
        ],
      },
      impact: "high",
      links: [
        "https://www.linkedin.com/posts/one1_%D7%97%D7%91%D7%A8%D7%AA-one-%D7%9E%D7%AA%D7%92%D7%99%D7%99%D7%A1%D7%AA-%D7%9C%D7%9E%D7%A2%D7%9F-%D7%94%D7%94%D7%99%D7%99%D7%98%D7%A7-%D7%94%D7%99%D7%A9%D7%A8%D7%90%D7%9C%D7%99-%D7%9B%D7%A9%D7%97%D7%91%D7%A8%D7%95%D7%AA-activity-7341116256076406786-3iUP",
      ],
    },
    {
      company: "ONE Technologies",
      homepage: "https://one1.co.il",
      insight: {
        title: "ERP Sleeve Flip Campaign",
        summary:
          "ONE Technologies is running a Facebook campaign promoting its expertise in 'sleeve flip'—a strategic restructuring process relevant during crises like war. They highlight recent success in converting an Israeli parent company into a U.S. subsidiary within an ERP system, emphasizing speed, data integrity, and compliance. This positions them as a go-to partner for structural agility in emergency scenarios.",
        proposedActions: [
          {
            content:
              "Assess if your company would benefit from a 'sleeve flip' model for easier acquisition or international expansion, especially in volatile markets.",
            value: 7,
            effort: 5,
          },
          {
            content:
              "Repurpose their messaging style by highlighting your own company’s strategic agility and crisis-readiness on LinkedIn or other platforms.",
            value: 6,
            effort: 3,
          },
          {
            content:
              "Offer ERP re-structuring consulting services or workshops to mid-sized clients exposed to geopolitical risk.",
            value: 8,
            effort: 6,
          },
        ],
      },
      impact: "high",
      links: [
        "https://www.linkedin.com/posts/one1_%D7%9E%D7%94-%D7%96%D7%94-%D7%94%D7%99%D7%A4%D7%95%D7%9A-%D7%A9%D7%A8%D7%95%D7%95%D7%9C-%D7%95%D7%90%D7%99%D7%9A-%D7%94%D7%95%D7%90-%D7%A7%D7%A9%D7%95%D7%A8-%D7%9C%D7%9E%D7%9C%D7%97%D7%9E%D7%94-activity-7343227114860507143-mL2A",
        "https://scontent.ftlv6-1.fna.fbcdn.net/v/t39.35426-6/511190529_1628823981134971_3223752002443388646_n.jpg",
        "https://www.facebook.com/One1.co.il/",
      ],
    },
  ],
};
