// Subdomain classification engine based on project detail keywords

const SUBDOMAIN_MAP = {
  'CSIS': {
    'Machine Learning': [
      'machine learning', ' ml ', 'neural network', 'deep learning', 'tensorflow',
      'pytorch', 'model training', 'computer vision', 'convolutional', 'lstm',
      'random forest', 'gradient boosting', 'xgboost', 'scikit', 'keras',
      'supervised learning', 'unsupervised learning', 'reinforcement learning',
      'feature engineering', 'prediction model', 'classification', 'regression model'
    ],
    'Artificial Intelligence': [
      'artificial intelligence', ' ai ', 'llm', 'large language model', 'generative ai',
      'chatbot', 'gpt', 'transformer', 'foundation model', 'multimodal', 'rag',
      'retrieval augmented', 'fine-tuning', 'prompt engineering', 'openai',
      'langchain', 'vector database', 'embedding', 'semantic search', 'inference'
    ],
    'Data Science': [
      'data science', 'data analysis', 'analytics', 'pandas', 'visualization',
      'statistics', 'business intelligence', 'tableau', 'power bi', 'looker',
      'data pipeline', 'etl', 'data warehouse', 'apache spark', 'hadoop',
      'data engineering', 'bigquery', 'snowflake', 'dbt', 'data modeling',
      'a/b testing', 'experimentation', 'insight', 'dashboard', 'reporting'
    ],
    'Software Development': [
      'software development', 'sde', 'backend', ' api ', 'microservice', 'system design',
      'distributed system', 'devops', 'kubernetes', 'docker', 'ci/cd', 'pipeline',
      'java', 'golang', ' go ', 'python backend', 'node.js', 'spring boot',
      'grpc', 'rest api', 'graphql', 'message queue', 'kafka', 'redis',
      'scalability', 'high performance', 'low latency', 'concurrency'
    ],
    'Web Development': [
      'web development', 'web dev', 'react', 'angular', 'vue', 'frontend',
      'html', 'css', 'javascript', 'typescript', 'fullstack', 'full stack',
      'next.js', 'nuxt', 'svelte', 'web application', 'spa', 'pwa',
      'ui/ux', 'responsive design', 'tailwind', 'webpack', 'vite'
    ],
    'Mobile Development': [
      'mobile', 'android', 'ios', 'flutter', 'react native', 'swift',
      'kotlin', 'mobile app', 'cross-platform', 'app development'
    ],
    'Cybersecurity': [
      'security', 'cybersecurity', 'cyber security', 'cryptography', 'penetration',
      'vulnerability', 'firewall', 'soc', 'threat detection', 'malware',
      'forensics', 'zero trust', 'siem', 'identity access', 'iam',
      'oauth', 'encryption', 'devsecops', 'compliance', 'audit'
    ],
    'Cloud & DevOps': [
      'cloud', 'aws', 'azure', 'gcp', 'google cloud', 'infrastructure',
      'terraform', 'ansible', 'monitoring', 'observability', 'site reliability',
      'sre', 'platform engineering', 'serverless', 'lambda', 'kubernetes'
    ],
    'Blockchain': [
      'blockchain', 'web3', 'crypto', 'smart contract', 'defi', 'nft',
      'ethereum', 'solidity', 'decentralized', 'distributed ledger'
    ],
    'Computer Networks': [
      'networking', 'network', '5g', 'wireless', 'protocol', 'routing',
      'sdn', 'nfv', 'wireshark', 'packet', 'network security'
    ],
    'Game Development': [
      'game', 'unity', 'unreal engine', 'gaming', 'game engine', 'graphics'
    ]
  },
  'Electrical': {
    'VLSI & Chip Design': [
      'vlsi', 'chip design', 'semiconductor', 'ic design', 'rtl', 'fpga',
      'verilog', 'vhdl', 'asic', 'synthesis', 'physical design', 'layout',
      'eda', 'timing analysis', 'dft', 'analog design', 'mixed signal'
    ],
    'Embedded Systems': [
      'embedded', 'firmware', 'iot', 'microcontroller', 'rtos', 'arduino',
      'raspberry pi', 'stm32', 'bare metal', 'device driver', 'bsp',
      'real-time', 'sensor fusion', 'protocol stack', 'uart', 'spi', 'i2c'
    ],
    'Power Systems': [
      'power system', 'power grid', 'renewable energy', 'solar', 'wind energy',
      'smart grid', 'power electronics', 'inverter', 'converter', 'motor drive',
      'energy storage', 'battery', 'electric vehicle', 'ev charging'
    ],
    'Signal Processing': [
      'signal processing', 'dsp', 'communications', 'wireless communication',
      '5g', 'radar', 'lidar', 'image processing', 'audio processing',
      'fft', 'filter design', 'modulation', 'channel estimation'
    ],
    'Control Systems': [
      'control system', 'pid', 'feedback control', 'automation', 'plc',
      'scada', 'process control', 'mechatronics', 'servo', 'motion control'
    ]
  },
  'Mechanical': {
    'Thermal & Fluids': [
      'thermal', 'heat transfer', 'cfd', 'thermodynamics', 'hvac',
      'fluid dynamics', 'combustion', 'heat exchanger', 'cooling system'
    ],
    'Manufacturing': [
      'manufacturing', 'cnc', 'lean', 'production', 'quality', 'six sigma',
      'supply chain', 'operations', 'process optimization', 'industry 4.0'
    ],
    'Robotics & Automation': [
      'robotics', 'automation', 'autonomous', 'manipulator', 'cobot',
      'industrial robot', 'path planning', 'kinematics', 'ros'
    ],
    'CAD & Simulation': [
      'cad', 'solidworks', 'catia', 'ansys', 'fea', 'simulation',
      'product design', '3d modeling', 'structural analysis', 'topology optimization'
    ],
    'Materials Science': [
      'materials', 'composite', 'polymer', 'metallurgy', 'nanomaterial',
      'material characterization', 'failure analysis', 'coating'
    ]
  },
  'Chemical': {
    'Process Engineering': [
      'process', 'chemical plant', 'refinery', 'distillation', 'reactor',
      'aspen', 'hysys', 'process simulation', 'unit operation'
    ],
    'Biotechnology': [
      'biotech', 'pharmaceutical', 'drug', 'bioprocess', 'fermentation',
      'bioreactor', 'cell culture', 'downstream processing'
    ],
    'Environmental': [
      'environmental', 'waste treatment', 'water treatment', 'pollution',
      'sustainability', 'green chemistry', 'carbon capture'
    ]
  },
  'Finance': {
    'Fintech': [
      'fintech', 'payment', 'banking', 'lending', 'insurtech', 'regtech',
      'neobank', 'digital wallet', 'upi', 'kyc', 'fraud detection'
    ],
    'Quantitative Finance': [
      'quantitative', 'quant', 'algorithmic trading', 'algo trading',
      'derivatives', 'risk model', 'stochastic', 'options pricing'
    ],
    'Risk & Compliance': [
      'risk management', 'compliance', 'credit risk', 'market risk',
      'audit', 'regulatory', 'aml', 'anti-money laundering'
    ],
    'Investment': [
      'investment', 'portfolio', 'equity research', 'venture capital',
      'private equity', 'asset management', 'wealth management'
    ]
  },
  'Consulting': {
    'Strategy Consulting': [
      'strategy', 'management consulting', 'business strategy', 'advisory'
    ],
    'IT Consulting': [
      'it consulting', 'digital transformation', 'erp', 'sap', 'implementation'
    ],
    'Analytics Consulting': [
      'analytics consulting', 'data driven', 'insight', 'decision support'
    ]
  }
};

// Generic fallback subdomains based on project text
const GENERIC_KEYWORDS = {
  'Research & Development': ['research', 'r&d', 'innovation', 'prototype', 'poc'],
  'Product Management': ['product management', 'product owner', 'roadmap', 'agile', 'scrum'],
  'Operations': ['operations', 'supply chain', 'logistics', 'procurement'],
};

/**
 * Classify a company into subdomains based on domain and project details
 */
export function classifySubdomains(domain, projectDetails) {
  if (!domain || !projectDetails) return ['General'];

  const domainStr = domain.toString().trim();
  const text = projectDetails.toString().toLowerCase();

  // Try to match the broad domain to our map
  let matchedDomainKey = null;
  for (const key of Object.keys(SUBDOMAIN_MAP)) {
    if (domainStr.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(domainStr.toLowerCase())) {
      matchedDomainKey = key;
      break;
    }
  }

  const subdomains = new Set();

  // If we have a domain-specific map, use it
  if (matchedDomainKey) {
    const subdomainKeywords = SUBDOMAIN_MAP[matchedDomainKey];
    for (const [subdomain, keywords] of Object.entries(subdomainKeywords)) {
      if (keywords.some(kw => text.includes(kw))) {
        subdomains.add(subdomain);
      }
    }
  }

  // Also check generic keywords across all domains for CSIS since it overlaps with many
  if (matchedDomainKey === 'CSIS' || !matchedDomainKey) {
    for (const [subdomain, keywords] of Object.entries(SUBDOMAIN_MAP['CSIS'])) {
      if (keywords.some(kw => text.includes(kw))) {
        subdomains.add(subdomain);
      }
    }
  }

  // Generic fallback
  for (const [subdomain, keywords] of Object.entries(GENERIC_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      subdomains.add(subdomain);
    }
  }

  return subdomains.size > 0 ? [...subdomains] : ['General'];
}

/**
 * Normalize domain name to a standard category
 */
export function normalizeDomain(raw) {
  if (!raw) return 'General';
  const s = raw.toString().trim();

  const mappings = [
    [/csis|cs|it\b|computer science|information tech/i, 'CSIS'],
    [/ee|ece|electrical|electronics/i, 'Electrical'],
    [/me\b|mech|mechanical/i, 'Mechanical'],
    [/chem|chemical/i, 'Chemical'],
    [/finance|fin\b|economics/i, 'Finance'],
    [/consult/i, 'Consulting'],
    [/pharma|bio|life science/i, 'Biotech'],
    [/civil|env|environ/i, 'Civil'],
    [/design|ux|ui/i, 'Design'],
    [/management|mba|business/i, 'Management'],
  ];

  for (const [regex, normalized] of mappings) {
    if (regex.test(s)) return normalized;
  }

  return s; // Return as-is if no mapping found
}
