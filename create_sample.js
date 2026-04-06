// Run with: node create_sample.js
// Creates a sample_data.xlsx file for testing
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sampleData = [
  {
    'Company Name': 'Google India',
    'Domain': 'CSIS',
    'City': 'Bangalore',
    'Project Details': 'Machine learning infrastructure for Search ranking. Work with TensorFlow and large-scale distributed systems. Build and optimize neural network models for query understanding and document ranking at scale.',
  },
  {
    'Company Name': 'Microsoft Azure',
    'Domain': 'CSIS',
    'City': 'Hyderabad',
    'Project Details': 'Cloud platform engineering and DevOps automation. Work with Kubernetes, Docker, and Azure cloud services. Build CI/CD pipelines and microservices infrastructure.',
  },
  {
    'Company Name': 'Goldman Sachs',
    'Domain': 'Finance',
    'City': 'Bangalore',
    'Project Details': 'Quantitative risk analysis and algorithmic trading systems. Develop models for derivatives pricing and portfolio optimization. Work with Python, C++, and real-time financial data.',
  },
  {
    'Company Name': 'Texas Instruments',
    'Domain': 'Electrical',
    'City': 'Bangalore',
    'Project Details': 'VLSI design for next-generation embedded processors. RTL design using Verilog/VHDL. FPGA prototyping and physical design optimization.',
  },
  {
    'Company Name': 'Tata Motors',
    'Domain': 'Mechanical',
    'City': 'Pune',
    'Project Details': 'Electric vehicle powertrain simulation and thermal management. CFD analysis of battery cooling systems. CAD design and FEA structural analysis for EV chassis.',
  },
  {
    'Company Name': 'Flipkart',
    'Domain': 'CSIS',
    'City': 'Bangalore',
    'Project Details': 'Backend microservices for e-commerce recommendation engine. Build REST APIs and data pipelines. Work with Java, Kafka, and Elasticsearch at scale.',
  },
  {
    'Company Name': 'Qualcomm',
    'Domain': 'Electrical',
    'City': 'Hyderabad',
    'Project Details': 'Embedded firmware development for 5G modem SoCs. Signal processing algorithms for wireless communications. RTOS-based driver development and protocol stack optimization.',
  },
  {
    'Company Name': 'McKinsey & Company',
    'Domain': 'Consulting',
    'City': 'Mumbai',
    'Project Details': 'Strategy consulting and digital transformation projects. Data analytics and business intelligence for Fortune 500 clients. Market analysis and operational excellence initiatives.',
  },
  {
    'Company Name': 'Dr. Reddys Laboratories',
    'Domain': 'Chemical',
    'City': 'Hyderabad',
    'Project Details': 'Pharmaceutical process engineering and bioprocess optimization. API synthesis and formulation development. Quality control analytics and regulatory compliance.',
  },
  {
    'Company Name': 'Zepto',
    'Domain': 'CSIS',
    'City': 'Mumbai',
    'Project Details': 'Full stack web development for quick commerce platform. React frontend and Node.js backend. Real-time order tracking and logistics optimization algorithms.',
  },
  {
    'Company Name': 'NVIDIA',
    'Domain': 'CSIS',
    'City': 'Pune',
    'Project Details': 'Deep learning and GPU computing for AI inference. Develop CUDA kernels and optimize neural network performance. Work on computer vision and generative AI pipelines.',
  },
  {
    'Company Name': 'Ather Energy',
    'Domain': 'Electrical',
    'City': 'Bangalore',
    'Project Details': 'Battery management system design and embedded systems for electric scooters. Firmware development for motor control and IoT connectivity. Power electronics and BMS algorithm development.',
  },
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(sampleData);

// Set column widths
ws['!cols'] = [
  { wch: 30 },
  { wch: 15 },
  { wch: 15 },
  { wch: 80 },
];

XLSX.utils.book_append_sheet(wb, ws, 'PS1 Companies');

const outputPath = path.join(__dirname, 'sample_data.xlsx');
XLSX.writeFile(wb, outputPath);
console.log(`✅ Created: ${outputPath}`);
console.log(`   ${sampleData.length} sample companies written`);
