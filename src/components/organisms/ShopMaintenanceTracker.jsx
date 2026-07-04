import { useCallback, useMemo, useState, useEffect } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

export const initialShopData = [
  {
    id: 1,
    shopNo: 'Shop 1',
    name: 'Mr. Gulshan Vasnani',
    contactNo: '9822620468',
    maintenance: '',
    ledger: [
      { month: 'Oct-21', regularMain: 1100, receipts: '', netAmount: 1100 },
      { month: 'Nov-21', regularMain: 1100, receipts: '', netAmount: 2200 },
      { month: 'Dec-21', regularMain: 1100, receipts: '', netAmount: 3300 },
      { month: 'Jan-22', regularMain: 1100, receipts: '', netAmount: 4400 },
      { month: 'Feb-22', regularMain: 1100, receipts: '', netAmount: 5500 },
      { month: 'Mar-22', regularMain: 1100, receipts: '', netAmount: 6600 },
      { month: 'Apr-22', regularMain: 1100, receipts: '', netAmount: 7700 },
      { month: 'May-22', regularMain: 1100, receipts: '', netAmount: 8800 },
      { month: 'Jun-22', regularMain: 1100, receipts: '', netAmount: 9900 },
      { month: 'Jul-22', regularMain: 1100, receipts: '', netAmount: 11000 },
      { month: 'Aug-22', regularMain: 1100, receipts: '', netAmount: 12100 },
      { month: 'Sep-22', regularMain: 1100, receipts: '', netAmount: 13200 },
      { month: 'Oct-22', regularMain: 1100, receipts: '', netAmount: 14300 },
      { month: 'Nov-22', regularMain: 1100, receipts: '', netAmount: 15400 },
      { month: 'Dec-22', regularMain: 1100, receipts: '', netAmount: 16500 },
      { month: 'Jan-23', regularMain: 1100, receipts: '', netAmount: 17600 },
      { month: 'Feb-23', regularMain: 1100, receipts: '', netAmount: 18700 },
      { month: 'Mar-23', regularMain: 1100, receipts: '', netAmount: 19800 },
      { month: 'Apr-23', regularMain: 1100, receipts: '', netAmount: 20900 },
      { month: 'May-23', regularMain: 1100, receipts: '', netAmount: 22000 },
      { month: 'Jun-23', regularMain: 1100, receipts: '', netAmount: 23100 },
      { month: 'Jul-23', regularMain: 1100, receipts: '', netAmount: 24200 },
      { month: 'Aug-23', regularMain: 1100, receipts: '', netAmount: 25300 },
      { month: 'Sep-23', regularMain: 1100, receipts: '', netAmount: 26400 },
      { month: 'Oct-23', regularMain: 1100, receipts: '', netAmount: 27500 },
      { month: 'Nov-23', regularMain: 1100, receipts: '', netAmount: 28600 },
      { month: 'Dec-23', regularMain: 1100, receipts: '', netAmount: 29700 },
      { month: 'Jan-24', regularMain: 1100, receipts: '', netAmount: 30800 },
      { month: 'Feb-24', regularMain: 1100, receipts: '', netAmount: 31900 },
      { month: 'Mar-24', regularMain: 1100, receipts: '', netAmount: 33000 },
      { month: 'Apr-24', regularMain: 1100, receipts: '', netAmount: 34100 },
      { month: 'May-24', regularMain: 1100, receipts: '', netAmount: 35200 },
      { month: 'Jun-24', regularMain: 1100, receipts: '', netAmount: 36300 },
      { month: 'Jul-24', regularMain: 1500, receipts: '', netAmount: 37800 },
      { month: 'Aug-24', regularMain: 1500, receipts: '', netAmount: 39300 },
      { month: 'Sep-24', regularMain: 1500, receipts: '', netAmount: 40800 },
      { month: 'Oct-24', regularMain: 1500, receipts: '', netAmount: 42300 },
      { month: 'Nov-24', regularMain: 1500, receipts: '', netAmount: 43800 },
      { month: 'Dec-24', regularMain: 1500, receipts: '', netAmount: 45300 },
      { month: 'Jan-25', regularMain: 1500, receipts: '', netAmount: 46800 },
      { month: 'Feb-25', regularMain: 1500, receipts: '', netAmount: 48300 },
      { month: 'Mar-25', regularMain: 1500, receipts: '', netAmount: 49800 },
      { month: 'Apr-25', regularMain: 1500, receipts: '', netAmount: 51300 },
      { month: 'May-25', regularMain: 1500, receipts: '', netAmount: 52800 },
      { month: 'Jun-25', regularMain: 1500, receipts: '', netAmount: 54300 },
      { month: 'Jul-25', regularMain: 1500, receipts: '', netAmount: 55800 },
      { month: 'Aug-25', regularMain: 1500, receipts: '', netAmount: 57300 },
      { month: 'Sep-25', regularMain: 1500, receipts: '', netAmount: 58800 },
      { month: 'Oct-25', regularMain: 1500, receipts: '', netAmount: 60300 },
      { month: 'Nov-25', regularMain: 1500, receipts: '', netAmount: 61800 },
      { month: 'Dec-25', regularMain: 1500, receipts: '', netAmount: 63300 },
      { month: 'Jan-26', regularMain: 1500, receipts: '', netAmount: 64800 },
      { month: 'Feb-26', regularMain: 1500, receipts: '', netAmount: 66300 },
      { month: 'Mar-26', regularMain: 1500, receipts: '', netAmount: 67800 },
      { month: 'Apr-26', regularMain: 1500, receipts: '', netAmount: 69300 },
      { month: 'May-26', regularMain: 1500, receipts: '', netAmount: 70800 },
      { month: 'Jun-26', regularMain: 1500, receipts: '', netAmount: 72300 },
      { month: 'Jul-26', regularMain: 1500, receipts: '', netAmount: 73800 }
    ]
  },
  {
    id: 2,
    shopNo: 'Shop 2',
    name: 'Mr. Aslamkhan Risaldar',
    contactNo: '9860148160',
    maintenance: '',
    ledger: [
      { month: 'Oct-21', regularMain: 1100, receipts: '', netAmount: 1100 },
      { month: 'Nov-21', regularMain: 1100, receipts: '', netAmount: 2200 },
      { month: 'Dec-21', regularMain: 1100, receipts: '', netAmount: 3300 },
      { month: 'Jan-22', regularMain: 1100, receipts: '', netAmount: 4400 },
      { month: 'Feb-22', regularMain: 1100, receipts: '', netAmount: 5500 },
      { month: 'Mar-22', regularMain: 1100, receipts: '', netAmount: 6600 },
      { month: 'Apr-22', regularMain: 1100, receipts: '', netAmount: 7700 },
      { month: 'May-22', regularMain: 1100, receipts: '', netAmount: 8800 },
      { month: 'Jun-22', regularMain: 1100, receipts: '', netAmount: 9900 },
      { month: 'Jul-22', regularMain: 1100, receipts: '', netAmount: 11000 },
      { month: 'Aug-22', regularMain: 1100, receipts: '', netAmount: 12100 },
      { month: 'Sep-22', regularMain: 1100, receipts: '', netAmount: 13200 },
      { month: 'Oct-22', regularMain: 1100, receipts: '', netAmount: 14300 },
      { month: 'Nov-22', regularMain: 1100, receipts: '', netAmount: 15400 },
      { month: 'Dec-22', regularMain: 1100, receipts: '', netAmount: 16500 },
      { month: 'Jan-23', regularMain: 1100, receipts: '', netAmount: 17600 },
      { month: 'Feb-23', regularMain: 1100, receipts: '', netAmount: 18700 },
      { month: 'Mar-23', regularMain: 1100, receipts: '', netAmount: 19800 },
      { month: 'Apr-23', regularMain: 1100, receipts: '', netAmount: 20900 },
      { month: 'May-23', regularMain: 1100, receipts: '', netAmount: 22000 },
      { month: 'Jun-23', regularMain: 1100, receipts: '', netAmount: 23100 },
      { month: 'Jul-23', regularMain: 1100, receipts: '', netAmount: 24200 },
      { month: 'Aug-23', regularMain: 1100, receipts: '', netAmount: 25300 },
      { month: 'Sep-23', regularMain: 1100, receipts: '', netAmount: 26400 },
      { month: 'Oct-23', regularMain: 1100, receipts: '', netAmount: 27500 },
      { month: 'Nov-23', regularMain: 1100, receipts: '', netAmount: 28600 },
      { month: 'Dec-23', regularMain: 1100, receipts: '', netAmount: 29700 },
      { month: 'Jan-24', regularMain: 1100, receipts: '', netAmount: 30800 },
      { month: 'Feb-24', regularMain: 1100, receipts: '', netAmount: 31900 },
      { month: 'Mar-24', regularMain: 1100, receipts: '', netAmount: 33000 },
      { month: 'Apr-24', regularMain: 1100, receipts: '', netAmount: 34100 },
      { month: 'May-24', regularMain: 1100, receipts: '', netAmount: 35200 },
      { month: 'Jun-24', regularMain: 1100, receipts: '', netAmount: 36300 },
      { month: 'Jul-24', regularMain: 1500, receipts: '', netAmount: 37800 },
      { month: 'Aug-24', regularMain: 1500, receipts: '', netAmount: 39300 },
      { month: 'Sep-24', regularMain: 1500, receipts: '', netAmount: 40800 },
      { month: 'Oct-24', regularMain: 1500, receipts: '', netAmount: 42300 },
      { month: 'Nov-24', regularMain: 1500, receipts: '', netAmount: 43800 },
      { month: 'Dec-24', regularMain: 1500, receipts: '', netAmount: 45300 },
      { month: 'Jan-25', regularMain: 1500, receipts: '', netAmount: 46800 },
      { month: 'Feb-25', regularMain: 1500, receipts: '', netAmount: 48300 },
      { month: 'Mar-25', regularMain: 1500, receipts: '', netAmount: 49800 },
      { month: 'Apr-25', regularMain: 1500, receipts: '', netAmount: 51300 },
      { month: 'May-25', regularMain: 1500, receipts: '', netAmount: 52800 },
      { month: 'Jun-25', regularMain: 1500, receipts: '', netAmount: 54300 },
      { month: 'Jul-25', regularMain: 1500, receipts: '', netAmount: 55800 },
      { month: 'Aug-25', regularMain: 1500, receipts: '', netAmount: 57300 },
      { month: 'Sep-25', regularMain: 1500, receipts: '', netAmount: 58800 },
      { month: 'Oct-25', regularMain: 1500, receipts: '', netAmount: 60300 },
      { month: 'Nov-25', regularMain: 1500, receipts: '', netAmount: 61800 },
      { month: 'Dec-25', regularMain: 1500, receipts: '', netAmount: 63300 },
      { month: 'Jan-26', regularMain: 1500, receipts: '', netAmount: 64800 },
      { month: 'Feb-26', regularMain: 1500, receipts: '', netAmount: 66300 },
      { month: 'Mar-26', regularMain: 1500, receipts: '', netAmount: 67800 },
      { month: 'Apr-26', regularMain: 1500, receipts: '', netAmount: 69300 },
      { month: 'May-26', regularMain: 1500, receipts: '', netAmount: 70800 },
      { month: 'Jun-26', regularMain: 1500, receipts: '', netAmount: 72300 },
      { month: 'Jul-26', regularMain: 1500, receipts: '', netAmount: 73800 }
    ]
  },
  {
    id: 3,
    shopNo: 'Shop 3',
    name: 'Mr. Ambika Prasad Kant',
    contactNo: '8806741953',
    maintenance: '',
    ledger: [
      { month: 'Oct-21', regularMain: 1100, receipts: '', netAmount: 1100 },
      { month: 'Nov-21', regularMain: 1100, receipts: '', netAmount: 2200 },
      { month: 'Dec-21', regularMain: 1100, receipts: '', netAmount: 3300 },
      { month: 'Jan-22', regularMain: 1100, receipts: '', netAmount: 4400 },
      { month: 'Feb-22', regularMain: 1100, receipts: '', netAmount: 5500 },
      { month: 'Mar-22', regularMain: 1100, receipts: '', netAmount: 6600 },
      { month: 'Apr-22', regularMain: 1100, receipts: '', netAmount: 7700 },
      { month: 'May-22', regularMain: 1100, receipts: '', netAmount: 8800 },
      { month: 'Jun-22', regularMain: 1100, receipts: '', netAmount: 9900 },
      { month: 'Jul-22', regularMain: 1100, receipts: '', netAmount: 11000 },
      { month: 'Aug-22', regularMain: 1100, receipts: '', netAmount: 12100 },
      { month: 'Sep-22', regularMain: 1100, receipts: '', netAmount: 13200 },
      { month: 'Oct-22', regularMain: 1100, receipts: '', netAmount: 14300 },
      { month: 'Nov-22', regularMain: 1100, receipts: '', netAmount: 15400 },
      { month: 'Dec-22', regularMain: 1100, receipts: '', netAmount: 16500 },
      { month: 'Jan-23', regularMain: 1100, receipts: '', netAmount: 17600 },
      { month: 'Feb-23', regularMain: 1100, receipts: '', netAmount: 18700 },
      { month: 'Mar-23', regularMain: 1100, receipts: '', netAmount: 19800 },
      { month: 'Apr-23', regularMain: 1100, receipts: '', netAmount: 20900 },
      { month: 'May-23', regularMain: 1100, receipts: '', netAmount: 22000 },
      { month: 'Jun-23', regularMain: 1100, receipts: '', netAmount: 23100 },
      { month: 'Jul-23', regularMain: 1100, receipts: '', netAmount: 24200 },
      { month: 'Aug-23', regularMain: 1100, receipts: '', netAmount: 25300 },
      { month: 'Sep-23', regularMain: 1100, receipts: '', netAmount: 26400 },
      { month: 'Oct-23', regularMain: 1100, receipts: '', netAmount: 27500 },
      { month: 'Nov-23', regularMain: 1100, receipts: '', netAmount: 28600 },
      { month: 'Dec-23', regularMain: 1100, receipts: '36300', netAmount: -6600 },
      { month: 'Jan-24', regularMain: 1100, receipts: '', netAmount: -5500 },
      { month: 'Feb-24', regularMain: 1100, receipts: '', netAmount: -4400 },
      { month: 'Mar-24', regularMain: 1100, receipts: '', netAmount: -3300 },
      { month: 'Apr-24', regularMain: 1100, receipts: '', netAmount: -2200 },
      { month: 'May-24', regularMain: 1100, receipts: '', netAmount: -1100 },
      { month: 'Jun-24', regularMain: 1100, receipts: '', netAmount: 0 },
      { month: 'Jul-24', regularMain: 1500, receipts: '', netAmount: 1500 },
      { month: 'Aug-24', regularMain: 1500, receipts: '', netAmount: 3000 },
      { month: 'Sep-24', regularMain: 1500, receipts: '', netAmount: 4500 },
      { month: 'Oct-24', regularMain: 1500, receipts: '', netAmount: 6000 },
      { month: 'Nov-24', regularMain: 1500, receipts: '', netAmount: 7500 },
      { month: 'Dec-24', regularMain: 1500, receipts: '10800', netAmount: -1800 },
      { month: 'Jan-25', regularMain: 1500, receipts: '', netAmount: -300 },
      { month: 'Feb-25', regularMain: 1500, receipts: '', netAmount: 1200 },
      { month: 'Mar-25', regularMain: 1500, receipts: '', netAmount: 2700 },
      { month: 'Apr-25', regularMain: 1500, receipts: '', netAmount: 4200 },
      { month: 'May-25', regularMain: 1500, receipts: '', netAmount: 5700 },
      { month: 'Jun-25', regularMain: 1500, receipts: '', netAmount: 7200 },
      { month: 'Jul-25', regularMain: 1500, receipts: '', netAmount: 8700 },
      { month: 'Aug-25', regularMain: 1500, receipts: '9000', netAmount: 1200 },
      { month: 'Sep-25', regularMain: 1500, receipts: '', netAmount: 2700 },
      { month: 'Oct-25', regularMain: 1500, receipts: '', netAmount: 4200 },
      { month: 'Nov-25', regularMain: 1500, receipts: '', netAmount: 5700 },
      { month: 'Dec-25', regularMain: 1500, receipts: '', netAmount: 7200 },
      { month: 'Jan-26', regularMain: 1500, receipts: '9000', netAmount: -300 },
      { month: 'Feb-26', regularMain: 1500, receipts: '', netAmount: 1200 },
      { month: 'Mar-26', regularMain: 1500, receipts: '', netAmount: 2700 },
      { month: 'Apr-26', regularMain: 1500, receipts: '', netAmount: 4200 },
      { month: 'May-26', regularMain: 1500, receipts: '', netAmount: 5700 },
      { month: 'Jun-26', regularMain: 1500, receipts: '', netAmount: 7200 },
      { month: 'Jul-26', regularMain: 1500, receipts: '', netAmount: 8700 }
    ]
  },
  {
    id: 4,
    shopNo: 'Shop 4',
    name: 'Mr. Altaf Shaikh',
    contactNo: '9822648491',
    maintenance: '',
    ledger: [
      { month: 'Oct-21', regularMain: 1100, receipts: '', netAmount: 1100 },
      { month: 'Nov-21', regularMain: 1100, receipts: '', netAmount: 2200 },
      { month: 'Dec-21', regularMain: 1100, receipts: '', netAmount: 3300 },
      { month: 'Jan-22', regularMain: 1100, receipts: '', netAmount: 4400 },
      { month: 'Feb-22', regularMain: 1100, receipts: '', netAmount: 5500 },
      { month: 'Mar-22', regularMain: 1100, receipts: '', netAmount: 6600 },
      { month: 'Apr-22', regularMain: 1100, receipts: '', netAmount: 7700 },
      { month: 'May-22', regularMain: 1100, receipts: '', netAmount: 8800 },
      { month: 'Jun-22', regularMain: 1100, receipts: '', netAmount: 9900 },
      { month: 'Jul-22', regularMain: 1100, receipts: '', netAmount: 11000 },
      { month: 'Aug-22', regularMain: 1100, receipts: '', netAmount: 12100 },
      { month: 'Sep-22', regularMain: 1100, receipts: '', netAmount: 13200 },
      { month: 'Oct-22', regularMain: 1100, receipts: '', netAmount: 14300 },
      { month: 'Nov-22', regularMain: 1100, receipts: '', netAmount: 15400 },
      { month: 'Dec-22', regularMain: 1100, receipts: '', netAmount: 16500 },
      { month: 'Jan-23', regularMain: 1100, receipts: '', netAmount: 17600 },
      { month: 'Feb-23', regularMain: 1100, receipts: '', netAmount: 18700 },
      { month: 'Mar-23', regularMain: 1100, receipts: '', netAmount: 19800 },
      { month: 'Apr-23', regularMain: 1100, receipts: '', netAmount: 20900 },
      { month: 'May-23', regularMain: 1100, receipts: '', netAmount: 22000 },
      { month: 'Jun-23', regularMain: 1100, receipts: '', netAmount: 23100 },
      { month: 'Jul-23', regularMain: 1100, receipts: '', netAmount: 24200 },
      { month: 'Aug-23', regularMain: 1100, receipts: '', netAmount: 25300 },
      { month: 'Sep-23', regularMain: 1100, receipts: '', netAmount: 26400 },
      { month: 'Oct-23', regularMain: 1100, receipts: '', netAmount: 27500 },
      { month: 'Nov-23', regularMain: 1100, receipts: '', netAmount: 28600 },
      { month: 'Dec-23', regularMain: 1100, receipts: '', netAmount: 29700 },
      { month: 'Jan-24', regularMain: 1100, receipts: '', netAmount: 30800 },
      { month: 'Feb-24', regularMain: 1100, receipts: '', netAmount: 31900 },
      { month: 'Mar-24', regularMain: 1100, receipts: '', netAmount: 33000 },
      { month: 'Apr-24', regularMain: 1100, receipts: '', netAmount: 34100 },
      { month: 'May-24', regularMain: 1100, receipts: '', netAmount: 35200 },
      { month: 'Jun-24', regularMain: 1100, receipts: '', netAmount: 36300 },
      { month: 'Jul-24', regularMain: 1500, receipts: '', netAmount: 37800 },
      { month: 'Aug-24', regularMain: 1500, receipts: '', netAmount: 39300 },
      { month: 'Sep-24', regularMain: 1500, receipts: '', netAmount: 40800 },
      { month: 'Oct-24', regularMain: 1500, receipts: '', netAmount: 42300 },
      { month: 'Nov-24', regularMain: 1500, receipts: '', netAmount: 43800 },
      { month: 'Dec-24', regularMain: 1500, receipts: '', netAmount: 45300 },
      { month: 'Jan-25', regularMain: 1500, receipts: '', netAmount: 46800 },
      { month: 'Feb-25', regularMain: 1500, receipts: '', netAmount: 48300 },
      { month: 'Mar-25', regularMain: 1500, receipts: '', netAmount: 49800 },
      { month: 'Apr-25', regularMain: 1500, receipts: '', netAmount: 51300 },
      { month: 'May-25', regularMain: 1500, receipts: '', netAmount: 52800 },
      { month: 'Jun-25', regularMain: 1500, receipts: '', netAmount: 54300 },
      { month: 'Jul-25', regularMain: 1500, receipts: '', netAmount: 55800 },
      { month: 'Aug-25', regularMain: 1500, receipts: '', netAmount: 57300 },
      { month: 'Sep-25', regularMain: 1500, receipts: '', netAmount: 58800 },
      { month: 'Oct-25', regularMain: 1500, receipts: '', netAmount: 60300 },
      { month: 'Nov-25', regularMain: 1500, receipts: '', netAmount: 61800 },
      { month: 'Dec-25', regularMain: 1500, receipts: '', netAmount: 63300 },
      { month: 'Jan-26', regularMain: 1500, receipts: '', netAmount: 64800 },
      { month: 'Feb-26', regularMain: 1500, receipts: '', netAmount: 66300 },
      { month: 'Mar-26', regularMain: 1500, receipts: '', netAmount: 67800 },
      { month: 'Apr-26', regularMain: 1500, receipts: '', netAmount: 69300 },
      { month: 'May-26', regularMain: 1500, receipts: '', netAmount: 70800 },
      { month: 'Jun-26', regularMain: 1500, receipts: '', netAmount: 72300 },
      { month: 'Jul-26', regularMain: 1500, receipts: '', netAmount: 73800 }
    ]
  },
  {
    id: 5,
    shopNo: 'Shop 5',
    name: 'Mr. Ambika Prasad Kant',
    contactNo: '8806741953',
    maintenance: '',
    ledger: [
      { month: 'Oct-21', regularMain: 1100, receipts: '', netAmount: 1100 },
      { month: 'Nov-21', regularMain: 1100, receipts: '', netAmount: 2200 },
      { month: 'Dec-21', regularMain: 1100, receipts: '', netAmount: 3300 },
      { month: 'Jan-22', regularMain: 1100, receipts: '', netAmount: 4400 },
      { month: 'Feb-22', regularMain: 1100, receipts: '', netAmount: 5500 },
      { month: 'Mar-22', regularMain: 1100, receipts: '', netAmount: 6600 },
      { month: 'Apr-22', regularMain: 1100, receipts: '', netAmount: 7700 },
      { month: 'May-22', regularMain: 1100, receipts: '', netAmount: 8800 },
      { month: 'Jun-22', regularMain: 1100, receipts: '', netAmount: 9900 },
      { month: 'Jul-22', regularMain: 1100, receipts: '', netAmount: 11000 },
      { month: 'Aug-22', regularMain: 1100, receipts: '', netAmount: 12100 },
      { month: 'Sep-22', regularMain: 1100, receipts: '', netAmount: 13200 },
      { month: 'Oct-22', regularMain: 1100, receipts: '', netAmount: 14300 },
      { month: 'Nov-22', regularMain: 1100, receipts: '', netAmount: 15400 },
      { month: 'Dec-22', regularMain: 1100, receipts: '', netAmount: 16500 },
      { month: 'Jan-23', regularMain: 1100, receipts: '', netAmount: 17600 },
      { month: 'Feb-23', regularMain: 1100, receipts: '', netAmount: 18700 },
      { month: 'Mar-23', regularMain: 1100, receipts: '', netAmount: 19800 },
      { month: 'Apr-23', regularMain: 1100, receipts: '', netAmount: 20900 },
      { month: 'May-23', regularMain: 1100, receipts: '', netAmount: 22000 },
      { month: 'Jun-23', regularMain: 1100, receipts: '', netAmount: 23100 },
      { month: 'Jul-23', regularMain: 1100, receipts: '', netAmount: 24200 },
      { month: 'Aug-23', regularMain: 1100, receipts: '', netAmount: 25300 },
      { month: 'Sep-23', regularMain: 1100, receipts: '', netAmount: 26400 },
      { month: 'Oct-23', regularMain: 1100, receipts: '', netAmount: 27500 },
      { month: 'Nov-23', regularMain: 1100, receipts: '', netAmount: 28600 },
      { month: 'Dec-23', regularMain: 1100, receipts: '36300', netAmount: -6600 },
      { month: 'Jan-24', regularMain: 1100, receipts: '', netAmount: -5500 },
      { month: 'Feb-24', regularMain: 1100, receipts: '', netAmount: -4400 },
      { month: 'Mar-24', regularMain: 1100, receipts: '', netAmount: -3300 },
      { month: 'Apr-24', regularMain: 1100, receipts: '', netAmount: -2200 },
      { month: 'May-24', regularMain: 1100, receipts: '', netAmount: -1100 },
      { month: 'Jun-24', regularMain: 1100, receipts: '', netAmount: 0 },
      { month: 'Jul-24', regularMain: 1500, receipts: '', netAmount: 1500 },
      { month: 'Aug-24', regularMain: 1500, receipts: '', netAmount: 3000 },
      { month: 'Sep-24', regularMain: 1500, receipts: '', netAmount: 4500 },
      { month: 'Oct-24', regularMain: 1500, receipts: '', netAmount: 6000 },
      { month: 'Nov-24', regularMain: 1500, receipts: '', netAmount: 7500 },
      { month: 'Dec-24', regularMain: 1500, receipts: '10800', netAmount: -1800 },
      { month: 'Jan-25', regularMain: 1500, receipts: '', netAmount: -300 },
      { month: 'Feb-25', regularMain: 1500, receipts: '', netAmount: 1200 },
      { month: 'Mar-25', regularMain: 1500, receipts: '', netAmount: 2700 },
      { month: 'Apr-25', regularMain: 1500, receipts: '', netAmount: 4200 },
      { month: 'May-25', regularMain: 1500, receipts: '', netAmount: 5700 },
      { month: 'Jun-25', regularMain: 1500, receipts: '', netAmount: 7200 },
      { month: 'Jul-25', regularMain: 1500, receipts: '', netAmount: 8700 },
      { month: 'Aug-25', regularMain: 1500, receipts: '9000', netAmount: 1200 },
      { month: 'Sep-25', regularMain: 1500, receipts: '', netAmount: 2700 },
      { month: 'Oct-25', regularMain: 1500, receipts: '', netAmount: 4200 },
      { month: 'Nov-25', regularMain: 1500, receipts: '', netAmount: 5700 },
      { month: 'Dec-25', regularMain: 1500, receipts: '', netAmount: 7200 },
      { month: 'Jan-26', regularMain: 1500, receipts: '9000', netAmount: -300 },
      { month: 'Feb-26', regularMain: 1500, receipts: '', netAmount: 1200 },
      { month: 'Mar-26', regularMain: 1500, receipts: '', netAmount: 2700 },
      { month: 'Apr-26', regularMain: 1500, receipts: '', netAmount: 4200 },
      { month: 'May-26', regularMain: 1500, receipts: '', netAmount: 5700 },
      { month: 'Jun-26', regularMain: 1500, receipts: '', netAmount: 7200 },
      { month: 'Jul-26', regularMain: 1500, receipts: '', netAmount: 8700 }
    ]
  },
  {
    id: 6,
    shopNo: 'Shop 6',
    name: 'Mr. Pravin Godfrey Corderio',
    contactNo: '9923463767',
    maintenance: '',
    ledger: [
      { month: 'Oct-21', regularMain: 1100, receipts: '', netAmount: 1100 },
      { month: 'Nov-21', regularMain: 1100, receipts: '', netAmount: 2200 },
      { month: 'Dec-21', regularMain: 1100, receipts: '', netAmount: 3300 },
      { month: 'Jan-22', regularMain: 1100, receipts: '', netAmount: 4400 },
      { month: 'Feb-22', regularMain: 1100, receipts: '', netAmount: 5500 },
      { month: 'Mar-22', regularMain: 1100, receipts: '', netAmount: 6600 },
      { month: 'Apr-22', regularMain: 1100, receipts: '', netAmount: 7700 },
      { month: 'May-22', regularMain: 1100, receipts: '', netAmount: 8800 },
      { month: 'Jun-22', regularMain: 1100, receipts: '', netAmount: 9900 },
      { month: 'Jul-22', regularMain: 1100, receipts: '', netAmount: 11000 },
      { month: 'Aug-22', regularMain: 1100, receipts: '', netAmount: 12100 },
      { month: 'Sep-22', regularMain: 1100, receipts: '', netAmount: 13200 },
      { month: 'Oct-22', regularMain: 1100, receipts: '', netAmount: 14300 },
      { month: 'Nov-22', regularMain: 1100, receipts: '', netAmount: 15400 },
      { month: 'Dec-22', regularMain: 1100, receipts: '', netAmount: 16500 },
      { month: 'Jan-23', regularMain: 1100, receipts: '', netAmount: 17600 },
      { month: 'Feb-23', regularMain: 1100, receipts: '', netAmount: 18700 },
      { month: 'Mar-23', regularMain: 1100, receipts: '', netAmount: 19800 },
      { month: 'Apr-23', regularMain: 1100, receipts: '', netAmount: 20900 },
      { month: 'May-23', regularMain: 1100, receipts: '', netAmount: 22000 },
      { month: 'Jun-23', regularMain: 1100, receipts: '', netAmount: 23100 },
      { month: 'Jul-23', regularMain: 1100, receipts: '', netAmount: 24200 },
      { month: 'Aug-23', regularMain: 1100, receipts: '', netAmount: 25300 },
      { month: 'Sep-23', regularMain: 1100, receipts: '33000', netAmount: -6600 },
      { month: 'Oct-23', regularMain: 1100, receipts: '', netAmount: -5500 },
      { month: 'Nov-23', regularMain: 1100, receipts: '', netAmount: -4400 },
      { month: 'Dec-23', regularMain: 1100, receipts: '', netAmount: -3300 },
      { month: 'Jan-24', regularMain: 1100, receipts: '', netAmount: -2200 },
      { month: 'Feb-24', regularMain: 1100, receipts: '', netAmount: -1100 },
      { month: 'Mar-24', regularMain: 1100, receipts: '', netAmount: 0 },
      { month: 'Apr-24', regularMain: 1100, receipts: '', netAmount: 1100 },
      { month: 'May-24', regularMain: 1100, receipts: '', netAmount: 2200 },
      { month: 'Jun-24', regularMain: 1100, receipts: '', netAmount: 3300 },
      { month: 'Jul-24', regularMain: 1500, receipts: '', netAmount: 4800 },
      { month: 'Aug-24', regularMain: 1500, receipts: '', netAmount: 6300 },
      { month: 'Sep-24', regularMain: 1500, receipts: '', netAmount: 7800 },
      { month: 'Oct-24', regularMain: 1500, receipts: '', netAmount: 9300 },
      { month: 'Nov-24', regularMain: 1500, receipts: '', netAmount: 10800 },
      { month: 'Dec-24', regularMain: 1500, receipts: '', netAmount: 12300 },
      { month: 'Jan-25', regularMain: 1500, receipts: '', netAmount: 13800 },
      { month: 'Feb-25', regularMain: 1500, receipts: '', netAmount: 15300 },
      { month: 'Mar-25', regularMain: 1500, receipts: '', netAmount: 16800 },
      { month: 'Apr-25', regularMain: 1500, receipts: '', netAmount: 18300 },
      { month: 'May-25', regularMain: 1500, receipts: '', netAmount: 19800 },
      { month: 'Jun-25', regularMain: 1500, receipts: '', netAmount: 21300 },
      { month: 'Jul-25', regularMain: 1500, receipts: '', netAmount: 22800 },
      { month: 'Aug-25', regularMain: 1500, receipts: '', netAmount: 24300 },
      { month: 'Sep-25', regularMain: 1500, receipts: '', netAmount: 25800 },
      { month: 'Oct-25', regularMain: 1500, receipts: '', netAmount: 27300 },
      { month: 'Nov-25', regularMain: 1500, receipts: '', netAmount: 28800 },
      { month: 'Dec-25', regularMain: 1500, receipts: '', netAmount: 30300 },
      { month: 'Jan-26', regularMain: 1500, receipts: '', netAmount: 31800 },
      { month: 'Feb-26', regularMain: 1500, receipts: '', netAmount: 33300 },
      { month: 'Mar-26', regularMain: 1500, receipts: '', netAmount: 34800 },
      { month: 'Apr-26', regularMain: 1500, receipts: '', netAmount: 36300 },
      { month: 'May-26', regularMain: 1500, receipts: '', netAmount: 37800 },
      { month: 'Jun-26', regularMain: 1500, receipts: '', netAmount: 39300 },
      { month: 'Jul-26', regularMain: 1500, receipts: '', netAmount: 40800 }
    ]
  },
  {
    id: 7,
    shopNo: 'Shop 7',
    name: 'Mr. Firoj Shaikh',
    contactNo: '7057788632',
    maintenance: '',
    ledger: [
      { month: 'Oct-21', regularMain: 1100, receipts: '', netAmount: 1100 },
      { month: 'Nov-21', regularMain: 1100, receipts: '', netAmount: 2200 },
      { month: 'Dec-21', regularMain: 1100, receipts: '', netAmount: 3300 },
      { month: 'Jan-22', regularMain: 1100, receipts: '', netAmount: 4400 },
      { month: 'Feb-22', regularMain: 1100, receipts: '', netAmount: 5500 },
      { month: 'Mar-22', regularMain: 1100, receipts: '', netAmount: 6600 },
      { month: 'Apr-22', regularMain: 1100, receipts: '', netAmount: 7700 },
      { month: 'May-22', regularMain: 1100, receipts: '', netAmount: 8800 },
      { month: 'Jun-22', regularMain: 1100, receipts: '', netAmount: 9900 },
      { month: 'Jul-22', regularMain: 1100, receipts: '', netAmount: 11000 },
      { month: 'Aug-22', regularMain: 1100, receipts: '', netAmount: 12100 },
      { month: 'Sep-22', regularMain: 1100, receipts: '', netAmount: 13200 },
      { month: 'Oct-22', regularMain: 1100, receipts: '', netAmount: 14300 },
      { month: 'Nov-22', regularMain: 1100, receipts: '', netAmount: 15400 },
      { month: 'Dec-22', regularMain: 1100, receipts: '', netAmount: 16500 },
      { month: 'Jan-23', regularMain: 1100, receipts: '', netAmount: 17600 },
      { month: 'Feb-23', regularMain: 1100, receipts: '', netAmount: 18700 },
      { month: 'Mar-23', regularMain: 1100, receipts: '', netAmount: 19800 },
      { month: 'Apr-23', regularMain: 1100, receipts: '', netAmount: 20900 },
      { month: 'May-23', regularMain: 1100, receipts: '25000', netAmount: -3000 },
      { month: 'Jun-23', regularMain: 1100, receipts: '', netAmount: -1900 },
      { month: 'Jul-23', regularMain: 1100, receipts: '', netAmount: -800 },
      { month: 'Aug-23', regularMain: 1100, receipts: '', netAmount: 300 },
      { month: 'Sep-23', regularMain: 1100, receipts: '', netAmount: 1400 },
      { month: 'Oct-23', regularMain: 1100, receipts: '', netAmount: 2500 },
      { month: 'Nov-23', regularMain: 1100, receipts: '', netAmount: 3600 },
      { month: 'Dec-23', regularMain: 1100, receipts: '', netAmount: 4700 },
      { month: 'Jan-24', regularMain: 1100, receipts: '', netAmount: 5800 },
      { month: 'Feb-24', regularMain: 1100, receipts: '', netAmount: 6900 },
      { month: 'Mar-24', regularMain: 1100, receipts: '', netAmount: 8000 },
      { month: 'Apr-24', regularMain: 1100, receipts: '18000', netAmount: -8900 },
      { month: 'May-24', regularMain: 1100, receipts: '', netAmount: -7800 },
      { month: 'Jun-24', regularMain: 1100, receipts: '', netAmount: -6700 },
      { month: 'Jul-24', regularMain: 1500, receipts: '', netAmount: -5200 },
      { month: 'Aug-24', regularMain: 1500, receipts: '', netAmount: -3700 },
      { month: 'Sep-24', regularMain: 1500, receipts: '', netAmount: -2200 },
      { month: 'Oct-24', regularMain: 1500, receipts: '', netAmount: -700 },
      { month: 'Nov-24', regularMain: 1500, receipts: '', netAmount: 800 },
      { month: 'Dec-24', regularMain: 1500, receipts: '', netAmount: 2300 },
      { month: 'Jan-25', regularMain: 1500, receipts: '', netAmount: 3800 },
      { month: 'Feb-25', regularMain: 1500, receipts: '', netAmount: 5300 },
      { month: 'Mar-25', regularMain: 1500, receipts: '', netAmount: 6800 },
      { month: 'Apr-25', regularMain: 1500, receipts: '', netAmount: 8300 },
      { month: 'May-25', regularMain: 1500, receipts: '', netAmount: 9800 },
      { month: 'Jun-25', regularMain: 1500, receipts: '', netAmount: 11300 },
      { month: 'Jul-25', regularMain: 1500, receipts: '', netAmount: 12800 },
      { month: 'Aug-25', regularMain: 1500, receipts: '', netAmount: 14300 },
      { month: 'Sep-25', regularMain: 1500, receipts: '', netAmount: 15800 },
      { month: 'Oct-25', regularMain: 1500, receipts: '', netAmount: 17300 },
      { month: 'Nov-25', regularMain: 1500, receipts: '', netAmount: 18800 },
      { month: 'Dec-25', regularMain: 1500, receipts: '25700', netAmount: -5400 },
      { month: 'Jan-26', regularMain: 1500, receipts: '', netAmount: -3900 },
      { month: 'Feb-26', regularMain: 1500, receipts: '', netAmount: -2400 },
      { month: 'Mar-26', regularMain: 1500, receipts: '', netAmount: -900 },
      { month: 'Apr-26', regularMain: 1500, receipts: '', netAmount: 600 },
      { month: 'May-26', regularMain: 1500, receipts: '', netAmount: 2100 },
      { month: 'Jun-26', regularMain: 1500, receipts: '', netAmount: 3600 },
      { month: 'Jul-26', regularMain: 1500, receipts: '', netAmount: 5100 }
    ]
  },
  {
    id: 8,
    shopNo: 'Shop 8',
    name: 'Mrs. Shabnam Shaikh',
    contactNo: '',
    maintenance: '',
    ledger: [
      { month: 'Oct-21', regularMain: 1100, receipts: '', netAmount: 1100 },
      { month: 'Nov-21', regularMain: 1100, receipts: '', netAmount: 2200 },
      { month: 'Dec-21', regularMain: 1100, receipts: '', netAmount: 3300 },
      { month: 'Jan-22', regularMain: 1100, receipts: '', netAmount: 4400 },
      { month: 'Feb-22', regularMain: 1100, receipts: '', netAmount: 5500 },
      { month: 'Mar-22', regularMain: 1100, receipts: '', netAmount: 6600 },
      { month: 'Apr-22', regularMain: 1100, receipts: '', netAmount: 7700 },
      { month: 'May-22', regularMain: 1100, receipts: '', netAmount: 8800 },
      { month: 'Jun-22', regularMain: 1100, receipts: '', netAmount: 9900 },
      { month: 'Jul-22', regularMain: 1100, receipts: '', netAmount: 11000 },
      { month: 'Aug-22', regularMain: 1100, receipts: '', netAmount: 12100 },
      { month: 'Sep-22', regularMain: 1100, receipts: '', netAmount: 13200 },
      { month: 'Oct-22', regularMain: 1100, receipts: '', netAmount: 14300 },
      { month: 'Nov-22', regularMain: 1100, receipts: '', netAmount: 15400 },
      { month: 'Dec-22', regularMain: 1100, receipts: '', netAmount: 16500 },
      { month: 'Jan-23', regularMain: 1100, receipts: '', netAmount: 17600 },
      { month: 'Feb-23', regularMain: 1100, receipts: '', netAmount: 18700 },
      { month: 'Mar-23', regularMain: 1100, receipts: '', netAmount: 19800 },
      { month: 'Apr-23', regularMain: 1100, receipts: '', netAmount: 20900 },
      { month: 'May-23', regularMain: 1100, receipts: '', netAmount: 22000 },
      { month: 'Jun-23', regularMain: 1100, receipts: '', netAmount: 23100 },
      { month: 'Jul-23', regularMain: 1100, receipts: '', netAmount: 24200 },
      { month: 'Aug-23', regularMain: 1100, receipts: '', netAmount: 25300 },
      { month: 'Sep-23', regularMain: 1100, receipts: '', netAmount: 26400 },
      { month: 'Oct-23', regularMain: 1100, receipts: '', netAmount: 27500 },
      { month: 'Nov-23', regularMain: 1100, receipts: '', netAmount: 28600 },
      { month: 'Dec-23', regularMain: 1100, receipts: '', netAmount: 29700 },
      { month: 'Jan-24', regularMain: 1100, receipts: '', netAmount: 30800 },
      { month: 'Feb-24', regularMain: 1100, receipts: '', netAmount: 31900 },
      { month: 'Mar-24', regularMain: 1100, receipts: '', netAmount: 33000 },
      { month: 'Apr-24', regularMain: 1100, receipts: '', netAmount: 34100 },
      { month: 'May-24', regularMain: 1100, receipts: '', netAmount: 35200 },
      { month: 'Jun-24', regularMain: 1100, receipts: '', netAmount: 36300 },
      { month: 'Jul-24', regularMain: 1500, receipts: '50000', netAmount: -12200 },
      { month: 'Aug-24', regularMain: 1500, receipts: '', netAmount: -10700 },
      { month: 'Sep-24', regularMain: 1500, receipts: '', netAmount: -9200 },
      { month: 'Oct-24', regularMain: 1500, receipts: '', netAmount: -7700 },
      { month: 'Nov-24', regularMain: 1500, receipts: '', netAmount: -6200 },
      { month: 'Dec-24', regularMain: 1500, receipts: '', netAmount: -4700 },
      { month: 'Jan-25', regularMain: 1500, receipts: '', netAmount: -3200 },
      { month: 'Feb-25', regularMain: 1500, receipts: '', netAmount: -1700 },
      { month: 'Mar-25', regularMain: 1500, receipts: '', netAmount: -200 },
      { month: 'Apr-25', regularMain: 1500, receipts: '', netAmount: 1300 },
      { month: 'May-25', regularMain: 1500, receipts: '', netAmount: 2800 },
      { month: 'Jun-25', regularMain: 1500, receipts: '', netAmount: 4300 },
      { month: 'Jul-25', regularMain: 1500, receipts: '', netAmount: 5800 },
      { month: 'Aug-25', regularMain: 1500, receipts: '', netAmount: 7300 },
      { month: 'Sep-25', regularMain: 1500, receipts: '', netAmount: 8800 },
      { month: 'Oct-25', regularMain: 1500, receipts: '', netAmount: 10300 },
      { month: 'Nov-25', regularMain: 1500, receipts: '', netAmount: 11800 },
      { month: 'Dec-25', regularMain: 1500, receipts: '', netAmount: 13300 },
      { month: 'Jan-26', regularMain: 1500, receipts: '', netAmount: 14800 },
      { month: 'Feb-26', regularMain: 1500, receipts: '', netAmount: 16300 },
      { month: 'Mar-26', regularMain: 1500, receipts: '', netAmount: 17800 },
      { month: 'Apr-26', regularMain: 1500, receipts: '', netAmount: 19300 },
      { month: 'May-26', regularMain: 1500, receipts: '', netAmount: 20800 },
      { month: 'Jun-26', regularMain: 1500, receipts: '', netAmount: 22300 },
      { month: 'Jul-26', regularMain: 1500, receipts: '', netAmount: 23800 }
    ]
  }
];

const SHOP_MAINTENANCE_COLLECTION = 'shopMaintenance';
const SHOP_MAINTENANCE_DOC_ID = 'shop_maintenance_ledger';
const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseLedgerMonth(month) {
  const [rawMonth, rawYear] = String(month || '').split('-');
  const monthIndex = MONTH_ORDER.indexOf(rawMonth);
  const year = Number(rawYear);

  if (monthIndex < 0 || !Number.isFinite(year)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return (2000 + year) * 12 + monthIndex;
}

function toOptionalNumber(value) {
  if (value === '' || value === null || value === undefined) return '';
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : '';
}

function recalculateLedger(ledger) {
  let runningBalance = 0;

  return [...ledger]
    .sort((left, right) => parseLedgerMonth(left.month) - parseLedgerMonth(right.month))
    .map((entry) => {
      const regularMain = Number(entry.regularMain) || 0;
      const receipts = toOptionalNumber(entry.receipts);

      runningBalance += regularMain - (Number(receipts) || 0);

      return {
        ...entry,
        regularMain,
        receipts,
        netAmount: runningBalance,
      };
    });
}

function normalizeShopData(shops) {
  if (!Array.isArray(shops) || shops.length === 0) {
    return initialShopData;
  }

  return shops.map((shop, index) => ({
    id: shop.id ?? index + 1,
    shopNo: shop.shopNo ?? `Shop ${index + 1}`,
    name: shop.name ?? '',
    contactNo: shop.contactNo ?? '',
    maintenance: shop.maintenance ?? '',
    ledger: recalculateLedger(Array.isArray(shop.ledger) ? shop.ledger : []),
  }));
}

function StorefrontIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 10h16l-1.2-5.2A2.3 2.3 0 0 0 16.6 3H7.4a2.3 2.3 0 0 0-2.2 1.8L4 10Z" />
      <path d="M4 10v1a3 3 0 0 0 6 0v-1" />
      <path d="M10 10v1a3 3 0 0 0 6 0v-1" />
      <path d="M16 10v1a3 3 0 0 0 4 2.8" />
      <path d="M5 14v7h14v-7" />
      <path d="M9 21v-4h6v4" />
    </svg>
  );
}

function ReceiptIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Z" />
      <path d="M9 7h6" />
      <path d="M9 11h6" />
      <path d="M9 15h4" />
    </svg>
  );
}

function PencilIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

function TrashIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 15H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}



function formatValue(value) {
  if (value === '' || value === null || value === undefined) return '--';
  if (typeof value === 'number') {
    return value.toLocaleString('en-IN');
  }
  return value;
}

function BalanceBadge({ value }) {
  const numericValue = Number(value || 0);
  const isOutstanding = numericValue < 0;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 999,
        background: isOutstanding ? 'rgba(180, 35, 24, 0.1)' : 'rgba(196, 155, 79, 0.14)',
        color: isOutstanding ? '#b42318' : '#8a6b2e',
        border: `1px solid ${isOutstanding ? 'rgba(180, 35, 24, 0.18)' : 'rgba(196, 155, 79, 0.24)'}`,
        fontSize: '0.78rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {isOutstanding ? '⚠️ Outstanding' : '🕒 Pending Balance'}
    </span>
  );
}

function buildYearGroups(ledger) {
  const groups = {};

  ledger.forEach((entry) => {
    const rawMonth = entry.month?.split('-')?.[0] ?? '';
    const yearPart = entry.month?.split('-')?.[1] ?? '';
    if (!rawMonth || !yearPart) return;

    const year = Number(yearPart);
    const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(rawMonth);
    const fyStartYear = monthIndex >= 9 ? year : monthIndex <= 2 ? year - 1 : year;
    const fyLabel = `Apr ${String(fyStartYear).slice(-2)} to Mar ${String(fyStartYear + 1).slice(-2)}`;

    if (!groups[fyLabel]) {
      groups[fyLabel] = [];
    }
    groups[fyLabel].push(entry);
  });

  return Object.entries(groups).map(([year, entries]) => ({
    year,
    entries,
    regularMainTotal: entries.reduce((sum, entry) => sum + (entry.regularMain || 0), 0),
    receiptsTotal: entries.reduce((sum, entry) => sum + (Number(entry.receipts) || 0), 0),
    netTotal: entries.reduce((sum, entry) => sum + (entry.netAmount || 0), 0),
  })).reverse();
}

export default function ShopMaintenanceTracker({ isAdmin = false }) {
  const [shops, setShops] = useState(initialShopData);
  const [activeShopId, setActiveShopId] = useState(1);
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedShops, setSelectedShops] = useState([]);
  const [insertMonth, setInsertMonth] = useState('Aug-26');
  const [insertRegularAmount, setInsertRegularAmount] = useState('1500');
  const [insertAmount, setInsertAmount] = useState('');
  const [expandedYears, setExpandedYears] = useState({});
  const [saveStatus, setSaveStatus] = useState(isFirebaseConfigured ? 'idle' : 'local');
  const [saveMessage, setSaveMessage] = useState(isFirebaseConfigured ? 'Ready to sync' : 'Local mode');

  useEffect(() => {
    let cancelled = false;

    async function loadLedger() {
      if (!isFirebaseConfigured || !db) {
        setSaveMessage('Local mode');
        return;
      }

      setSaveStatus('loading');
      setSaveMessage('Loading ledger...');

      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, SHOP_MAINTENANCE_COLLECTION, SHOP_MAINTENANCE_DOC_ID));
        if (cancelled) return;

        if (snap.exists()) {
          const remoteShops = normalizeShopData(snap.data()?.shops);
          setShops(remoteShops);
          setSaveMessage('Synced from Firebase');
        } else {
          setSaveMessage('Using built-in ledger');
        }
        setSaveStatus('saved');
      } catch (error) {
        if (!cancelled) {
          console.error('Shop maintenance load error:', error);
          setSaveStatus('error');
          setSaveMessage('Firebase load failed');
        }
      }
    }

    loadLedger();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveShopsToFirebase = useCallback(async (nextShops, successMessage = 'Saved') => {
    setSaveStatus('saving');
    setSaveMessage('Saving...');

    if (!isFirebaseConfigured || !db) {
      setSaveStatus('saved');
      setSaveMessage('Saved locally');
      return true;
    }

    try {
      await ensureFirebaseSession();
      await setDoc(
        doc(db, SHOP_MAINTENANCE_COLLECTION, SHOP_MAINTENANCE_DOC_ID),
        {
          shops: normalizeShopData(nextShops),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaveStatus('saved');
      setSaveMessage(successMessage);
      return true;
    } catch (error) {
      console.error('Shop maintenance save error:', error);
      setSaveStatus('error');
      setSaveMessage('Save failed');
      return false;
    }
  }, []);

  const commitShops = useCallback(async (nextShops, successMessage) => {
    setShops(nextShops);
    return saveShopsToFirebase(nextShops, successMessage);
  }, [saveShopsToFirebase]);

  const overallPending = useMemo(() => {
    return shops.reduce((acc, shop) => {
      const shopTotalReg = shop.ledger.reduce((sum, entry) => sum + (entry.regularMain || 0), 0);
      const shopTotalRec = shop.ledger.reduce((sum, entry) => sum + (Number(entry.receipts) || 0), 0);
      return acc + (shopTotalReg - shopTotalRec);
    }, 0);
  }, [shops]);

  const activeShop = useMemo(() => shops.find((shop) => shop.id === activeShopId) || shops[0], [activeShopId, shops]);
  const latestBalance = activeShop.ledger[activeShop.ledger.length - 1]?.netAmount ?? '';
  const totalRegularMain = activeShop.ledger.reduce((sum, entry) => sum + (entry.regularMain || 0), 0);
  const totalReceipts = activeShop.ledger.reduce((sum, entry) => sum + (Number(entry.receipts) || 0), 0);
  const yearGroups = useMemo(() => buildYearGroups(activeShop.ledger), [activeShop.ledger]);

  useEffect(() => {
    if (yearGroups.length > 0) {
      const latestYear = yearGroups[0].year;
      setExpandedYears(prev => {
        if (prev[latestYear] && Object.keys(prev).length === 1) return prev;
        return { [latestYear]: true };
      });
    }
  }, [activeShopId, yearGroups]);

  const handleInsertSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin || !insertMonth || selectedShops.length === 0) return;
    
    const parsedRegularAmount = insertRegularAmount === '' ? undefined : Number(insertRegularAmount);
    const parsedReceiptAmount = insertAmount === '' ? undefined : Number(insertAmount);
    const regAmt = Number.isFinite(parsedRegularAmount) ? parsedRegularAmount : undefined;
    const recAmt = Number.isFinite(parsedReceiptAmount) ? parsedReceiptAmount : undefined;

    if (regAmt === undefined && recAmt === undefined) return;

    const nextShops = shops.map(shop => {
        if (!selectedShops.includes(shop.id)) return shop;
        
        const newLedger = [...shop.ledger];
        const monthIndex = newLedger.findIndex(entry => entry.month === insertMonth);
        
        if (monthIndex >= 0) {
          newLedger[monthIndex] = {
            ...newLedger[monthIndex],
            ...(regAmt !== undefined ? { regularMain: regAmt } : {}),
            ...(recAmt !== undefined ? { receipts: recAmt } : {}),
          };
        } else {
          newLedger.push({ 
            month: insertMonth, 
            regularMain: regAmt !== undefined ? regAmt : 1500, 
            receipts: recAmt !== undefined ? recAmt : '', 
            netAmount: 0 
          });
        }
        
        return { ...shop, ledger: recalculateLedger(newLedger) };
    });

    await commitShops(nextShops, 'Receipt saved');
    
    setIsInsertModalOpen(false);
    setSelectedShops([]);
    setInsertAmount('');
  };

  const startEditingEntry = (shopId, entry) => {
    if (!isAdmin) return;

    setEditingEntry({
      shopId,
      originalMonth: entry.month,
      month: entry.month,
      regularMain: String(entry.regularMain ?? ''),
      receipts: entry.receipts === '' || entry.receipts === undefined ? '' : String(entry.receipts),
    });
  };

  const handleEditFieldChange = (field, value) => {
    setEditingEntry((current) => current ? { ...current, [field]: value } : current);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin || !editingEntry) return;

    const regularMain = Number(editingEntry.regularMain);
    const receipts = toOptionalNumber(editingEntry.receipts);

    if (!editingEntry.month || !Number.isFinite(regularMain)) {
      window.alert('Month and monthly maintenance amount are required.');
      return;
    }

    const targetShop = shops.find((shop) => shop.id === editingEntry.shopId);
    const isDuplicateMonth = targetShop?.ledger.some((entry) =>
      entry.month === editingEntry.month && entry.month !== editingEntry.originalMonth
    );

    if (isDuplicateMonth) {
      window.alert(`${editingEntry.month} already exists for this shop.`);
      return;
    }

    const nextShops = shops.map((shop) => {
      if (shop.id !== editingEntry.shopId) return shop;

      const nextLedger = shop.ledger.map((entry) =>
        entry.month === editingEntry.originalMonth
          ? {
              ...entry,
              month: editingEntry.month,
              regularMain,
              receipts,
            }
          : entry
      );

      return { ...shop, ledger: recalculateLedger(nextLedger) };
    });

    await commitShops(nextShops, 'Ledger row saved');
    setEditingEntry(null);
  };

  const handleDeleteEntry = async (shopId, month) => {
    if (!isAdmin) return;

    if (!window.confirm(`Delete ${month} from this shop ledger?`)) {
      return;
    }

    const nextShops = shops.map((shop) => {
      if (shop.id !== shopId) return shop;
      return {
        ...shop,
        ledger: recalculateLedger(shop.ledger.filter((entry) => entry.month !== month)),
      };
    });

    await commitShops(nextShops, 'Ledger row deleted');
  };

  const toggleShopSelection = (shopId) => {
    setSelectedShops(prev => 
      prev.includes(shopId) ? prev.filter(id => id !== shopId) : [...prev, shopId]
    );
  };

  const saveTone =
    saveStatus === 'error'
      ? '#fee4e2'
      : saveStatus === 'saving' || saveStatus === 'loading'
        ? '#fef0c7'
        : 'rgba(209, 250, 229, 0.18)';

  const saveTextTone =
    saveStatus === 'error'
      ? '#b42318'
      : saveStatus === 'saving' || saveStatus === 'loading'
        ? '#92400e'
        : '#d1fadf';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{
        background: 'linear-gradient(135deg, #0b2b26 0%, #196c6c 100%)',
        borderRadius: 20,
        padding: '20px 24px',
        color: '#fff',
        boxShadow: '0 6px 28px rgba(11,43,38,0.22)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c49b4f' }}>🏬 Shop Maintenance</p>
          <h2 style={{ margin: '6px 0 8px', fontSize: '1.35rem', fontWeight: 800 }}>🏪 Shop Maintenance Ledger</h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.72)', fontSize: '0.9rem' }}>Monthly maintenance details, receipts, and balance movement for each shop.</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ padding: '6px 10px', borderRadius: 999, background: saveTone, color: saveTextTone, fontSize: '0.74rem', fontWeight: 800, border: '1px solid rgba(255,255,255,0.24)' }}>
            {saveMessage}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Overall Pending (Shop 1-8)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 4, color: overallPending > 0 ? '#fec84b' : '#34d399' }}>{formatValue(overallPending)}</div>
          </div>
          {isAdmin ? (
            <button
              onClick={() => setIsInsertModalOpen(true)}
              style={{ padding: '8px 16px', borderRadius: 8, background: '#c49b4f', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(196,155,79,0.3)' }}
            >
              + Add Shop Maintenance
            </button>
          ) : (
            <span style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 700, fontSize: '0.78rem' }}>
              Read-only view
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '12px 18px', borderRadius: '12px', background: 'rgba(196, 155, 79, 0.07)', border: '1px solid rgba(196, 155, 79, 0.2)', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'rgb(120, 64, 14)' }}>📋 Rate Slabs:</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'rgb(95, 102, 95)' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: 'rgb(196, 155, 79)' }}></span>
          <b>Oct 2021 – Jun 2024</b>: ₹1,100 / month (33 months)
        </span>
        <span style={{ color: 'rgba(61, 63, 52, 0.25)' }}>|</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'rgb(95, 102, 95)' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: 'rgb(147, 197, 253)' }}></span>
          <b>Jul 2024 – till Now </b>: ₹1,500 / month (25 months)
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {shops.map((shop) => (
          <button
            key={shop.id}
            type="button"
            onClick={() => setActiveShopId(shop.id)}
            style={{
              border: activeShopId === shop.id ? '1px solid #0b2b26' : '1px solid #d0d5dd',
              borderRadius: 999,
              padding: '10px 14px',
              background: activeShopId === shop.id ? '#0b2b26' : '#f8fafc',
              color: activeShopId === shop.id ? '#fff' : '#344054',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: activeShopId === shop.id ? '0 6px 16px rgba(11,43,38,0.16)' : 'none',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{activeShopId === shop.id ? '🏪' : '🧾'}</span>
            <span>{shop.shopNo}</span>
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1px solid rgba(61,63,52,0.08)', boxShadow: '0 8px 24px rgba(16,24,40,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16, padding: '14px 16px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(244,239,231,0.95), rgba(255,250,242,0.95))', border: '1px solid rgba(61,63,52,0.08)' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#667085' }}>Active Shop</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 800 }}>{activeShop.shopNo}</h3>
            <p style={{ margin: '4px 0 0', color: '#667085', fontSize: '0.9rem' }}>{activeShop.name}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { label: '📞 Contact No', value: formatValue(activeShop.contactNo), sub: 'Owner Contact', accent: '#0b2b26' },
            { label: '🧾 Monthly Maintenance Total', value: formatValue(totalRegularMain), sub: 'Total Due', accent: '#196c6c' },
            { label: '📥 Receipts Total', value: formatValue(totalReceipts), sub: 'Till July 2026', accent: '#065f46' },
            { label: 'Remaining Balance', value: formatValue(totalRegularMain - totalReceipts), sub: 'Overall Pending', accent: '#991b1b' },
          ].map(c => (
            <div key={c.label} style={{
              background: 'rgba(255,250,242,0.97)', border: '1px solid rgba(61,63,52,0.1)',
              borderRadius: 14, padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(11,43,38,0.06)',
            }}>
              <div style={{ fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5f665f', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: c.accent, lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: '0.7rem', color: '#8a9080', marginTop: 5 }}>{c.sub}</div>
              {c.label === '📥 Receipts Total' && activeShop.ledger.some((entry) => Number(entry.receipts) > 0) && (
                <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#8a4b0f', fontWeight: 600, lineHeight: 1.5 }}>
                  {activeShop.ledger
                    .filter((entry) => Number(entry.receipts) > 0)
                    .map((entry) => `${entry.month}: ${formatValue(entry.receipts)}`)
                    .join(' • ')}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid rgba(61,63,52,0.08)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#344054', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📋 Monthly Ledger</div>
            <span style={{ fontSize: '0.74rem', color: '#667085', fontWeight: 700 }}>Year-wise view • grouped by financial year</span>
          </div>

          {yearGroups.map((group) => {
            const isExpanded = expandedYears[group.year];
            return (
              <div key={group.year} style={{ borderRadius: 14, border: '1px solid rgba(61,63,52,0.1)', overflow: 'hidden', background: '#fff' }}>
                <div 
                  onClick={() => setExpandedYears(prev => ({ ...prev, [group.year]: !prev[group.year] }))}
                  style={{ cursor: 'pointer', padding: '12px 14px', background: 'rgba(244,239,231,0.3)', borderBottom: isExpanded ? '1px solid rgba(61,63,52,0.08)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8a6b2e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Financial year</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#101828' }}>{group.year}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ padding: '6px 10px', borderRadius: 999, background: '#f2f4f7', color: '#344054', fontSize: '0.74rem', fontWeight: 700 }}>Yearly Maintenance: {formatValue(group.regularMainTotal)}</span>
                    {group.receiptsTotal > 0 && (
                      <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(16, 185, 129, 0.1)', color: '#047857', fontSize: '0.74rem', fontWeight: 700 }}>Receipts: {formatValue(group.receiptsTotal)}</span>
                    )}
                    <span style={{ fontSize: '1.2rem', color: '#8a6b2e', marginLeft: 4, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                  </div>
                </div>
                
                {isExpanded && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '11px 16px', borderBottom: '2px solid rgba(61,63,52,0.1)', color: '#5f665f', fontWeight: 700, fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', background: 'rgba(244,239,231,0.7)', textAlign: 'left' }}>Month</th>
                          <th style={{ padding: '11px 16px', borderBottom: '2px solid rgba(61,63,52,0.1)', color: '#5f665f', fontWeight: 700, fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', background: 'rgba(244,239,231,0.7)', textAlign: 'left' }}>Monthly Maintenance</th>
                          <th style={{ padding: '11px 16px', borderBottom: '2px solid rgba(61,63,52,0.1)', color: '#5f665f', fontWeight: 700, fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', background: 'rgba(244,239,231,0.7)', textAlign: 'left' }}>Receipts</th>
                          {isAdmin && (
                            <th style={{ padding: '11px 16px', borderBottom: '2px solid rgba(61,63,52,0.1)', color: '#5f665f', fontWeight: 700, fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', background: 'rgba(244,239,231,0.7)', textAlign: 'right' }}>Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {group.entries.map((entry) => (
                          <tr key={entry.month} style={{ background: 'rgba(209, 250, 229, 0.1)' }}>
                            <td style={{ padding: '13px 16px', verticalAlign: 'middle', borderBottom: '1px solid rgba(61,63,52,0.05)' }}>{entry.month}</td>
                            <td style={{ padding: '13px 16px', verticalAlign: 'middle', borderBottom: '1px solid rgba(61,63,52,0.05)' }}>{formatValue(entry.regularMain)}</td>
                            <td style={{ padding: '13px 16px', verticalAlign: 'middle', borderBottom: '1px solid rgba(61,63,52,0.05)' }}>
                              <span style={{
                                padding: entry.receipts ? '4px 8px' : '0',
                                borderRadius: '4px',
                                background: entry.receipts ? '#ecfdf3' : 'transparent',
                                color: entry.receipts ? '#027a48' : 'inherit',
                                fontWeight: entry.receipts ? 600 : 'normal',
                                display: 'inline-block'
                              }}>
                                {formatValue(entry.receipts)}
                              </span>
                            </td>
                            {isAdmin && (
                              <td style={{ padding: '13px 16px', verticalAlign: 'middle', borderBottom: '1px solid rgba(61,63,52,0.05)', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    onClick={() => startEditingEntry(activeShop.id, entry)}
                                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #0b2b26', background: '#fff', color: '#0b2b26', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem' }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEntry(activeShop.id, entry.month)}
                                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #fecdca', background: '#fff5f4', color: '#b42318', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem' }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isAdmin && isInsertModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#101828' }}>Add Shop Maintenance</h3>
            <form onSubmit={handleInsertSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#344054', marginBottom: 8 }}>Select Shops</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {shops.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleShopSelection(s.id)}
                      style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                        border: selectedShops.includes(s.id) ? '1px solid #0b2b26' : '1px solid #d0d5dd',
                        background: selectedShops.includes(s.id) ? '#0b2b26' : '#fff',
                        color: selectedShops.includes(s.id) ? '#fff' : '#344054',
                      }}
                    >
                      {s.shopNo}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#344054', marginBottom: 4 }}>Month</label>
                <input 
                  type="text" 
                  value={insertMonth} 
                  onChange={(e) => setInsertMonth(e.target.value)} 
                  placeholder="e.g. Aug-26"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#344054', marginBottom: 4 }}>Monthly Maintenance Amount</label>
                <input 
                  type="number" 
                  value={insertRegularAmount} 
                  onChange={(e) => setInsertRegularAmount(e.target.value)} 
                  placeholder="e.g. 1500"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#344054', marginBottom: 4 }}>Receipt Amount (Optional)</label>
                <input 
                  type="number" 
                  value={insertAmount} 
                  onChange={(e) => setInsertAmount(e.target.value)} 
                  placeholder="e.g. 1500"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.9rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button 
                  type="button" 
                  onClick={() => setIsInsertModalOpen(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#fff', border: '1px solid #d0d5dd', color: '#344054', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saveStatus === 'saving'}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#0b2b26', border: 'none', color: '#fff', fontWeight: 600, cursor: saveStatus === 'saving' ? 'wait' : 'pointer', opacity: saveStatus === 'saving' ? 0.72 : 1 }}
                >
                  {saveStatus === 'saving' ? 'Saving...' : 'Save Receipts'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdmin && editingEntry && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#101828' }}>Edit Shop Maintenance</h3>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#344054', marginBottom: 4 }}>Month</label>
                <input
                  type="text"
                  value={editingEntry.month}
                  onChange={(event) => handleEditFieldChange('month', event.target.value)}
                  placeholder="e.g. Aug-26"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#344054', marginBottom: 4 }}>Monthly Maintenance Amount</label>
                <input
                  type="number"
                  value={editingEntry.regularMain}
                  onChange={(event) => handleEditFieldChange('regularMain', event.target.value)}
                  placeholder="e.g. 1500"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#344054', marginBottom: 4 }}>Receipt Amount</label>
                <input
                  type="number"
                  value={editingEntry.receipts}
                  onChange={(event) => handleEditFieldChange('receipts', event.target.value)}
                  placeholder="e.g. 1500"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.9rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#fff', border: '1px solid #d0d5dd', color: '#344054', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveStatus === 'saving'}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#0b2b26', border: 'none', color: '#fff', fontWeight: 600, cursor: saveStatus === 'saving' ? 'wait' : 'pointer', opacity: saveStatus === 'saving' ? 0.72 : 1 }}
                >
                  {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
