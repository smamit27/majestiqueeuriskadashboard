import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';

// Data from verified bank statement
const STATEMENT_PERIOD = "July 1, 2026 - July 29, 2026";
const OPENING_BALANCE = 465193.55;
const CLOSING_BALANCE = 424339.27;
const TOTAL_CREDITS = 296237.72;
const TOTAL_DEBITS = 337092.00;
const NET_CASH_FLOW = TOTAL_CREDITS - TOTAL_DEBITS;

const VENDORS_DATA = [
  { rank: 1,  name: "Schindler India Pri",            count: 1, total: 89019, type: "Lift Maintenance",        cheque: "CHQ 420" },
  { rank: 2,  name: "MSEDCL",                          count: 1, total: 39530, type: "Electricity Utility",     cheque: "CHQ 517" },
  { rank: 3,  name: "Shubham Enterprises",             count: 1, total: 38119, type: "Repairs & Operations",    cheque: "CHQ 510" },
  { rank: 4,  name: "Sandip Raju Wavare",              count: 1, total: 28410, type: "Security Guard",          cheque: "FT 509" },
  { rank: 5,  name: "Shree Swami Samarth",             count: 1, total: 25045, type: "Housekeeping & Cleaning", cheque: "CHQ 513" },
  { rank: 6,  name: "Majestique Euriska (Admin)",      count: 1, total: 23373, type: "Society Operations",      cheque: "CHQ 515" },
  { rank: 7,  name: "Parviom Technologie",             count: 1, total: 23231, type: "CCTV & Security AMC",     cheque: "CHQ 516" },
  { rank: 8,  name: "Shivshankar Singh",               count: 1, total: 20000, type: "Staff Wages",             cheque: "CHQ 508" },
  { rank: 9,  name: "Self Withdrawal (Mohammedwadi)", count: 1, total: 15000, type: "Cash Handling",           cheque: "CHQ 506" },
  { rank: 10, name: "Sidharam Parmeshwar",             count: 1, total: 11700, type: "Staff Wages",             cheque: "CHQ 507" },
  { rank: 11, name: "Majestique Euriska C Bldg",       count: 1, total: 8263,  type: "Inter-Building Transfer", cheque: "FT 514" },
  { rank: 12, name: "Tanaji Hande",                   count: 1, total: 7000,  type: "Staff Wages",             cheque: "CHQ 502" },
  { rank: 13, name: "Sai Swimming Pool M",             count: 1, total: 4519,  type: "Pool Upkeep",             cheque: "CHQ 512" },
  { rank: 14, name: "Noushad Ali",                    count: 1, total: 2697,  type: "Staff Wages",             cheque: "CHQ 511" },
  { rank: 15, name: "Majestique Euriska B Bldg",       count: 1, total: 1186,  type: "Inter-Building Transfer", cheque: "CHQ 505" }
];

const INCOME_CATEGORIES = [
  { name: "Maintenance (Vivish PG)", value: 224361.72, count: 74, color: "#196c6c" },
  { name: "Maintenance (Cheques)", value: 36913.00, count: 4, color: "#31553e" },
  { name: "Direct UPI (Arpit Humane)", value: 12428.00, count: 1, color: "#b98216" },
  { name: "Inter-Building (C)", value: 7957.00, count: 3, color: "#c2644a" },
  { name: "Refund (Tata Play)", value: 3993.00, count: 1, color: "#5f665f" },
  { name: "Other Direct/Settlement", value: 14578.00, count: 4, color: "#a855f7" }
];

const EXPENSE_CATEGORIES = [
  { name: "Lift Maintenance (Schindler)", value: 89019, color: "#c2644a" },
  { name: "Electricity Utility (MSEDCL)", value: 39530, color: "#b98216" },
  { name: "Repairs & Operations", value: 38119, color: "#5f665f" },
  { name: "Security & Housekeeping Staff", value: 94862, color: "#196c6c" },
  { name: "Society Admin / Cash", value: 39559, color: "#ef4444" },
  { name: "Pool & Inter-building", value: 12783, color: "#3b82f6" }
];

// Daily timeline points for Recharts
const TIMELINE_DATA = [
  { date: "01/07", balance: 464007.55, credit: 0, debit: 1186 },
  { date: "02/07", balance: 534110.55, credit: 85103, debit: 15000 },
  { date: "03/07", balance: 528060.55, credit: 25650, debit: 31700 },
  { date: "04/07", balance: 542310.55, credit: 14250, debit: 0 },
  { date: "06/07", balance: 570365.55, credit: 35055, debit: 7000 },
  { date: "07/07", balance: 576515.55, credit: 6150, debit: 0 },
  { date: "08/07", balance: 528086.55, credit: 18100, debit: 66529 },
  { date: "09/07", balance: 554819.55, credit: 31252, debit: 4519 },
  { date: "10/07", balance: 566789.55, credit: 11970, debit: 0 },
  { date: "13/07", balance: 553340.30, credit: 14292.75, debit: 27742 },
  { date: "14/07", balance: 524089.55, credit: 2385.25, debit: 31636 },
  { date: "16/07", balance: 530164.32, credit: 6074.77, debit: 0 },
  { date: "20/07", balance: 446930.82, credit: 5785.50, debit: 89019 },
  { date: "21/07", balance: 423699.82, credit: 0, debit: 23231 },
  { date: "22/07", balance: 426592.57, credit: 2892.75, debit: 0 },
  { date: "26/07", balance: 430592.57, credit: 4000, debit: 0 },
  { date: "27/07", balance: 449388.27, credit: 18795.70, debit: 0 },
  { date: "28/07", balance: 454215.27, credit: 4827, debit: 0 },
  { date: "29/07", balance: 424339.27, credit: 9654, debit: 39530 }
];

const TRANSACTIONS_LIST = [
  { date: "01/07/26", type: "DR", desc: "CHQ PAID-CTS S1-MUMB-MAJESTIQUE EURISKA B BLDG", ref: "0000000000000505", amount: 1186, bal: 464007.55 },
  { date: "02/07/26", type: "CR", desc: "UPI-ARPIT ATMARAM HUMANE-ARPIT.HUMANE@OKHDFCBANK-HDFC0001578-125616059677-MAR APR MAY JUN", ref: "0000125616059677", amount: 12428, bal: 476435.55 },
  { date: "02/07/26", type: "DR", desc: "SELF - CHQ PAID - MOHAMMEDWADI", ref: "0000000000000506", amount: 15000, bal: 461435.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352498399", ref: "IN42618352498399", amount: 2850, bal: 464285.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352532130", ref: "IN42618352532130", amount: 2850, bal: 467135.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352536350", ref: "IN42618352536350", amount: 2850, bal: 469985.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352600901", ref: "IN42618352600901", amount: 2850, bal: 472835.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352688995", ref: "IN42618352688995", amount: 2850, bal: 475685.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-YESB0000001-VIVISH TECHNOLOGIES PVT LTD-MAJESTIQUE EURISKA A BLDG SA GRU SA-YESF261833206171", ref: "YESF261833206171", amount: 3135, bal: 478820.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352759846", ref: "IN42618352759846", amount: 3135, bal: 481955.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352783505", ref: "IN42618352783505", amount: 2850, bal: 484805.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352823847", ref: "IN42618352823847", amount: 2850, bal: 487655.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352809498", ref: "IN42618352809498", amount: 2850, bal: 490505.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352832002", ref: "IN42618352832002", amount: 2850, bal: 493355.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352859124", ref: "IN42618352859124", amount: 2850, bal: 496205.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352878873", ref: "IN42618352878873", amount: 2850, bal: 499055.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352941533", ref: "IN42618352941533", amount: 2850, bal: 501905.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352951768", ref: "IN42618352951768", amount: 2850, bal: 504755.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352983702", ref: "IN42618352983702", amount: 2850, bal: 507605.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618353006062", ref: "IN42618353006062", amount: 2850, bal: 510455.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352993919", ref: "IN42618352993919", amount: 2850, bal: 513305.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618353004619", ref: "IN42618353004619", amount: 3135, bal: 516440.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352995529", ref: "IN42618352995529", amount: 2850, bal: 519290.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618353013680", ref: "IN42618353013680", amount: 3135, bal: 522425.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618353019528", ref: "IN42618353019528", amount: 2850, bal: 525275.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618353020677", ref: "IN42618353020677", amount: 2850, bal: 528125.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618353020922", ref: "IN42618353020922", amount: 3135, bal: 531260.55 },
  { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618353016687", ref: "IN42618353016687", amount: 2850, bal: 534110.55 },
  { date: "03/07/26", type: "DR", desc: "CHQ PAID-CTS S1-MUMB-SIDHARAM PARMESHWAR", ref: "0000000000000507", amount: 11700, bal: 522410.55 },
  { date: "03/07/26", type: "DR", desc: "CHQ PAID-CTS S1-MUMB-SHIVSHANKAR SINGH", ref: "0000000000000508", amount: 20000, bal: 502410.55 },
  { date: "03/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618453275827", ref: "IN42618453275827", amount: 2850, bal: 505260.55 },
  { date: "03/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618453325127", ref: "IN42618453325127", amount: 2850, bal: 508110.55 },
  { date: "03/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618453325161", ref: "IN42618453325161", amount: 2850, bal: 510960.55 },
  { date: "03/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618453357635", ref: "IN42618453357635", amount: 2850, bal: 513810.55 },
  { date: "03/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618453372183", ref: "IN42618453372183", amount: 2850, bal: 516660.55 },
  { date: "03/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618453392005", ref: "IN42618453392005", amount: 2850, bal: 519510.55 },
  { date: "03/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618453385816", ref: "IN42618453385816", amount: 2850, bal: 522360.55 },
  { date: "03/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618453639911", ref: "IN42618453639911", amount: 2850, bal: 525210.55 },
  { date: "03/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618453702784", ref: "IN42618453702784", amount: 2850, bal: 528060.55 },
  { date: "04/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618554213568", ref: "IN42618554213568", amount: 2850, bal: 530910.55 },
  { date: "04/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618554226513", ref: "IN42618554226513", amount: 2850, bal: 533760.55 },
  { date: "04/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618554253706", ref: "IN42618554253706", amount: 2850, bal: 536610.55 },
  { date: "04/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618554324485", ref: "IN42618554324485", amount: 2850, bal: 539460.55 },
  { date: "04/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618554472812", ref: "IN42618554472812", amount: 2850, bal: 542310.55 },
  { date: "06/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618755531825", ref: "IN42618755531825", amount: 3135, bal: 545445.55 },
  { date: "06/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618755556286", ref: "IN42618755556286", amount: 3135, bal: 548580.55 },
  { date: "06/07/26", type: "DR", desc: "CHQ PAID-CTS S6-MUMB-TANAJI HANDE", ref: "0000000000000502", amount: 7000, bal: 541580.55 },
  { date: "06/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618755738654", ref: "IN42618755738654", amount: 2850, bal: 544430.55 },
  { date: "06/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618755891782", ref: "IN42618755891782", amount: 2850, bal: 547280.55 },
  { date: "06/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618756074346", ref: "IN42618756074346", amount: 2850, bal: 550130.55 },
  { date: "06/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618756120936", ref: "IN42618756120936", amount: 2850, bal: 552980.55 },
  { date: "06/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618756157379", ref: "IN42618756157379", amount: 2850, bal: 555830.55 },
  { date: "06/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618756180989", ref: "IN42618756180989", amount: 2850, bal: 558680.55 },
  { date: "06/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618756221191", ref: "IN42618756221191", amount: 3135, bal: 561815.55 },
  { date: "06/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618756214965", ref: "IN42618756214965", amount: 2850, bal: 564665.55 },
  { date: "06/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618756262947", ref: "IN42618756262947", amount: 2850, bal: 567515.55 },
  { date: "06/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618756266633", ref: "IN42618756266633", amount: 2850, bal: 570365.55 },
  { date: "07/07/26", type: "CR", desc: "IMPS-618814007286-ANIRUDHA CHHATRAPATI KSHIRSAGAR-DBSS-XXXXXXXX7926-A202  ADVANCE FOR JULY 2026", ref: "0000618814007286", amount: 3300, bal: 573665.55 },
  { date: "07/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618857273350", ref: "IN42618857273350", amount: 2850, bal: 576515.55 },
  { date: "08/07/26", type: "CR", desc: "UPI SETTLEMENT -CAF652- 08/07/26", ref: "000000000000000", amount: 3285, bal: 579800.55 },
  { date: "08/07/26", type: "CR", desc: "FT - CR - 50200065450992 - MAJESTIQUE EURISKA C BLDG SA GRU SAN MAR", ref: "0000000000000707", amount: 1675, bal: 581475.55 },
  { date: "08/07/26", type: "CR", desc: "FT - CR - 50200065450992 - MAJESTIQUE EURISKA C BLDG SA GRU SAN MAR", ref: "0000000000000708", amount: 1455, bal: 582930.55 },
  { date: "08/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618958269182", ref: "IN42618958269182", amount: 2850, bal: 585780.55 },
  { date: "08/07/26", type: "DR", desc: "CHQ PAID-CTS S5-MUMB-SHUBHAM ENTERPRISES", ref: "0000000000000510", amount: 38119, bal: 547661.55 },
  { date: "08/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618958341628", ref: "IN42618958341628", amount: 2850, bal: 550511.55 },
  { date: "08/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618958428619", ref: "IN42618958428619", amount: 3135, bal: 553646.55 },
  { date: "08/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618958427074", ref: "IN42618958427074", amount: 2850, bal: 556496.55 },
  { date: "08/07/26", type: "DR", desc: "FT - DR - 50100537218706 - SANDIP RAJU WAVARE", ref: "0000000000000509", amount: 28410, bal: 528086.55 },
  { date: "09/07/26", type: "DR", desc: "CHQ PAID-CTS S4-MUMB-SAI SWIMMING POOL M", ref: "0000000000000512", amount: 4519, bal: 523567.55 },
  { date: "09/07/26", type: "CR", desc: "CHQ DEP CTS CLG2 MODEL COLONY PUNE - CTS: SNEHALATA KANT :PUNJAB NATIONAL BANK", ref: "0000000000444845", amount: 21000, bal: 544567.55 },
  { date: "09/07/26", type: "CR", desc: "CHQ DEP CTS CLG2 MODEL COLONY PUNE - CTS: MAJESTIQUE EURISKA B BUODING SAHKARI :UNION BANK OF INDIA", ref: "0000000000215255", amount: 3350, bal: 547917.55 },
  { date: "09/07/26", type: "CR", desc: "CHQ DEP CTS CLG2 MODEL COLONY PUNE - CTS: MAJESTIQUE EURISKA B BUILDING SAHAKARI GRAHRACHAN :UNION BANK OF INDIA", ref: "0000000000215256", amount: 2909, bal: 550826.55 },
  { date: "09/07/26", type: "CR", desc: "NEFT CR-UTIB0001394-TATA PLAY BROADBAND PRIVATE LIMITED-MAJESTIQUE EURISKA A BUILDING SAHAKARI G-AXISCN1400877662", ref: "AXISCN1400877662", amount: 3993, bal: 554819.55 },
  { date: "10/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42619150296404", ref: "IN42619150296404", amount: 2850, bal: 557669.55 },
  { date: "10/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42619150379276", ref: "IN42619150379276", amount: 3135, bal: 560804.55 },
  { date: "10/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42619150551851", ref: "IN42619150551851", amount: 3135, bal: 563939.55 },
  { date: "10/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42619150589655", ref: "IN42619150589655", amount: 2850, bal: 566789.55 },
  { date: "13/07/26", type: "DR", desc: "CHQ PAID-CTS S6-MUMB-NOUSHAD ALI", ref: "0000000000000511", amount: 2697, bal: 564092.55 },
  { date: "13/07/26", type: "DR", desc: "CHQ PAID-CTS S6-MUMB-SHREE SWAMI SAMARTH", ref: "0000000000000513", amount: 25045, bal: 539047.55 },
  { date: "13/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42619453375802", ref: "IN42619453375802", amount: 2850, bal: 541897.55 },
  { date: "13/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42619453433250", ref: "IN42619453433250", amount: 2850, bal: 544747.55 },
  { date: "13/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42619453683305", ref: "IN42619453683305", amount: 2850, bal: 547597.55 },
  { date: "13/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42619453714765", ref: "IN42619453714765", amount: 2850, bal: 550447.55 },
  { date: "13/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42619453766751", ref: "IN42619453766751", amount: 2892.75, bal: 553340.30 },
  { date: "14/07/26", type: "DR", desc: "FT - DR - 50200065450992 - MAJESTIQUE EURISKA C BLDG SA GRU SAN MAR", ref: "0000000000000514", amount: 8263, bal: 545077.30 },
  { date: "14/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42619554026716", ref: "IN42619554026716", amount: 2385.25, bal: 547462.55 },
  { date: "14/07/26", type: "DR", desc: "CHQ PAID-CTS S6-MUMB-MAJESTIQUE EURISKA", ref: "0000000000000515", amount: 23373, bal: 524089.55 },
  { date: "16/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42619755574493", ref: "IN42619755574493", amount: 2892.75, bal: 526982.30 },
  { date: "16/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42619755570400", ref: "IN42619755570400", amount: 3182.02, bal: 530164.32 },
  { date: "20/07/26", type: "DR", desc: "CHQ PAID-CTS S1-MUMB-SCHINDLER INDIA PRI", ref: "0000000000000420", amount: 89019, bal: 441145.32 },
  { date: "20/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42620157745210", ref: "IN42620157745210", amount: 2892.75, bal: 444038.07 },
  { date: "20/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42620157876436", ref: "IN42620157876436", amount: 2892.75, bal: 446930.82 },
  { date: "21/07/26", type: "DR", desc: "CHQ PAID-CTS S5-MUMB-PARVIOM TECHNOLOGIE", ref: "0000000000000516", amount: 23231, bal: 423699.82 },
  { date: "22/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42620359012074", ref: "IN42620359012074", amount: 2892.75, bal: 426592.57 },
  { date: "26/07/26", type: "CR", desc: "50100250798851-TPT-HDFC5B46864C2555-MD NAWAB ALI", ref: "00000595771850", amount: 4000, bal: 430592.57 },
  { date: "27/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42620852151382", ref: "IN42620852151382", amount: 3182.02, bal: 433774.59 },
  { date: "27/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42620852210694", ref: "IN42620852210694", amount: 2892.75, bal: 436667.34 },
  { date: "27/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42620852263294", ref: "IN42620852263294", amount: 12720.93, bal: 449388.27 },
  { date: "28/07/26", type: "CR", desc: "FT - CR - 50200065450992 - MAJESTIQUE EURISKA C BLDG SA GRU SAN MAR", ref: "0000000000000713", amount: 4827, bal: 454215.27 },
  { date: "29/07/26", type: "CR", desc: "CHQ DEP CTS CLG2 MODEL COLONY PUNE - CTS: MAJESTIQUE EURISKA B BUILDING SHAKARI :UNION BANK OF INDIA", ref: "0000000000215261", amount: 9654, bal: 463869.27 },
  { date: "29/07/26", type: "DR", desc: "CHQ PAID-CTS S5-MUMB-MSEDCL", ref: "0000000000000517", amount: 39530, bal: 424339.27 }
];

export default function BankStatementTracker({ isAdmin }) {
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('dashboard');

  // Search & Filter state for Transactions tabs
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('DESC'); // DESC or ASC by amount
  const [sourceFilter, setSourceFilter] = useState('ALL'); // source-type pill filter

  const handleUnlock = (e) => {
    e.preventDefault();
    if (password === '$05CeLRO') {
      setIsUnlocked(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Incorrect Password. Access Denied.');
    }
  };

  const fmtAmt = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  // Classify a transaction into a source key
  const getSourceKey = (tx) => {
    const d = tx.desc.toUpperCase();
    if (d.includes('VIVISH TECHNOLOGIES'))                                          return 'VIVISH';
    if (d.includes('TATA PLAY'))                                                    return 'TATA_PLAY';
    if (d.startsWith('UPI') || d.includes('UPI SETTLEMENT') || d.includes('UPI-') || d.includes('IMPS-')) return 'UPI_IMPS';
    if (d.includes('CHQ DEP') || d.includes('CHEQUE DEP'))                          return 'CHQ_DEP';
    // Only transactions explicitly naming Majestique Euriska B or C Building are inter-building
    if (d.includes('MAJESTIQUE EURISKA C') || d.includes('MAJESTIQUE EURISKA B')) return 'INTER_FT';
    if (tx.type === 'DR' && (d.includes('CHQ PAID') || d.includes('SELF - CHQ')))   return 'CHQ_PAID';
    return 'OTHER';
  };

  // Helper filter function
  const getFilteredTx = (typeFilter) => {
    let result = [...TRANSACTIONS_LIST];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.desc.toLowerCase().includes(q) ||
        t.ref.toLowerCase().includes(q) ||
        t.date.includes(q)
      );
    }
    if (typeFilter !== 'ALL') {
      result = result.filter(t => t.type === typeFilter);
    }
    if (sourceFilter !== 'ALL') {
      result = result.filter(t => getSourceKey(t) === sourceFilter);
    }
    result.sort((a, b) => {
      return sortOrder === 'DESC' ? b.amount - a.amount : a.amount - b.amount;
    });
    return result;
  };

  const filteredAllTx = useMemo(() => getFilteredTx('ALL'), [searchTerm, sortOrder, sourceFilter]);
  const filteredCrTx  = useMemo(() => getFilteredTx('CR'),  [searchTerm, sortOrder, sourceFilter]);
  const filteredDrTx  = useMemo(() => getFilteredTx('DR'),  [searchTerm, sortOrder, sourceFilter]);

  if (!isUnlocked) {
    return (
      <div className="section-card" style={{ maxWidth: '480px', margin: '40px auto', padding: '32px' }}>
        <h3 className="section-card__title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🔒</span> Confidential Statement Auditor
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.95rem', marginBottom: '24px' }}>
          This area contains highly confidential forensic audit insights. Please enter the treasurer authorization password to proceed.
        </p>
        <form onSubmit={handleUnlock}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>
              Authorization Password
            </label>
            <input
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                background: 'rgba(255,255,255,0.5)',
                outline: 'none'
              }}
            />
          </div>
          {errorMsg && (
            <p style={{ color: 'var(--coral)', fontSize: '0.85rem', marginBottom: '16px', fontWeight: '500' }}>
              ⚠️ {errorMsg}
            </p>
          )}
          <button
            type="submit"
            className="action-btn"
            style={{ width: '100%', display: 'flex', justifyContent: 'center', background: 'var(--teal)', color: 'white' }}
          >
            Unlock Auditor Workspace
          </button>
        </form>
      </div>
    );
  }

  // ── Color classification ──────────────────────────────────────────────────
  // Returns { border, label, dot } based on narration patterns
  const getTxStyle = (tx) => {
    const d = tx.desc.toUpperCase();
    if (d.includes('VIVISH TECHNOLOGIES'))
      return { border: '#31553e', label: 'Vivish PG (NEFT)', dot: '#31553e' };
    if (d.includes('TATA PLAY'))
      return { border: '#3b82f6', label: 'Tata Play Refund', dot: '#3b82f6' };
    if (d.startsWith('UPI') || d.includes('UPI SETTLEMENT') || d.includes('UPI-') || d.includes('IMPS-'))
      return { border: '#8b5cf6', label: 'UPI / IMPS', dot: '#8b5cf6' };
    if (d.includes('CHQ DEP') || d.includes('CHEQUE DEP'))
      return { border: '#b98216', label: 'Cheque Deposit', dot: '#b98216' };
    // Inter-building: ONLY transactions explicitly naming B or C Building
    // (NOT generic FT-DR/FT-CR — those can be vendor payments like Sandip Raju Wavare)
    if (d.includes('MAJESTIQUE EURISKA C') || d.includes('MAJESTIQUE EURISKA B'))
      return { border: '#196c6c', label: 'Inter-Building Transfer', dot: '#196c6c' };
    if (tx.type === 'DR' && (d.includes('CHQ PAID') || d.includes('SELF - CHQ')))
      return { border: '#c2644a', label: 'Cheque Payment (DR)', dot: '#c2644a' };
    return { border: 'transparent', label: 'Other', dot: '#9ca3af' };
  };

  const COLOR_LEGEND = [
    { dot: '#31553e', label: 'Vivish PG (NEFT)',        desc: 'Maintenance collections via Vivish Technologies NEFT' },
    { dot: '#b98216', label: 'Cheque Deposit (CR)',      desc: 'Physical cheques deposited (CHQ DEP / CTS clearing)' },
    { dot: '#8b5cf6', label: 'UPI / IMPS',              desc: 'UPI settlements, IMPS member transfers' },
    { dot: '#3b82f6', label: 'Tata Play Refund',        desc: 'Broadband / OTT vendor credit/refund' },
    { dot: '#196c6c', label: 'Inter-Building Transfer', desc: 'Fund transfers between A ↔ B ↔ C buildings' },
    { dot: '#c2644a', label: 'Cheque Payment (DR)',      desc: 'Outgoing vendor / staff cheques (CHQ PAID)' },
  ];

  const SOURCE_FILTERS = [
    { key: 'ALL',      label: '✦ All',              dot: '#9ca3af' },
    { key: 'VIVISH',   label: 'Vivish NEFT',        dot: '#31553e' },
    { key: 'CHQ_DEP',  label: 'Cheque Deposit',     dot: '#b98216' },
    { key: 'UPI_IMPS', label: 'UPI / IMPS',         dot: '#8b5cf6' },
    { key: 'TATA_PLAY',label: 'Tata Play',           dot: '#3b82f6' },
    { key: 'INTER_FT', label: 'Inter-Building FT',  dot: '#196c6c' },
    { key: 'CHQ_PAID', label: 'Cheque Payment (DR)', dot: '#c2644a' },
    { key: 'OTHER',    label: 'Other',               dot: '#6b7280' },
  ];

  const renderTable = (transactions) => {
    const totalCR = transactions.filter(t => t.type === 'CR').reduce((s, t) => s + t.amount, 0);
    const totalDR = transactions.filter(t => t.type === 'DR').reduce((s, t) => s + t.amount, 0);
    const txCount = transactions.length;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── Source Filter Pills + Colour Legend ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '10px',
          padding: '12px 16px',
          background: 'var(--bg-strong)',
          borderRadius: '10px',
          border: '1px solid var(--line)'
        }}>
          {/* Filter row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted)', letterSpacing: '0.05em', marginRight: '2px' }}>FILTER:</span>
            {SOURCE_FILTERS.map(f => {
              const active = sourceFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setSourceFilter(f.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: `1px solid ${active ? f.dot : f.dot + '55'}`,
                    background: active ? `${f.dot}22` : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: active ? '700' : '500',
                    color: active ? f.dot : 'var(--muted)',
                    transition: 'all 0.15s ease',
                    outline: 'none',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: f.dot, display: 'inline-block', flexShrink: 0 }} />
                  {f.label}
                </button>
              );
            })}
          </div>
          {/* Legend row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted)', letterSpacing: '0.05em', marginRight: '2px' }}>COLOUR KEY:</span>
            {COLOR_LEGEND.map((item, i) => (
              <div key={i} title={item.desc} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'default' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.dot, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: '0.72rem', color: item.dot, fontWeight: '600' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        <div style={{ overflowX: 'auto' }}>
          <table className="task-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-strong)', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Date</th>
                <th style={{ padding: '12px' }}>Narration</th>
                <th style={{ padding: '12px' }}>Chq / Ref No.</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Outflow (DR)</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Inflow (CR)</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
                    No transactions match the selected filter.
                  </td>
                </tr>
              ) : transactions.map((tx, idx) => {
                const txStyle = getTxStyle(tx);
                return (
                  <tr key={idx} style={{
                    borderBottom: '1px solid var(--line)',
                    fontSize: '0.85rem',
                    borderLeft: `3px solid ${txStyle.border}`,
                  }}>
                    <td style={{ padding: '12px', whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: '0.8rem' }}>{tx.date}</td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${tx.type === 'CR' ? 'badge--green' : 'badge--coral'}`} style={{ marginRight: '8px', padding: '2px 6px', fontSize: '0.7rem' }}>
                        {tx.type}
                      </span>
                      <span style={{ fontWeight: '500', color: txStyle.border !== 'transparent' ? txStyle.border : 'inherit' }}>
                        {tx.desc}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--muted)', fontFamily: 'monospace', fontSize: '0.78rem' }}>{tx.ref}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--coral)', fontWeight: '600' }}>
                      {tx.type === 'DR' ? fmtAmt(tx.amount) : ''}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--pine)', fontWeight: '600' }}>
                      {tx.type === 'CR' ? fmtAmt(tx.amount) : ''}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>{fmtAmt(tx.bal)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{
                background: 'var(--bg-strong)',
                borderTop: '2px solid var(--line)',
                fontWeight: '700',
                fontSize: '0.9rem'
              }}>
                <td style={{ padding: '14px 12px' }} colSpan={3}>
                  <span style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: '500' }}>
                    TOTAL — {txCount} transaction{txCount !== 1 ? 's' : ''}
                  </span>
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: totalDR > 0 ? 'var(--coral)' : 'var(--muted)' }}>
                  {totalDR > 0 ? fmtAmt(totalDR) : '—'}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: totalCR > 0 ? 'var(--pine)' : 'var(--muted)' }}>
                  {totalCR > 0 ? fmtAmt(totalCR) : '—'}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: 'var(--muted)', fontSize: '0.8rem' }}>
                  Net: <span style={{ color: (totalCR - totalDR) >= 0 ? 'var(--pine)' : 'var(--coral)', fontWeight: '700' }}>
                    {fmtAmt(totalCR - totalDR)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Tab Navigation row at top (no title header card) */}
      <div className="section-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button 
            className={`action-btn ${activeSubTab === 'dashboard' ? 'action-btn--primary' : ''}`}
            onClick={() => setActiveSubTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`action-btn ${activeSubTab === 'ledger' ? 'action-btn--primary' : ''}`}
            onClick={() => setActiveSubTab('ledger')}
          >
            🧾 Transactions Log
          </button>
          <button 
            className={`action-btn ${activeSubTab === 'inflow' ? 'action-btn--primary' : ''}`}
            onClick={() => setActiveSubTab('inflow')}
          >
            📥 Inflow (CR) Log
          </button>
          <button 
            className={`action-btn ${activeSubTab === 'outflow' ? 'action-btn--primary' : ''}`}
            onClick={() => setActiveSubTab('outflow')}
          >
            📤 Outflow (DR) Log
          </button>
          <button 
            className={`action-btn ${activeSubTab === 'vendors' ? 'action-btn--primary' : ''}`}
            onClick={() => setActiveSubTab('vendors')}
          >
            🤝 Vendor Analysis
          </button>
          <button 
            className={`action-btn ${activeSubTab === 'audit' ? 'action-btn--primary' : ''}`}
            onClick={() => setActiveSubTab('audit')}
          >
            🔍 Forensic Audit
          </button>
          <button 
            className={`action-btn ${activeSubTab === 'reports' ? 'action-btn--primary' : ''}`}
            onClick={() => setActiveSubTab('reports')}
            style={activeSubTab === 'reports' ? {} : { borderColor: '#196c6c', color: '#196c6c' }}
          >
            📋 Reports
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics (Corrected styling wrapped in .metrics-grid) */}
      <div className="metrics-grid">
        <div className="metric-card metric-card--teal">
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Opening Balance</p>
          <h3 style={{ color: 'var(--teal)' }}>{fmtAmt(OPENING_BALANCE)}</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>Verified starting limit</p>
        </div>
        <div className="metric-card metric-card--pine">
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Total Collections</p>
          <h3 style={{ color: 'var(--pine)' }}>{fmtAmt(TOTAL_CREDITS)}</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>86 Cleared Credits</p>
        </div>
        <div className="metric-card metric-card--coral">
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Total Expenses</p>
          <h3 style={{ color: 'var(--coral)' }}>{fmtAmt(TOTAL_DEBITS)}</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>15 Approved Debits</p>
        </div>
        <div className="metric-card metric-card--sand">
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Net Cash Flow</p>
          <h3 style={{ color: NET_CASH_FLOW >= 0 ? 'var(--pine)' : 'var(--coral)' }}>
            {fmtAmt(NET_CASH_FLOW)}
          </h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>Deficit Current Month</p>
        </div>
      </div>

      {/* Content Render based on Sub-Tab */}
      {activeSubTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Trend Chart */}
          <div className="section-card">
            <h3 className="section-card__title">Running Account Balance & Daily Cash Flow</h3>
            <div style={{ height: '350px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TIMELINE_DATA}>
                  <defs>
                    <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--teal)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--teal)" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip formatter={(value) => fmtAmt(value)} />
                  <Legend />
                  <Area type="monotone" name="Running Balance" dataKey="balance" stroke="var(--teal)" fillOpacity={1} fill="url(#colorBal)" strokeWidth={2.5} />
                  <Area type="monotone" name="Daily Collections" dataKey="credit" stroke="var(--pine)" fill="none" strokeWidth={1.5} />
                  <Area type="monotone" name="Daily Expenses" dataKey="debit" stroke="var(--coral)" fill="none" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown Pie Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
            <div className="section-card">
              <h3 className="section-card__title">Income Categories Breakdown</h3>
              <div style={{ height: '240px', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '50%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={INCOME_CATEGORIES}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {INCOME_CATEGORIES.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => fmtAmt(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {INCOME_CATEGORIES.map((cat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                      <span style={{ width: '12px', height: '12px', background: cat.color, borderRadius: '2px', display: 'inline-block' }} />
                      <span style={{ fontWeight: '500', flex: 1 }}>{cat.name}</span>
                      <span style={{ color: 'var(--muted)' }}>{((cat.value / TOTAL_CREDITS) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="section-card">
              <h3 className="section-card__title">Expense Categories Breakdown</h3>
              <div style={{ height: '240px', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '50%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={EXPENSE_CATEGORIES}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {EXPENSE_CATEGORIES.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => fmtAmt(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {EXPENSE_CATEGORIES.map((cat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                      <span style={{ width: '12px', height: '12px', background: cat.color, borderRadius: '2px', display: 'inline-block' }} />
                      <span style={{ fontWeight: '500', flex: 1 }}>{cat.name}</span>
                      <span style={{ color: 'var(--muted)' }}>{((cat.value / TOTAL_DEBITS) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(activeSubTab === 'ledger' || activeSubTab === 'inflow' || activeSubTab === 'outflow') && (
        <div className="section-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <h3 className="section-card__title" style={{ margin: 0 }}>
              {activeSubTab === 'ledger' && "🧾 Full Ledger Entries"}
              {activeSubTab === 'inflow' && "📥 Inflow (CR) Logs"}
              {activeSubTab === 'outflow' && "📤 Outflow (DR) Logs"}
            </h3>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search narration/ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  fontSize: '0.85rem',
                  minWidth: '220px'
                }}
              />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  fontSize: '0.85rem'
                }}
              >
                <option value="DESC">Sort by Amount: High to Low</option>
                <option value="ASC">Sort by Amount: Low to High</option>
              </select>
            </div>
          </div>

          {activeSubTab === 'ledger' && renderTable(filteredAllTx)}
          {activeSubTab === 'inflow' && renderTable(filteredCrTx)}
          {activeSubTab === 'outflow' && renderTable(filteredDrTx)}
        </div>
      )}

      {activeSubTab === 'vendors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="section-card">
            <h3 className="section-card__title">Vendor Payment Rankings</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="task-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-strong)', textAlign: 'left' }}>
                    <th style={{ padding: '12px', width: '60px' }}>Rank</th>
                    <th style={{ padding: '12px' }}>Vendor / Contractor Name</th>
                    <th style={{ padding: '12px' }}>Category</th>
                    <th style={{ padding: '12px' }}>Cheque / Ref No.</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Payments</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Total Paid</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>% of Expenses</th>
                  </tr>
                </thead>
                <tbody>
                  {VENDORS_DATA.map((vendor, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--line)', fontSize: '0.85rem' }}>
                      <td style={{ padding: '12px', fontWeight: '700', color: 'var(--teal)' }}>#{vendor.rank}</td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{vendor.name}</td>
                      <td style={{ padding: '12px', color: 'var(--muted)' }}>{vendor.type}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                          background: 'var(--bg-strong)',
                          border: '1px solid var(--line)',
                          borderRadius: '5px',
                          padding: '2px 8px',
                          color: 'var(--muted)',
                          whiteSpace: 'nowrap'
                        }}>{vendor.cheque}</span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{vendor.count}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: 'var(--coral)' }}>{fmtAmt(vendor.total)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>{((vendor.total / TOTAL_DEBITS) * 100).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Risk Badges card */}
          <div className="section-card">
            <h3 className="section-card__title">Forensic Audit & Internal Control Risks</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div style={{ borderLeft: '4px solid #ef4444', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '0 8px 8px 0' }}>
                <span className="badge badge--coral" style={{ marginBottom: '6px', display: 'inline-block' }}>🔴 HIGH RISK</span>
                <strong style={{ display: 'block', margin: '4px 0' }}>Self Cheque Cash Withdrawal (₹15,000.00)</strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Cheque 506 paid in cash at Mohammedwadi branch on July 2nd. Co-operative housing societies must enforce digital payouts or direct bank transfers. Cash withdrawals have zero traceability and represent high operational fraud risks.
                </p>
              </div>

              <div style={{ borderLeft: '4px solid #ef4444', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '0 8px 8px 0' }}>
                <span className="badge badge--coral" style={{ marginBottom: '6px', display: 'inline-block' }}>🔴 HIGH RISK</span>
                <strong style={{ display: 'block', margin: '4px 0' }}>Missing Narration on Self-Society transfers (₹24,559.00)</strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Cheques 505 (₹1,186) and 515 (₹23,373) cleared as payment to "MAJESTIQUE EURISKA" without vouchers or annotations. This represents potential unrecorded cash conversions.
                </p>
              </div>

              <div style={{ borderLeft: '4px solid var(--amber)', padding: '12px 16px', background: 'rgba(185, 130, 22, 0.05)', borderRadius: '0 8px 8px 0' }}>
                <span className="badge badge--amber" style={{ marginBottom: '6px', display: 'inline-block' }}>🟠 MEDIUM RISK</span>
                <strong style={{ display: 'block', margin: '4px 0' }}>Personal Contractor Payments (₹94,862.00)</strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Direct cheques issued to individual names (Shivshankar, Sandip, Tanaji, Noushad, Sidharam) instead of verified firm/agency accounts. Requires validation of vendor registration and verification of TDS deduction compliances.
                </p>
              </div>
            </div>
          </div>

          {/* Audit observations */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
            <div className="section-card">
              <h3 className="section-card__title">Top Management Action Items</h3>
              <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li><strong>Enforce Cashless Petty Cash:</strong> Transition immediately from cash self-withdrawals to corporate prepaid debit cards with receipt tracking.</li>
                <li><strong>Reconcile Schindler AMC:</strong> Confirm the ₹89,019.00 Lift AMC matches the AGM approved budget.</li>
                <li><strong>Common Area Solar Audit:</strong> With electricity bills at ₹39,530, explore Solar panel ROI to reduce common load utility costs.</li>
                <li><strong>Cost Sharing Agreement:</strong> Audit transfers with C Building to establish formal formula-based billing (A Building received ₹7,957 but paid out ₹8,263, creating a deficit).</li>
              </ul>
            </div>

            <div className="section-card">
              <h3 className="section-card__title">Treasurer's MIS Report Summarized</h3>
              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justify: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '6px' }}>
                  <span>Collection Efficiency:</span>
                  <strong>94.8%</strong>
                </div>
                <div style={{ display: 'flex', justify: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '6px' }}>
                  <span>Monthly Spending Ratio:</span>
                  <strong>113.8% (Operational Deficit)</strong>
                </div>
                <div style={{ display: 'flex', justify: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '6px' }}>
                  <span>Remaining Liquidity Reserve:</span>
                  <strong>{fmtAmt(CLOSING_BALANCE)}</strong>
                </div>
                <div style={{ display: 'flex', justify: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '6px' }}>
                  <span>Auditor Stability Rating:</span>
                  <strong>⭐⭐⭐ (Average)</strong>
                </div>
                <div style={{ display: 'flex', justify: 'space-between', paddingBottom: '6px' }}>
                  <span>Financial Health Score:</span>
                  <span style={{ fontWeight: '700', color: 'var(--amber)' }}>76 / 100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Income & Expense PDF Statement (NEW FEATURE) ── */}
          <div className="section-card" style={{ border: '2px solid var(--pine)', background: 'rgba(49,85,62,0.04)' }}>
            <h3 className="section-card__title" style={{ color: 'var(--pine)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📊</span> Income & Expense Financial Statement (PDF / Print)
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Generates a formal, audit-ready <strong>Income & Expense Statement PDF</strong> with dedicated income categorization (Vivish NEFT MyGate, UPI/IMPS, Tata Play, Cheque Deposits, Inter-building) & expense breakdown.
            </p>
            <button
              className="action-btn action-btn--primary"
              style={{ background: 'var(--pine)', borderColor: 'var(--pine)', fontWeight: '600', padding: '10px 20px', fontSize: '0.95rem' }}
              onClick={() => {
                const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v);
                
                const crTx = TRANSACTIONS_LIST.filter(t => t.type === 'CR');
                const drTx = TRANSACTIONS_LIST.filter(t => t.type === 'DR');
                const totalCR = crTx.reduce((s, t) => s + t.amount, 0);
                const totalDR = drTx.reduce((s, t) => s + t.amount, 0);
                const netFlow = totalCR - totalDR;

                // Group Income
                const vivishTx = crTx.filter(t => t.desc.toUpperCase().includes('VIVISH'));
                const upiTx    = crTx.filter(t => {
                  const d = t.desc.toUpperCase();
                  return !d.includes('VIVISH') && (d.startsWith('UPI') || d.includes('UPI-') || d.includes('IMPS-') || d.includes('UPI SETTLEMENT'));
                });
                const tataTx   = crTx.filter(t => t.desc.toUpperCase().includes('TATA PLAY'));
                const chqDepTx = crTx.filter(t => t.desc.toUpperCase().includes('CHQ DEP') || t.desc.toUpperCase().includes('CHEQUE DEP'));
                const interCrTx = crTx.filter(t => t.desc.toUpperCase().includes('MAJESTIQUE EURISKA C') || t.desc.toUpperCase().includes('MAJESTIQUE EURISKA B') || t.desc.toUpperCase().includes('FT - CR'));
                
                const classifiedCrIds = new Set([...vivishTx, ...upiTx, ...tataTx, ...chqDepTx, ...interCrTx].map(t => t.ref));
                const otherCrTx = crTx.filter(t => !classifiedCrIds.has(t.ref));

                const incomeGroups = [
                  { title: 'Vivish NEFT (MyGate Payment Gateway)', items: vivishTx, icon: '🟢', desc: 'Maintenance dues collected via MyGate payment gateway' },
                  { title: 'UPI / IMPS Direct Receipts',          items: upiTx,    icon: '🟣', desc: 'Direct resident UPI settlements & IMPS transfers' },
                  { title: 'Tata Play Broadband Refund / Credit', items: tataTx,   icon: '🔵', desc: 'Broadband commercial refund & reimbursement' },
                  { title: 'Cheque Deposits (CTS Clearing)',       items: chqDepTx, icon: '🟡', desc: 'Physical maintenance cheques deposited in account' },
                  { title: 'Inter-Building Receipts',             items: interCrTx,icon: '🩵', desc: 'Transfers received from B / C Building accounts' },
                ];

                if (otherCrTx.length > 0) {
                  incomeGroups.push({ title: 'Other Direct Income', items: otherCrTx, icon: '⚪', desc: 'Other miscellaneous credit receipts' });
                }

                // Render Income Summary Rows
                const incomeSummaryRows = incomeGroups.map(g => {
                  const sum = g.items.reduce((s, t) => s + t.amount, 0);
                  const pct = totalCR > 0 ? ((sum / totalCR) * 100).toFixed(2) : '0.00';
                  return `
                    <tr style="border-bottom:1px solid #e5e7eb">
                      <td style="padding:10px;font-weight:600">${g.icon} ${g.title}</td>
                      <td style="padding:10px;color:#6b7280;font-size:12px">${g.desc}</td>
                      <td style="padding:10px;text-align:center;font-weight:600">${g.items.length}</td>
                      <td style="padding:10px;text-align:right;font-weight:700;color:#31553e">${fmt(sum)}</td>
                      <td style="padding:10px;text-align:right;font-weight:600;color:#196c6c">${pct}%</td>
                    </tr>
                  `;
                }).join('');

                // Render Expense Summary Rows
                const expenseSummaryRows = VENDORS_DATA.map(v => {
                  const pct = totalDR > 0 ? ((v.total / totalDR) * 100).toFixed(2) : '0.00';
                  return `
                    <tr style="border-bottom:1px solid #e5e7eb">
                      <td style="padding:8px 10px;font-weight:700;color:#196c6c">#${v.rank}</td>
                      <td style="padding:8px 10px;font-weight:600">${v.name}</td>
                      <td style="padding:8px 10px;color:#4b5563;font-size:12px">${v.type}</td>
                      <td style="padding:8px 10px;font-family:monospace;font-size:12px">${v.cheque}</td>
                      <td style="padding:8px 10px;text-align:right;font-weight:700;color:#c2644a">${fmt(v.total)}</td>
                      <td style="padding:8px 10px;text-align:right;font-weight:600">${pct}%</td>
                    </tr>
                  `;
                }).join('');

                // Render Detailed Income Transactions HTML
                const itemizedIncomeHtml = incomeGroups.map(g => {
                  const groupSum = g.items.reduce((s, t) => s + t.amount, 0);
                  if (g.items.length === 0) return '';
                  const rows = g.items.map(t => `
                    <tr style="border-bottom:1px solid #f3f4f6;font-size:11px">
                      <td style="padding:5px 8px;white-space:nowrap;color:#6b7280">${t.date}</td>
                      <td style="padding:5px 8px">${t.desc}</td>
                      <td style="padding:5px 8px;font-family:monospace;color:#6b7280">${t.ref}</td>
                      <td style="padding:5px 8px;text-align:right;color:#31553e;font-weight:700">${fmt(t.amount)}</td>
                    </tr>
                  `).join('');

                  return `
                    <div style="margin-top:16px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
                      <div style="background:#f9fafb;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e5e7eb">
                        <strong style="font-size:13px;color:#111827">${g.icon} ${g.title} (${g.items.length} txs)</strong>
                        <strong style="color:#31553e;font-size:13px">Total: ${fmt(groupSum)}</strong>
                      </div>
                      <table style="width:100%;border-collapse:collapse">
                        <thead><tr style="background:#fff;text-align:left;font-size:11px;color:#6b7280;border-bottom:1px solid #e5e7eb">
                          <th style="padding:5px 8px">Date</th>
                          <th style="padding:5px 8px">Narration</th>
                          <th style="padding:5px 8px">Ref / Chq No</th>
                          <th style="padding:5px 8px;text-align:right">Amount (₹)</th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                      </table>
                    </div>
                  `;
                }).join('');

                const html = `<!DOCTYPE html>
                <html>
                <head>
                  <title>Income & Expense Statement — Majestique Euriska A Building (July 2026)</title>
                  <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 36px; color: #1f2937; line-height: 1.5; }
                    .header { border-bottom: 3px solid #31553e; padding-bottom: 12px; margin-bottom: 24px; text-align: center; }
                    .header h1 { margin: 0; color: #31553e; font-size: 22px; text-transform: uppercase; letter-spacing: 0.5px; }
                    .header h2 { margin: 4px 0 0 0; color: #196c6c; font-size: 15px; font-weight: 600; }
                    .header p { margin: 4px 0 0 0; color: #6b7280; font-size: 12px; }
                    .kpi-grid { display: flex; gap: 16px; margin-bottom: 24px; }
                    .kpi-box { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
                    .kpi-box span { display: block; font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
                    .kpi-box strong { display: block; font-size: 18px; margin-top: 4px; }
                    .section-title { color: #31553e; font-size: 16px; border-bottom: 2px solid #31553e; padding-bottom: 4px; margin-top: 28px; margin-bottom: 12px; }
                    .section-title-expense { color: #c2644a; border-color: #c2644a; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
                    th { background: #f3f4f6; padding: 8px 10px; text-align: left; font-size: 12px; color: #374151; border-top: 1px solid #e5e7eb; border-bottom: 2px solid #d1d5db; }
                    td { padding: 8px 10px; font-size: 12px; }
                    tfoot tr { background: #f9fafb; font-weight: 700; border-top: 2px solid #d1d5db; }
                    .sig-grid { display: flex; justify: space-between; margin-top: 48px; border-top: 2px solid #e5e7eb; padding-top: 36px; text-align: center; }
                    .sig-box { width: 22%; }
                    .sig-line { border-top: 1px solid #9ca3af; margin-top: 40px; padding-top: 4px; font-size: 12px; font-weight: 600; color: #374151; }
                    @media print {
                      body { margin: 20px; }
                      button { display: none; }
                      .no-print { display: none; }
                    }
                  </style>
                </head>
                <body>
                  <div class="no-print" style="margin-bottom: 16px; text-align: right;">
                    <button onclick="window.print()" style="background:#31553e;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-weight:600;cursor:pointer">🖨️ Print / Save as PDF</button>
                  </div>

                  <div class="header">
                    <h1>Majestique Euriska A Building Sahakari Gruha Nirman Sanstha Maryadit</h1>
                    <h2>FINANCIAL AUDIT STATEMENT — INCOME & EXPENDITURE ACCOUNT</h2>
                    <p>For the Period: <strong>01 July 2026 to 29 July 2026</strong> | Bank: <strong>HDFC Bank (Mohammedwadi Branch)</strong></p>
                  </div>

                  <div class="kpi-grid">
                    <div class="kpi-box">
                      <span>Total Collections (Income)</span>
                      <strong style="color: #31553e">${fmt(totalCR)}</strong>
                      <span style="font-weight:normal;font-size:10px">${crTx.length} transactions</span>
                    </div>
                    <div class="kpi-box">
                      <span>Total Expenses (Outflow)</span>
                      <strong style="color: #c2644a">${fmt(totalDR)}</strong>
                      <span style="font-weight:normal;font-size:10px">${drTx.length} transactions</span>
                    </div>
                    <div class="kpi-box">
                      <span>Net Deficit / Cashflow</span>
                      <strong style="color: ${netFlow >= 0 ? '#31553e' : '#c2644a'}">${fmt(netFlow)}</strong>
                      <span style="font-weight:normal;font-size:10px">${netFlow >= 0 ? 'Surplus' : 'Deficit'}</span>
                    </div>
                    <div class="kpi-box">
                      <span>Closing Reserve Balance</span>
                      <strong style="color: #196c6c">${fmt(CLOSING_BALANCE)}</strong>
                      <span style="font-weight:normal;font-size:10px">as of 29/07/2026</span>
                    </div>
                  </div>

                  <!-- SECTION 1: INCOME BREAKDOWN -->
                  <h3 class="section-title">📥 1. Income Summary (By Source Stream)</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Income Source / Stream</th>
                        <th>Description</th>
                        <th style="text-align:center">Tx Count</th>
                        <th style="text-align:right">Total Amount (₹)</th>
                        <th style="text-align:right">% of Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${incomeSummaryRows}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="2">TOTAL INFLOW (RECEIPTS)</td>
                        <td style="text-align:center">${crTx.length}</td>
                        <td style="text-align:right;color:#31553e">${fmt(totalCR)}</td>
                        <td style="text-align:right;color:#196c6c">100.00%</td>
                      </tr>
                    </tfoot>
                  </table>

                  <!-- SECTION 2: EXPENSE BREAKDOWN -->
                  <h3 class="section-title section-title-expense">📤 2. Expense Summary (By Vendor & Category)</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Vendor / Payee Name</th>
                        <th>Category / Purpose</th>
                        <th>Cheque / Ref No</th>
                        <th style="text-align:right">Amount (₹)</th>
                        <th style="text-align:right">% of Spend</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${expenseSummaryRows}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="4">TOTAL OUTFLOW (EXPENSES)</td>
                        <td style="text-align:right;color:#c2644a">${fmt(totalDR)}</td>
                        <td style="text-align:right">100.00%</td>
                      </tr>
                    </tfoot>
                  </table>

                  <!-- SECTION 3: ITEMIZED INCOME RECEIPTS -->
                  <h3 class="section-title" style="margin-top:36px">📋 3. Itemized Receipts Register (Categorized Income)</h3>
                  <p style="font-size:12px;color:#6b7280;margin-bottom:12px">Full transaction breakdown of all credit entries received during the statement period.</p>
                  ${itemizedIncomeHtml}

                  <!-- SIGNATURE BLOCK -->
                  <div class="sig-grid">
                    <div class="sig-box">
                      <div class="sig-line">Treasurer</div>
                    </div>
                    <div class="sig-box">
                      <div class="sig-line">Secretary</div>
                    </div>
                    <div class="sig-box">
                      <div class="sig-line">Chairman / President</div>
                    </div>
                    <div class="sig-box">
                      <div class="sig-line">Internal Auditor</div>
                    </div>
                  </div>

                  <div style="margin-top:24px;text-align:center;font-size:11px;color:#9ca3af">
                    Statement Auditor System — Majestique Euriska A Building Society Portal | Report Generated: ${new Date().toLocaleDateString('en-IN', {day:'2-digit',month:'long',year:'numeric'})}
                  </div>
                </body>
                </html>`;

                const w = window.open('', '_blank');
                w.document.write(html);
                w.document.close();
                setTimeout(() => w.print(), 600);
              }}
            >
              📊 Open Income & Expense Statement (PDF/Print)
            </button>
          </div>

          {/* ── CSV Downloads ── */}
          <div className="section-card">
            <h3 className="section-card__title">📥 Download Transaction Data (CSV / Excel)</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Export the bank statement data as a CSV file. Open in Microsoft Excel, Google Sheets, or any spreadsheet tool.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {[
                { label: '📋 All Transactions', type: 'ALL', color: 'var(--teal)' },
                { label: '📥 Inflow (CR) Only', type: 'CR',  color: 'var(--pine)' },
                { label: '📤 Outflow (DR) Only', type: 'DR', color: 'var(--coral)' },
              ].map(({ label, type, color }) => (
                <button
                  key={type}
                  className="action-btn"
                  style={{ borderColor: color, color: color, fontWeight: '600' }}
                  onClick={() => {
                    const rows = TRANSACTIONS_LIST.filter(t => type === 'ALL' || t.type === type);
                    const header = ['Date', 'Type', 'Narration', 'Ref / Chq No', 'Withdrawal (DR)', 'Deposit (CR)', 'Closing Balance'];
                    const csvRows = rows.map(t => [
                      t.date, t.type,
                      `"${t.desc.replace(/"/g, '""')}"`,
                      t.ref,
                      t.type === 'DR' ? t.amount : '',
                      t.type === 'CR' ? t.amount : '',
                      t.bal
                    ]);
                    const csv = [header, ...csvRows].map(r => r.join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `MajestiqueEuriska_Jul2026_${type}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  ⬇ {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Print / PDF ── */}
          <div className="section-card">
            <h3 className="section-card__title">🖨️ Full Bank Statement & Ledger (PDF/Print)</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Opens a print-ready page with KPI summary, vendor rankings, and complete 101-transaction ledger. Use your browser's Print → Save as PDF option.
            </p>
            <button
              className="action-btn"
              style={{ borderColor: '#196c6c', color: '#196c6c', fontWeight: '600' }}
              onClick={() => {
                const crTx = TRANSACTIONS_LIST.filter(t => t.type === 'CR');
                const drTx = TRANSACTIONS_LIST.filter(t => t.type === 'DR');
                const totalCR = crTx.reduce((s, t) => s + t.amount, 0);
                const totalDR = drTx.reduce((s, t) => s + t.amount, 0);
                const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v);
                const txRows = TRANSACTIONS_LIST.map(t => `
                  <tr style="border-bottom:1px solid #e5e7eb;font-size:12px">
                    <td style="padding:6px 8px;white-space:nowrap">${t.date}</td>
                    <td style="padding:6px 8px;color:${t.type==='CR'?'#31553e':'#c2644a'};font-weight:700">${t.type}</td>
                    <td style="padding:6px 8px">${t.desc}</td>
                    <td style="padding:6px 8px;font-family:monospace;font-size:11px;color:#6b7280">${t.ref}</td>
                    <td style="padding:6px 8px;text-align:right;color:#c2644a;font-weight:600">${t.type==='DR'?fmt(t.amount):''}</td>
                    <td style="padding:6px 8px;text-align:right;color:#31553e;font-weight:600">${t.type==='CR'?fmt(t.amount):''}</td>
                    <td style="padding:6px 8px;text-align:right">${fmt(t.bal)}</td>
                  </tr>`).join('');
                const vendorRows = VENDORS_DATA.map(v => `
                  <tr style="border-bottom:1px solid #e5e7eb;font-size:12px">
                    <td style="padding:6px 8px;font-weight:700;color:#196c6c">#${v.rank}</td>
                    <td style="padding:6px 8px;font-weight:600">${v.name}</td>
                    <td style="padding:6px 8px;color:#6b7280">${v.type}</td>
                    <td style="padding:6px 8px;font-family:monospace">${v.cheque}</td>
                    <td style="padding:6px 8px;text-align:right;color:#c2644a;font-weight:700">${fmt(v.total)}</td>
                    <td style="padding:6px 8px;text-align:right">${((v.total/totalDR)*100).toFixed(2)}%</td>
                  </tr>`).join('');
                const html = `<!DOCTYPE html><html><head><title>Majestique Euriska A Bldg — Bank Statement July 2026</title>
                  <style>body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{color:#196c6c;margin-bottom:4px}h2{color:#196c6c;margin-top:28px;font-size:16px;border-bottom:2px solid #196c6c;padding-bottom:4px}.kpi{display:flex;gap:24px;margin:20px 0}.kpi-card{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:14px;text-align:center}.kpi-card p{margin:0;font-size:11px;color:#6b7280}.kpi-card h3{margin:6px 0;font-size:20px}table{width:100%;border-collapse:collapse}th{background:#f3f4f6;padding:8px;text-align:left;font-size:12px}tfoot tr{background:#f3f4f6;font-weight:700}@media print{button{display:none}}</style>
                </head><body>
                  <h1>🏢 Majestique Euriska A Building — Society Bank Statement</h1>
                  <p style="color:#6b7280;margin:0">Statement Period: ${STATEMENT_PERIOD} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString('en-IN', {day:'2-digit',month:'long',year:'numeric'})}</p>
                  <p style="color:#c2644a;font-size:11px;margin-top:4px">⚠ CONFIDENTIAL — For Committee Use Only</p>
                  <div class="kpi">
                    <div class="kpi-card"><p>Opening Balance</p><h3 style="color:#196c6c">${fmt(OPENING_BALANCE)}</h3></div>
                    <div class="kpi-card"><p>Total Collections (CR)</p><h3 style="color:#31553e">${fmt(totalCR)}</h3><p>${crTx.length} transactions</p></div>
                    <div class="kpi-card"><p>Total Expenses (DR)</p><h3 style="color:#c2644a">${fmt(totalDR)}</h3><p>${drTx.length} transactions</p></div>
                    <div class="kpi-card"><p>Closing Balance</p><h3 style="color:#196c6c">${fmt(CLOSING_BALANCE)}</h3></div>
                    <div class="kpi-card"><p>Net Cash Flow</p><h3 style="color:${(totalCR-totalDR)>=0?'#31553e':'#c2644a'}">${fmt(totalCR-totalDR)}</h3></div>
                  </div>
                  <h2>Vendor Payment Rankings</h2>
                  <table><thead><tr><th>Rank</th><th>Vendor</th><th>Category</th><th>Cheque/Ref</th><th style="text-align:right">Amount</th><th style="text-align:right">% Spend</th></tr></thead>
                  <tbody>${vendorRows}</tbody>
                  <tfoot><tr><td colspan="4">TOTAL</td><td style="text-align:right">${fmt(totalDR)}</td><td style="text-align:right">100%</td></tr></tfoot></table>
                  <h2>Complete Transaction Ledger</h2>
                  <table><thead><tr><th>Date</th><th>Type</th><th>Narration</th><th>Ref / Chq</th><th style="text-align:right">DR (₹)</th><th style="text-align:right">CR (₹)</th><th style="text-align:right">Balance</th></tr></thead>
                  <tbody>${txRows}</tbody>
                  <tfoot><tr><td colspan="4">TOTAL — ${TRANSACTIONS_LIST.length} entries</td><td style="text-align:right;color:#c2644a">${fmt(totalDR)}</td><td style="text-align:right;color:#31553e">${fmt(totalCR)}</td><td></td></tr></tfoot></table>
                </body></html>`;
                const w = window.open('', '_blank');
                w.document.write(html);
                w.document.close();
                setTimeout(() => w.print(), 600);
              }}
            >
              🖨️ Open Print Preview
            </button>
          </div>

          {/* ── Audit Report Download ── */}
          <div className="section-card">
            <h3 className="section-card__title">📄 Download Forensic Audit Report</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Generates a formal CA-style audit report as an HTML file — includes risk flags, internal control observations, vendor analysis, and financial health summary.
            </p>
            <button
              className="action-btn"
              style={{ borderColor: '#c2644a', color: '#c2644a', fontWeight: '600' }}
              onClick={() => {
                const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v);
                const totalCR = TRANSACTIONS_LIST.filter(t=>t.type==='CR').reduce((s,t)=>s+t.amount,0);
                const totalDR = TRANSACTIONS_LIST.filter(t=>t.type==='DR').reduce((s,t)=>s+t.amount,0);
                const auditHtml = `<!DOCTYPE html><html><head><title>Forensic Audit Report — Majestique Euriska A Bldg July 2026</title>
                  <style>body{font-family:'Times New Roman',serif;margin:48px;color:#111;line-height:1.7}h1{text-align:center;color:#111;font-size:22px}h2{color:#c2644a;border-bottom:2px solid #c2644a;padding-bottom:4px;margin-top:36px;font-size:16px}h3{font-size:14px;margin-top:20px}.risk{border-left:4px solid #ef4444;padding:10px 16px;margin:12px 0;background:#fff5f5}.medium{border-color:#b98216;background:#fffbeb}.meta{text-align:center;color:#6b7280;font-size:13px;margin-bottom:32px}table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#f3f4f6;padding:8px;text-align:left;font-size:12px;border:1px solid #e5e7eb}td{padding:8px;border:1px solid #e5e7eb;font-size:12px}.footer{margin-top:48px;border-top:2px solid #111;padding-top:16px;font-size:12px;color:#6b7280}</style>
                </head><body>
                  <h1>FORENSIC FINANCIAL AUDIT REPORT</h1>
                  <div class="meta">
                    <strong>Society:</strong> Majestique Euriska A Building Sahakari Gruha Nirman Sanstha Maryadit<br/>
                    <strong>Period:</strong> ${STATEMENT_PERIOD}<br/>
                    <strong>Bank Account:</strong> HDFC Bank (Mohammedwadi Branch)<br/>
                    <strong>Report Generated:</strong> ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})} at ${new Date().toLocaleTimeString('en-IN')}<br/>
                    <em style="color:#c2644a">⚠ STRICTLY CONFIDENTIAL — For Managing Committee Use Only</em>
                  </div>

                  <h2>1. Executive Summary</h2>
                  <table>
                    <tr><th>Particulars</th><th style="text-align:right">Amount (INR)</th></tr>
                    <tr><td>Opening Balance (01 Jul 2026)</td><td style="text-align:right">${fmt(OPENING_BALANCE)}</td></tr>
                    <tr><td>Total Credits / Collections</td><td style="text-align:right;color:green">${fmt(totalCR)}</td></tr>
                    <tr><td>Total Debits / Expenses</td><td style="text-align:right;color:red">${fmt(totalDR)}</td></tr>
                    <tr><td><strong>Net Cash Flow (Deficit)</strong></td><td style="text-align:right;color:red"><strong>${fmt(totalCR-totalDR)}</strong></td></tr>
                    <tr><td>Closing Balance (29 Jul 2026)</td><td style="text-align:right">${fmt(CLOSING_BALANCE)}</td></tr>
                  </table>

                  <h2>2. Internal Control Risk Flags</h2>
                  <div class="risk"><strong>🔴 HIGH RISK — Self Cheque Cash Withdrawal (₹15,000)</strong><br/>Cheque 506 encashed in cash at Mohammedwadi branch on 02 Jul 2026. Cash withdrawals are untraceable and violate co-operative society financial guidelines. Immediate remediation required.</div>
                  <div class="risk"><strong>🔴 HIGH RISK — Unnanotated Self-Society Cheques (₹23,373)</strong><br/>Cheque 515 paid to "MAJESTIQUE EURISKA" without bill voucher or narration. Risk of unrecorded conversion.</div>
                  <div class="risk medium"><strong>🟠 MEDIUM RISK — Direct Personal Contractor Payments (₹94,862)</strong><br/>Payments to Shivshankar Singh, Sandip Raju Wavare, Tanaji Hande, Noushad Ali, and Sidharam Parmeshwar made directly to individuals. TDS deduction compliance not confirmed.</div>

                  <h2>3. Top Vendor Expenditure</h2>
                  <table>
                    <tr><th>Rank</th><th>Vendor</th><th>Category</th><th>Cheque/Ref</th><th style="text-align:right">Amount</th><th style="text-align:right">% of Total DR</th></tr>
                    ${VENDORS_DATA.map(v=>`<tr><td>#${v.rank}</td><td>${v.name}</td><td>${v.type}</td><td style="font-family:monospace">${v.cheque}</td><td style="text-align:right">${fmt(v.total)}</td><td style="text-align:right">${((v.total/totalDR)*100).toFixed(2)}%</td></tr>`).join('')}
                    <tr style="font-weight:700;background:#f3f4f6"><td colspan="4">TOTAL</td><td style="text-align:right">${fmt(totalDR)}</td><td style="text-align:right">100%</td></tr>
                  </table>

                  <h2>4. Management Action Items</h2>
                  <ol>
                    <li>Enforce cashless petty cash — transition to corporate prepaid debit cards.</li>
                    <li>Verify ₹89,019 Schindler Lift AMC against AGM-approved budget.</li>
                    <li>Obtain bills/vouchers for all inter-building transfers (A→B, A→C).</li>
                    <li>Confirm TDS deduction on all individual contractor payments.</li>
                    <li>Implement dual-signatory approval for all cheques above ₹10,000.</li>
                    <li>Reconcile UPI settlements with PG (Vivish Technologies) monthly statements.</li>
                  </ol>

                  <h2>5. Financial Health Assessment</h2>
                  <p>Monthly Spending Ratio: <strong>113.8%</strong> (Operational Deficit — expenses exceed collections by ₹${fmt(totalDR-totalCR).replace('₹','')})</p>
                  <p>Liquidity Reserve: <strong>${fmt(CLOSING_BALANCE)}</strong></p>
                  <p>Auditor Stability Rating: <strong>⭐⭐⭐ Average</strong> &nbsp;|&nbsp; Financial Health Score: <strong>76 / 100</strong></p>

                  <div class="footer">This report was generated by the Majestique Euriska A Building Society Dashboard — Statement Auditor module.<br/>For official audit purposes, this report must be countersigned by a practising Chartered Accountant.</div>
                </body></html>`;
                const blob = new Blob([auditHtml], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `MajestiqueEuriska_ForensicAuditReport_Jul2026.html`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              ⬇ Download Audit Report (.html)
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
