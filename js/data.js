// Demo reference data. The catalogue, prices, customer accounts and SKUs below are
// ILLUSTRATIVE ONLY: they were made up for this demo and are not Fortus data.
// In a real deployment these would come from the ERP / product master.

export const BRANCHES = [
  { id: "DUB", name: "Dublin", country: "IE" },
  { id: "CRK", name: "Cork", country: "IE" },
  { id: "BEL", name: "Belfast", country: "UK" },
  { id: "MAN", name: "Manchester", country: "UK" },
  { id: "BHM", name: "Birmingham", country: "UK" },
  { id: "LIV", name: "Liverpool", country: "UK" },
  { id: "GLA", name: "Glasgow", country: "UK" },
  { id: "BRI", name: "Bristol", country: "UK" },
  { id: "NOT", name: "Nottingham", country: "UK" },
  { id: "SHF", name: "Sheffield", country: "UK" },
  { id: "KNT", name: "Kent", country: "UK" },
  { id: "NLX", name: "Netherlands (export desk)", country: "NL" },
];

export const CUSTOMERS = [
  { account: "C10421", name: "Brightwater Security Systems Ltd", town: "Dublin 12", country: "IE", currency: "EUR", terms: "30 days EOM", home_branch: "DUB" },
  { account: "C10422", name: "Brightway Electrical Contractors", town: "Swords, Co. Dublin", country: "IE", currency: "EUR", terms: "30 days", home_branch: "DUB" },
  { account: "C20877", name: "Northpoint Fire Protection Ltd", town: "Salford, Manchester", country: "UK", currency: "GBP", terms: "60 days", home_branch: "MAN" },
  { account: "C20878", name: "Northgate Fire & Security", town: "Leeds", country: "UK", currency: "GBP", terms: "30 days", home_branch: "SHF" },
  { account: "C10655", name: "Seán Kelly Alarms", town: "Ballincollig, Co. Cork", country: "IE", currency: "EUR", terms: "Cash / card on collection", home_branch: "CRK" },
  { account: "C30112", name: "Meridian Access Solutions Ltd", town: "Birmingham", country: "UK", currency: "GBP", terms: "30 days EOM", home_branch: "BHM" },
  { account: "C10390", name: "Kingdom Gates & Automation", town: "Tralee, Co. Kerry", country: "IE", currency: "EUR", terms: "30 days", home_branch: "CRK" },
  { account: "C40018", name: "VeiligWerk Beveiliging B.V.", town: "Utrecht", country: "NL", currency: "EUR", terms: "30 dagen", home_branch: "NLX" },
  { account: "C20131", name: "Pennine Security Installations", town: "Huddersfield", country: "UK", currency: "GBP", terms: "30 days", home_branch: "SHF" },
  { account: "C10777", name: "Atlantic Fire & Security", town: "Galway", country: "IE", currency: "EUR", terms: "30 days", home_branch: "DUB" },
];

// sku, category, brand, manufacturer part number, description, unit, list prices
export const CATALOGUE = [
  // CCTV
  ["FT-HIK-2347G2LU", "CCTV", "Hikvision", "DS-2CD2347G2-LU", "4MP ColorVu turret camera, 2.8mm, built-in mic", "each", 139, 119],
  ["FT-HIK-2143G2I", "CCTV", "Hikvision", "DS-2CD2143G2-I", "4MP AcuSense dome camera, 2.8mm", "each", 119, 99],
  ["FT-HIK-2T47G2L", "CCTV", "Hikvision", "DS-2CD2T47G2-L", "4MP ColorVu bullet camera, 4mm", "each", 149, 129],
  ["FT-HIK-2387G2LU", "CCTV", "Hikvision", "DS-2CD2387G2-LU", "8MP (4K) ColorVu turret camera, 2.8mm", "each", 189, 159],
  ["FT-HIK-7608K2-8P", "CCTV", "Hikvision", "DS-7608NXI-K2/8P", "8 channel AcuSense NVR, 8 x PoE, 2 HDD bays", "each", 329, 279],
  ["FT-HIK-7616K2-16P", "CCTV", "Hikvision", "DS-7616NXI-K2/16P", "16 channel AcuSense NVR, 16 x PoE, 2 HDD bays", "each", 489, 419],
  ["FT-HDD-4TB", "CCTV", "Seagate", "ST4000VX016", "4TB SkyHawk surveillance hard drive", "each", 119, 99],
  ["FT-HDD-8TB", "CCTV", "Seagate", "ST8000VE001", "8TB SkyHawk AI surveillance hard drive", "each", 229, 195],
  ["FT-HIK-1280ZJXS", "CCTV", "Hikvision", "DS-1280ZJ-XS", "Junction box for turret cameras", "each", 12, 10],
  ["FT-HIK-1272ZJ110", "CCTV", "Hikvision", "DS-1272ZJ-110", "Wall mount bracket for dome/turret", "each", 14, 12],
  ["FT-HIK-MON22", "CCTV", "Hikvision", "DS-D5022FN-C", "22\" Full HD monitor, HDMI/VGA", "each", 129, 109],
  // Access control
  ["FT-PAX-682531", "Access", "Paxton", "682-531", "Net2 Plus 1 door controller with 12V 2A PSU, boxed", "each", 389, 329],
  ["FT-PAX-P50", "Access", "Paxton", "P50", "Proximity reader P50, mullion", "each", 69, 59],
  ["FT-PAX-P75", "Access", "Paxton", "P75", "Proximity reader P75, standard", "each", 89, 75],
  ["FT-PAX-KP75", "Access", "Paxton", "KP75", "Proximity keypad reader KP75", "each", 119, 99],
  ["FT-PAX-692052", "Access", "Paxton", "692-052", "Net2 proximity keyfobs, pack of 10", "pack", 39, 33],
  ["FT-PAX-ISO10", "Access", "Paxton", "692-448", "Net2 proximity ISO cards, pack of 10", "pack", 29, 25],
  ["FT-PAX-010110", "Access", "Paxton", "010-110", "Paxton10 door controller", "each", 349, 299],
  ["FT-PAX-ENTRYKIT", "Access", "Paxton", "337-110", "Net2 Entry standard kit (panel + monitor)", "kit", 599, 509],
  ["FT-PAX-NET2PRO", "Access", "Paxton", "NET2PRO", "Net2 Pro software licence", "each", 199, 169],
  ["FT-ACC-MAG600M", "Access", "Fortus Essentials", "ML600-M", "600lb monitored maglock, 12/24V, with bracket", "each", 59, 49],
  ["FT-ACC-BGGRN", "Access", "Fortus Essentials", "BG-GRN-DP", "Green emergency door release, double pole", "each", 19, 16],
  ["FT-ACC-NTEXIT", "Access", "Fortus Essentials", "NT-EXIT", "No-touch exit button, stainless", "each", 29, 24],
  ["FT-ACC-PSU12V3", "Access", "Fortus Essentials", "PSU-12V3A", "12V 3A boxed power supply with battery space", "each", 45, 38],
  // Intruder
  ["FT-PYR-ENF32WE", "Intruder", "Pyronix", "ENF32WE-APP", "Enforcer 32-WE wireless panel with app & keypad", "each", 399, 339],
  ["FT-PYR-KX15DQWE", "Intruder", "Pyronix", "KX15DQ-WE", "Wireless quad PIR detector, 15m", "each", 45, 38],
  ["FT-PYR-KX10DP", "Intruder", "Pyronix", "KX10DP-WE", "Wireless pet-tolerant PIR detector, 10m", "each", 49, 42],
  ["FT-PYR-MC1MINI", "Intruder", "Pyronix", "MC1MINI-WE", "Wireless mini door contact", "each", 29, 24],
  ["FT-PYR-DBELLWE", "Intruder", "Pyronix", "DELTABELL-WE", "Deltabell wireless external siren, blue", "each", 159, 135],
  ["FT-PYR-FOBWE", "Intruder", "Pyronix", "KEY-FOB-WE", "Wireless 4-button keyfob", "each", 39, 33],
  ["FT-PYR-DIGI4G", "Intruder", "Pyronix", "DIGI-4G", "4G/GPRS communicator module", "each", 129, 109],
  // Fire
  ["FT-HOC-ALNEN", "Fire", "Hochiki", "ALN-EN", "ESP analogue optical smoke detector", "each", 45, 38],
  ["FT-HOC-ATJEN", "Fire", "Hochiki", "ATJ-EN", "ESP analogue heat detector", "each", 42, 36],
  ["FT-HOC-YBNR3", "Fire", "Hochiki", "YBN-R/3", "Standard detector base", "each", 8, 6.5],
  ["FT-HOC-CHQBS", "Fire", "Hochiki", "CHQ-BS", "ESP loop-powered sounder base", "each", 49, 42],
  ["FT-HOC-HCPE", "Fire", "Hochiki", "HCP-E(SCI)", "ESP addressable manual call point, red", "each", 39, 33],
  ["FT-HOC-CHQWS2", "Fire", "Hochiki", "CHQ-WS2", "ESP wall sounder, red", "each", 59, 50],
  ["FT-ADV-MX5401", "Fire", "Advanced", "MX-5401", "MxPro 5 single-loop fire panel", "each", 1250, 1060],
  ["FT-CAB-FP200-15", "Fire", "Prysmian", "FP200G-1.5-2C-RED", "FP200 Gold 1.5mm 2-core fire cable, red, 100m drum", "drum", 129, 109],
  ["FT-BAT-12V7", "Fire", "Yuasa", "NP7-12", "12V 7Ah sealed lead-acid battery", "each", 19, 16],
  ["FT-BAT-12V17", "Fire", "Yuasa", "NP17-12", "12V 17Ah sealed lead-acid battery", "each", 49, 42],
  // Gate automation
  ["FT-ROG-BH30KIT", "Gates", "Roger Technology", "KIT BH30/803", "Brushless swing gate kit, 2 leaves up to 3m each", "kit", 1195, 1015],
  ["FT-ROG-BG30KIT", "Gates", "Roger Technology", "KIT BG30/1604", "Brushless sliding gate kit, up to 1000kg", "kit", 895, 760],
  ["FT-ROG-F4ES", "Gates", "Roger Technology", "F4ES", "Photocells, surface mount, pair", "pair", 69, 59],
  ["FT-ROG-E80TX52R", "Gates", "Roger Technology", "E80/TX52R", "2-channel rolling code remote", "each", 29, 25],
  ["FT-ROG-FIFTHY", "Gates", "Roger Technology", "R92/LED", "LED flashing beacon with antenna", "each", 49, 42],
  ["FT-ROG-H85TDS", "Gates", "Roger Technology", "H85/TDS", "Key selector switch, surface", "each", 39, 33],
  // Cable & sundries
  ["FT-CAB-CAT6INT", "Cable", "Fortus Essentials", "CAT6-UTP-305-GRY", "CAT6 UTP cable, internal LSZH grey, 305m box", "box", 129, 109],
  ["FT-CAB-CAT6EXT", "Cable", "Fortus Essentials", "CAT6-UTP-305-EXT", "CAT6 UTP cable, external PE black, 305m box", "box", 169, 145],
  ["FT-CAB-6C100", "Cable", "Fortus Essentials", "ALARM-6C-100-WHT", "6-core alarm cable, white, 100m", "reel", 29, 25],
  ["FT-CAB-RJ45-100", "Cable", "Fortus Essentials", "RJ45-CAT6-100", "RJ45 CAT6 connectors, pack of 100", "pack", 19, 16],
].map(([sku, category, brand, mpn, description, unit, price_eur, price_gbp]) => ({
  sku, category, brand, mpn, description, unit, price_eur, price_gbp,
}));

export const findProduct = (sku) => CATALOGUE.find((p) => p.sku === sku) || null;
export const findCustomer = (account) => CUSTOMERS.find((c) => c.account === account) || null;
export const findBranch = (id) => BRANCHES.find((b) => b.id === id) || null;
