#!/usr/bin/env node
// Classifies each company as Government or Private and writes company_type
// into enrichments_data.json so it's bundled with the frontend.

const fs = require('fs');
const path = require('path');

const companiesPath = path.join(__dirname, '../frontend/src/companies_data.json');
const enrichmentsPath = path.join(__dirname, '../frontend/src/enrichments_data.json');

const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
const enrichments = JSON.parse(fs.readFileSync(enrichmentsPath, 'utf8'));

// Patterns that indicate a government / public-sector entity
const GOV_PATTERNS = [
  /\bDRDO\b/i,
  /\bISRO\b/i,
  /\bCSIR\b/i,
  /\bCRRI\b/i,
  /\bBSNL\b/i,
  /\bBHEL\b/i,
  /\bONGC\b/i,
  /\bNTPC\b/i,
  /\bSAIL\b/i,
  /\bBARC\b/i,
  /\bNHPC\b/i,
  /\bIRCTC\b/i,
  /\bAAI\b/i,
  /\bNIC\b\s*\(/i,          // NIC (National Informatics...)
  /\bNICSI\b/i,
  /\bNIXI\b/i,
  /\bIGCAR\b/i,
  /\bINCOIS\b/i,
  /\bNCPOR\b/i,
  /\bNRSC\b/i,
  /\bRRSC\b/i,
  /\bSTQC\b/i,
  /\bETDC\b/i,
  /\bNIELIT\b/i,
  /\bC-DAC\b/i,
  /Centre for Development of Advanced Computing/i,
  /\bState Bank of India\b/i,
  /\bNeGD\b/i,
  /\bMeitY\b/i,
  /\bGMDC\b/i,
  /\bNCAER\b/i,
  /Army Base Workshop/i,
  /Central Institute of Road Transport/i,
  /Airports Authority of India/i,
  /Bhabha Atomic Research/i,
  /Bhaskaracharya Institute/i,
  /Brahmaputra Bridge/i,
  /Goa Shipyard/i,
  /Haryana Power Generation/i,
  /Indian National Centre for Ocean/i,
  /Indian Oil Corporation/i,
  /Indian Red Cross/i,
  /Indian Semiconductor Mission/i,
  /Indira Gandhi Centre for Atomic/i,
  /Grid Controller of India/i,
  /Maritime Research Center.*Underwater/i,
  /MeitY Startup Hub/i,
  /Mormugao Port/i,
  /National Atmospheric Research/i,
  /National Centre for Polar/i,
  /National e-Governance/i,
  /National Informatics Centre/i,
  /National Institute of Electronics and Information/i,
  /National Internet Exchange/i,
  /National Load Despatch/i,
  /National Remote Sensing/i,
  /National Council of Applied Economic/i,
  /Patratu Vidyut/i,
  /Regional Remote Sensing Cent/i,
  /Semi.Conductor Laboratory.*SCL/i,
  /SCL.*Mohali/i,
  /Steel Authority of India/i,
  /Standardisation.*Testing.*Quality/i,
];

function classifyCompany(name) {
  for (const pattern of GOV_PATTERNS) {
    if (pattern.test(name)) return 'Government';
  }
  return 'Private';
}

// Deduplicate company names (multiple rows can have the same name)
const uniqueNames = [...new Set(companies.map(c => c.name))];

let updated = 0;
let added = 0;

for (const name of uniqueNames) {
  const type = classifyCompany(name);

  if (enrichments[name]) {
    enrichments[name].company_type = type;
    updated++;
  } else {
    // Add a minimal entry so the filter works even for un-enriched companies
    enrichments[name] = { fetch_status: 'type_only', company_type: type };
    added++;
  }
}

fs.writeFileSync(enrichmentsPath, JSON.stringify(enrichments, null, 2));
console.log(`Done. Updated: ${updated}, Added: ${added}`);
console.log('Government companies:', uniqueNames.filter(n => classifyCompany(n) === 'Government').length);
console.log('Private companies:  ', uniqueNames.filter(n => classifyCompany(n) === 'Private').length);
