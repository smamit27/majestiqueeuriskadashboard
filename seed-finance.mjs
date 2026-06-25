#!/usr/bin/env node
import { execSync } from 'child_process';
import https from 'https';

const PROJECT_ID = 'majestiqueeuriskadashboard';

const financeData = {
  'finance_2025-04': {
    month: '2025-04',
    income: [
      { source: 'Maintenance Collection', amount: '182854.00', remark: 'Flat Maintenance HDFC' },
      { source: 'Tata Play Broadband', amount: '3630.00', remark: 'Rent TATA Play' },
      { source: 'C building', amount: '5884.00', remark: 'VMS Share' },
      { source: 'B building', amount: '11769.00', remark: 'VMS Share' },
      { source: 'Transfer Charges', amount: '25000.00', remark: 'Flat No 606' },
      { source: 'Tata Play', amount: '27001.00', remark: 'Tata Play Electricity bill paid' },
      { source: 'B building', amount: '2942.00', remark: 'Clubhouse Electricity Share' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'Marshal Force Security', amount: '42970.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '30983.00', purpose: 'House keeping Charges' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Swimming Pool Maintenance Charges' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '10000.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Petty Cash', amount: '10000.00', purpose: 'Common Expenses' },
      { chequeNo: '', vendor: 'Shree Swami samarth', amount: '6421.00', purpose: 'Water Tanker Charges' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardner Salary' },
      { chequeNo: '', vendor: 'C building', amount: '2504.00', purpose: 'Clubhouse CCTV share' },
      { chequeNo: '', vendor: 'C building', amount: '23339.00', purpose: 'Common Electricity Share' },
      { chequeNo: '', vendor: 'Vivish Technlogy', amount: '28320.00', purpose: 'VMS maygate Main Ghate app' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '9980.00', purpose: 'Swining pool Motor purchase share' },
      { chequeNo: '', vendor: 'B building', amount: '1130.00', purpose: 'Gym AMC Share' },
      { chequeNo: '', vendor: 'B building', amount: '7766.00', purpose: 'Fire AMC Share' },
      { chequeNo: '', vendor: 'Ankush Fire Sefty', amount: '13600.00', purpose: 'Fire Extigusher Refiling' },
      { chequeNo: '', vendor: 'Shahebaj Safty Solution', amount: '7080.00', purpose: 'Fire Pump NRV Replacment' },
      { chequeNo: '', vendor: 'C building', amount: '1160.00', purpose: 'Clubhouse Electricity Share' }
    ]
  },
  'finance_2025-05': {
    month: '2025-05',
    income: [
      { source: 'Maintenance', amount: '174862.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: '' },
      { source: 'B Building', amount: '10298.00', remark: '' },
      { source: 'C Building', amount: '5149.00', remark: '' },
      { source: 'B Building', amount: '9195.00', remark: '' },
      { source: 'C Building', amount: '4597.00', remark: 'Park Plus Share' },
      { source: 'B Building', amount: '23318.00', remark: 'Park Plus Share' },
      { source: 'C Building', amount: '11659.00', remark: 'Park Plus Share' },
      { source: 'B Building', amount: '2660.00', remark: 'Park Plus Share' },
      { source: 'C Building', amount: '1329.00', remark: 'Common Electricity share' },
      { source: 'B Building', amount: '0', remark: 'Common Electricity share' },
      { source: 'C Building', amount: '1471.00', remark: 'Clubhouse Electricity share' },
      { source: '', amount: '0', remark: 'Fire NRV charges share' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'MSEDCL', amount: '37800.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '31424.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'Marshal Force Security', amount: '46167.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardener Salary' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '6400.00', purpose: 'Clubhouse Electricity bill' },
      { chequeNo: '', vendor: 'Shree Swami Samarth Water', amount: '7664.00', purpose: '' },
      { chequeNo: '', vendor: 'Schindler India Pvt. Ltd.', amount: '89680.00', purpose: 'Lift AMC Charges 6 months' },
      { chequeNo: '', vendor: 'B Building', amount: '12343.00', purpose: 'Property tax Share' },
      { chequeNo: '', vendor: 'Vivish Technologies', amount: '14160.00', purpose: 'Mygate ERP Charges 2 years' },
      { chequeNo: '', vendor: 'Parviom Technoloie', amount: '24780.00', purpose: 'Park Plus Insttalation Charges' },
      { chequeNo: '', vendor: 'Parviom Technoloie', amount: '22125.00', purpose: 'Park Plus Rent Charges' },
      { chequeNo: '', vendor: 'C Building', amount: '6257.00', purpose: 'DG Fuel Share' }
    ]
  },
  'finance_2025-06': {
    month: '2025-06',
    income: [
      { source: 'Maintenance', amount: '162243.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: '' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'MSEDCL', amount: '37110.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '25918.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'Marshal Force Security', amount: '36101.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardener Salary' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'Aditya Kumar', amount: '7532.00', purpose: 'Balance Amount Paly Area' },
      { chequeNo: '', vendor: 'Shree Swami Samarth', amount: '7043.00', purpose: 'Water Tanker Charges' },
      { chequeNo: '', vendor: 'B Building', amount: '1537.00', purpose: 'Clubhouse Electricity Bill share' },
      { chequeNo: '', vendor: 'B Building', amount: '19607.00', purpose: 'Common Electricty Bill share' }
    ]
  },
  'finance_2025-07': {
    month: '2025-07',
    income: [
      { source: 'Maintenance', amount: '258393.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: '' },
      { source: 'Shifting Charges', amount: '4000.00', remark: 'Flat No. 407' },
      { source: 'C Building', amount: '5195.00', remark: 'STP Fine' },
      { source: 'B Building', amount: '10390.00', remark: 'STP Fine' },
      { source: 'B Building', amount: '1488.00', remark: 'Clubhouse Share' }
    ],
    expenses: [
      { chequeNo: '', vendor: '3S Security Services', amount: '52351.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '38310.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '37529.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'PMC', amount: '25000.00', purpose: 'STP Fine' },
      { chequeNo: '', vendor: 'Nandu Auti', amount: '21650.00', purpose: 'CCTV Hard disc and Installlation charges' },
      { chequeNo: '', vendor: 'C Building', amount: '21607.00', purpose: 'Common Electricty Bill share' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'Shree Swami Samarth', amount: '5386.00', purpose: 'Water Tanker Charges' },
      { chequeNo: '', vendor: 'Parivom Technology', amount: '5015.00', purpose: 'Car and Bike Sticker Purchase' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'Nandu Auti', amount: '3164.00', purpose: 'Swimming Pool Camera Installation' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardener Salary' },
      { chequeNo: '', vendor: 'Shivshankar Chauhan', amount: '2134.00', purpose: 'Balance Amount Paly Area' },
      { chequeNo: '', vendor: 'C Building', amount: '1341.00', purpose: 'Clubhouse Electricty Bill share' }
    ]
  },
  'finance_2025-08': {
    month: '2025-08',
    income: [
      { source: 'Maintenance', amount: '293092.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: '' },
      { source: 'Flat Transfer Fees', amount: '25000.00', remark: 'Flat No. 504' },
      { source: 'Flat Transfer Fees', amount: '25000.00', remark: 'Flat No. 1001' },
      { source: 'Clubhouse Booking', amount: '1000.00', remark: 'Flat No. 802' },
      { source: 'C Building', amount: '16438.00', remark: 'Common Electricity Share' },
      { source: 'C Building', amount: '744.00', remark: 'Clubhouse Electricity Share' },
      { source: 'B Building', amount: '24777.00', remark: 'Common Electricity Share' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'MSEDCL', amount: '59620.00', purpose: 'Common Electricity Share' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '39694.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '36890.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: '3S Security Services', amount: '35967.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Shivshankar Chauhan', amount: '13766.00', purpose: 'Common Salary' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'C Building', amount: '6257.00', purpose: 'Diesel Share' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'Om Fabrication', amount: '4500.00', purpose: 'Terrace Shed Fitting and Repairing' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '3580.00', purpose: 'Clubhouse Electricity Share' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '3058.00', purpose: 'Gardener Salary' }
    ]
  },
  'finance_2025-09': {
    month: '2025-09',
    income: [
      { source: 'Maintenance', amount: '201024.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: 'TATA Play' },
      { source: 'Flat Transfer Fees', amount: '25000.00', remark: 'Flat No 703' },
      { source: 'Flat Transfer Fees', amount: '25000.00', remark: 'Flat No 303' },
      { source: 'Clubhouse Booking', amount: '2000.00', remark: 'Activity' },
      { source: 'Clubhouse Booking', amount: '1000.00', remark: 'Flat No 702' },
      { source: 'Chair Rent', amount: '100.00', remark: 'Flat No 605' }
    ],
    expenses: [
      { chequeNo: '', vendor: '3S Security Services', amount: '52351.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '40826.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '38770.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: 'B Building', amount: '22066.00', purpose: 'Common Electricity Bill share' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '5460.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'Shivshankar Chauhan', amount: '3766.00', purpose: 'Common Salary' },
      { chequeNo: '', vendor: 'IGS Solar', amount: '3050.00', purpose: 'Solar Tube Repairing' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardener Salary' },
      { chequeNo: '', vendor: 'B Building', amount: '960.00', purpose: 'Clubhouse Electricity Bill share' }
    ]
  },
  'finance_2025-10': {
    month: '2025-10',
    income: [
      { source: 'Maintenance', amount: '275923.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: 'TATA Play' },
      { source: 'Flat Transfer Fees', amount: '25000.00', remark: 'Flat No 804' },
      { source: 'Tata Play', amount: '45435.00', remark: 'Electricity' },
      { source: 'Clubhouse Booking', amount: '1000.00', remark: '801' }
    ],
    expenses: [
      { chequeNo: '', vendor: '3S Security Services', amount: '48534.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '41145.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '38480.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: 'C Building', amount: '18270.00', purpose: 'Common Electricity Bill share' },
      { chequeNo: '', vendor: 'Diwali Bonus', amount: '18250.00', purpose: 'Solar Tube Repairing' },
      { chequeNo: '', vendor: 'Sameer Electricals', amount: '11850.00', purpose: 'Basement Motor Repairing Common' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Self', amount: '7000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'C Building', amount: '4156.00', purpose: 'Reimbursement Common Electricity Bill' },
      { chequeNo: '', vendor: 'Shivshankar Chauhan', amount: '3766.00', purpose: 'Common Salary' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardener Salary' }
    ]
  },
  'finance_2025-11': {
    month: '2025-11',
    income: [
      { source: 'Maintenance', amount: '274833.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: 'TATA Play Rent' },
      { source: 'B Building', amount: '1534.00', remark: 'Clubhouse Bill Share' },
      { source: 'B Building', amount: '9164.00', remark: 'Pump Repairing Share' },
      { source: 'B Building', amount: '9242.00', remark: 'Park Plus Share' },
      { source: 'C Building', amount: '4582.00', remark: 'Pump Repairing Share' },
      { source: 'C Building', amount: '4621.00', remark: 'Park Plus Share' },
      { source: 'C Building', amount: '10701.00', remark: 'Common Light Bill Share' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'Schindler India Pvt', amount: '89680.00', purpose: 'Lift AMC' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '51500.00', purpose: 'Common Electricity Bill' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '41145.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '39630.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: '3S Security Services', amount: '36447.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Parviom Technologis', amount: '22238.00', purpose: 'Park Plus Rent' },
      { chequeNo: '', vendor: 'Manasi Elecricals', amount: '22050.00', purpose: 'Basement Pump Repairing Charges' },
      { chequeNo: '', vendor: 'Sanjay Gupta', amount: '16000.00', purpose: 'Realing Work Charges' },
      { chequeNo: '', vendor: 'Shivshankar Chauhan', amount: '13766.00', purpose: 'Common Salary' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'C Building', amount: '9415.00', purpose: 'Common Electricty Bill share' },
      { chequeNo: '', vendor: 'Self', amount: '8000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'DP Waterproofing', amount: '7000.00', purpose: 'Common Bathroom Waterproofing work' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '3690.00', purpose: 'Clubhouse Electricity Bill' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardener Salary' },
      { chequeNo: '', vendor: 'C Building', amount: '1510.00', purpose: 'Clubhouse Electricity Bill Share' }
    ]
  },
  'finance_2025-12': {
    month: '2025-12',
    income: [
      { source: 'Maintenance', amount: '262256.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: 'TATA Play Rent' },
      { source: 'B Building', amount: '21402.00', remark: 'Common Light Bill Share' },
      { source: 'Shifting Charges', amount: '4000.00', remark: 'Flat No 504' },
      { source: 'Shop Maintenance', amount: '25700.00', remark: 'Shop No 07' }
    ],
    expenses: [
      { chequeNo: '', vendor: '3S Security Services', amount: '48050.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '39380.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '38998.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'Sanjay Gupta', amount: '33000.00', purpose: 'Tarrace Sheet Replacment' },
      { chequeNo: '', vendor: 'Balaji Chaudhary', amount: '30000.00', purpose: 'Accounting Charges 2023 to 2025' },
      { chequeNo: '', vendor: 'B Building', amount: '21607.00', purpose: 'Common Electricity Share' },
      { chequeNo: '', vendor: 'Bright IND PVT Ltd', amount: '17491.00', purpose: 'Bird Net charges' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'C Building', amount: '6257.00', purpose: 'DG Fuel Share' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'Shivshankar Chauhan', amount: '3766.00', purpose: 'Common Salary' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2832.00', purpose: 'Gardener Salary' },
      { chequeNo: '', vendor: 'Shahebaj Sefty Solution', amount: '1687.00', purpose: 'Fire Nosul Replacment' },
      { chequeNo: '', vendor: 'C Building', amount: '1453.00', purpose: 'DG Voltage Timer Replacment Share' },
      { chequeNo: '', vendor: 'B Building', amount: '1009.00', purpose: 'Clubhouse Electricity Share' }
    ]
  },
  'finance_2026-01': {
    month: '2026-01',
    income: [
      { source: 'Maintenance', amount: '267273.00', remark: '' },
      { source: 'Tata Play', amount: '3330.00', remark: 'TATA Play Rent' },
      { source: 'B Building', amount: '12327.00', remark: 'Boom Barrier Rent Share' },
      { source: 'B Building', amount: '6649.00', remark: 'Clubhouse Waterproofing Share' },
      { source: 'B Building', amount: '7510.00', remark: 'DG fuel Share' },
      { source: 'B Building', amount: '6234.00', remark: 'Kids Play Area Concrit slop work Share' },
      { source: 'C Building', amount: '3325.00', remark: 'Clubhouse Waterproofing Share' },
      { source: 'C Building', amount: '6164.00', remark: 'Boom Barrier Rent Share' },
      { source: 'C Building', amount: '3117.00', remark: 'Kids Play Area Concrit slop work Share' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'S3 Sports Enterprises', amount: '91994.00', purpose: 'Kids Play Area EPDM Work share' },
      { chequeNo: '', vendor: 'Schindler India Pvt. Ltd.', amount: '89019.00', purpose: '6 months Lift AMC Charges' },
      { chequeNo: '', vendor: '3S Security Services', amount: '45505.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '41278.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '39920.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: 'Parviom PVT Ltd.', amount: '29662.00', purpose: 'Boom Bairerar Rent' },
      { chequeNo: '', vendor: 'C Building', amount: '23893.00', purpose: 'Common Electricity Share' },
      { chequeNo: '', vendor: 'Balaji Chaudhary', amount: '20000.00', purpose: 'Pending Accounting Charges 2023 to 2025' },
      { chequeNo: '', vendor: 'Ghule Petrolium', amount: '18072.00', purpose: 'DG Fuel' },
      { chequeNo: '', vendor: 'C Building', amount: '16821.00', purpose: 'DG Servicing Share' },
      { chequeNo: '', vendor: 'DP Water Proofing', amount: '16000.00', purpose: 'Clubhouse Bathroom Waterproofing Charges' },
      { chequeNo: '', vendor: 'Tanaji Hande', amount: '15000.00', purpose: 'Kids Play Area Concrit slop work Charges' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Mehabub Shaikh', amount: '10500.00', purpose: 'Electricity Main Line Wire Repairing' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'Real Aqua', amount: '5100.00', purpose: 'A Building Tank Cleaning Charges' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '5007.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'Shivshankar Chauhan', amount: '3766.00', purpose: 'Common Guard salary' },
      { chequeNo: '', vendor: 'Real Aqua', amount: '3289.00', purpose: 'Common Tank Cleaning Charges' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardener Salary' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '1260.00', purpose: 'Clubhouse Electricity bill' },
      { chequeNo: '', vendor: 'C Building', amount: '444.00', purpose: 'Clubhouse Electricity Share' },
      { chequeNo: '', vendor: 'B building', amount: '5013.00', purpose: 'Kids Play Area PCC work Material Share' }
    ]
  },
  'finance_2026-02': {
    month: '2026-02',
    income: [
      { source: 'Maintenance', amount: '278996.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: '' },
      { source: 'Transfer Fees', amount: '25000.00', remark: 'Shop No 07' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'Rai Enterprises', amount: '47326.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '39860.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Swimming Pool charges' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2787.00', purpose: 'Gardener Salary' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '39090.00', purpose: 'A Building Electricity Bill Feb 26' },
      { chequeNo: '', vendor: 'C Building', amount: '16214.00', purpose: 'Speed Breaker Insttalation Share' },
      { chequeNo: '', vendor: 'B Building', amount: '4934.00', purpose: 'Fire pump repairing and Panel conrtactor Charges' },
      { chequeNo: '', vendor: 'B Building', amount: '618.00', purpose: 'Clubhouse Electricity Bill Feb 26' },
      { chequeNo: '', vendor: 'B Building', amount: '21196.00', purpose: 'Common Electricity Bill' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '35920.00', purpose: 'A Building Electricity Bill Mar 26' },
      { chequeNo: '', vendor: 'C Building', amount: '994.00', purpose: 'clubhouse Electricity Bill Mar 26' }
    ]
  },
  'finance_2026-03': {
    month: '2026-03',
    income: [
      { source: 'Maintenance', amount: '231611.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: 'TATA Play Rent' },
      { source: 'B Building', amount: '25105.00', remark: 'Common Electricity Share' },
      { source: 'B Building', amount: '6649.00', remark: 'Kids play area painting share' },
      { source: 'B Building', amount: '524.00', remark: 'Clubhouse Electricity Share' },
      { source: 'C Building', amount: '2711.00', remark: 'Mansi Electrical share' },
      { source: 'C Building', amount: '262.00', remark: 'Clubhouse Electricity Share' },
      { source: 'C Building', amount: '3325.00', remark: 'Kids play area painting share' },
      { source: 'C Building', amount: '3755.00', remark: 'Ghule Petrolium share' },
      { source: 'C Building', amount: '12553.00', remark: 'Common Electricity Share' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'Rai Enterprises', amount: '47326.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '40926.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '60410.00', purpose: 'Common Electricity Bill' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Swimming Pool charges' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardner Salary' },
      { chequeNo: '', vendor: 'Shree Swami Samarth', amount: '2486.00', purpose: 'Water Tanker Charges' },
      { chequeNo: '', vendor: 'Nagendra Kumar', amount: '16000.00', purpose: 'Kids Play Area Painting work' },
      { chequeNo: '', vendor: 'Hardik Mehta', amount: '18250.00', purpose: 'Builder Accounting and audit pending Payment' },
      { chequeNo: '', vendor: 'Mansi Electrical', amount: '13050.00', purpose: 'Fire pump repairing and Panel conrtactor Charges' },
      { chequeNo: '', vendor: 'Parmeshwar Pitale', amount: '3000.00', purpose: 'Plumbing Charges' }
    ]
  },
  'finance_2026-05': {
    month: '2026-05',
    income: [
      { source: 'Maintenance', amount: '242949.00', remark: '' },
      { source: 'Tata Play', amount: '5808.00', remark: 'Rent' },
      { source: 'Tata Play', amount: '116844.00', remark: 'Electricity Charges' },
      { source: 'Shifting', amount: '4000.00', remark: 'Flat No 105' },
      { source: 'B Building', amount: '4158.00', remark: 'Fire AMC Share' },
      { source: 'B Building', amount: '9558.00', remark: 'Clubhouse Penting Share' },
      { source: 'C building', amount: '6649.00', remark: 'Clubhouse Penting Share' },
      { source: 'B Building', amount: '2078.00', remark: 'Bird Net Share' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'MSEDCL', amount: '40520.00', purpose: 'A Building Electricity Bill Mar 26' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '35866.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'B Building', amount: '23211.00', purpose: 'Common Electricity Bill' },
      { chequeNo: '', vendor: 'Sidhram Kegare', amount: '23000.00', purpose: 'Clubhouse Penting' },
      { chequeNo: '', vendor: 'NRG security', amount: '17604.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Rai Enterprises', amount: '16690.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Ankush fire Safety', amount: '13600.00', purpose: 'Fire Extinguisher Rifiling' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'C Building', amount: '6806.00', purpose: 'DG Diesel Share' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '6080.00', purpose: 'Clubhouse Electricity bill' },
      { chequeNo: '', vendor: 'Shree Swami Samarth', amount: '6007.00', purpose: 'Water Tanker' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Swimming Pool charges and Swimming Pool Greting' },
      { chequeNo: '', vendor: 'Sanjay Gupta', amount: '4000.00', purpose: 'Parking Sheet Insttalation' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2787.00', purpose: 'Gardner Salary' },
      { chequeNo: '', vendor: 'B Building', amount: '1137.00', purpose: 'Clubhouse Electricity bill Share' }
    ]
  }
};

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreDoc(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) fields[key] = toFirestoreValue(val);
  }
  return { fields };
}

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken() {
  let token = null;
  try {
    token = execSync('gcloud auth print-access-token 2>/dev/null', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    console.log('Using gcloud access token ✓');
  } catch {
    console.log('gcloud not available, trying firebase-tools...');
    try {
      const configPath = process.env.HOME + '/.config/configstore/firebase-tools.json';
      const fs = await import('fs');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const tokens = config?.tokens;
      if (tokens?.refresh_token) {
        console.log('Found refresh token, obtaining fresh access token...');
        const bodyStr = new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
          client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
          refresh_token: tokens.refresh_token
        }).toString();

        const res = await httpsRequest({
          hostname: 'oauth2.googleapis.com',
          path: '/token',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(bodyStr)
          }
        }, bodyStr);

        if (res.status === 200) {
          const resObj = JSON.parse(res.body);
          token = resObj.access_token;
          console.log('Successfully refreshed access token ✓');
        } else {
          console.error('Failed to refresh access token:', res.status, res.body);
        }
      } else if (tokens?.access_token) {
        token = tokens.access_token;
        console.log('Using firebase-tools cached token ✓');
      }
    } catch (e) {
      console.error('Could not get access token:', e.message);
    }
  }
  return token;
}

async function seed() {
  const token = await getAccessToken();
  if (!token) {
    console.error('❌ No access token found. Please run: gcloud auth login OR firebase login');
    process.exit(1);
  }

  for (const [recordId, data] of Object.entries(financeData)) {
    const docBody = JSON.stringify(toFirestoreDoc(data));
    const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/financeMonthly/${recordId}`;

    const result = await httpsRequest({
      hostname: 'firestore.googleapis.com',
      path,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(docBody),
      }
    }, docBody);

    if (result.status === 200) {
      console.log(`  ✓ Written: ${recordId} — ${data.month}`);
    } else {
      console.error(`  ✗ Failed ${recordId}: ${result.status} — ${result.body.slice(0, 200)}`);
    }
  }

  console.log('\n✅ Seeding Done!');
}

seed().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
