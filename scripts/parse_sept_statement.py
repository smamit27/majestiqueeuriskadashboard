#!/usr/bin/env python3
"""Parse raw September 2026 bank statement into structured JSON."""
import json, re

RAW_FILE = '/Users/sweta/Amit_Development/Majestique_Euriska_Dashboard/scripts/raw_sept_statement.txt'
OUT_FILE = '/Users/sweta/Amit_Development/Majestique_Euriska_Dashboard/src/components/organisms/septemberStatementData.json'

with open(RAW_FILE, 'r') as f:
    raw = f.read()

raw = raw.replace('\r\n', '\n').replace('\r', '\n')
all_lines = raw.strip().split('\n')

# Clean junk lines
clean = []
for l in all_lines:
    s = l.strip()
    if not s or s.startswith('****') or 'STATEMENT SUMMARY' in s:
        continue
    if re.match(r'^Opening Balance', s) or re.match(r'^Dr Count', s) or 'Cr Count' in s:
        continue
    if re.match(r'^\d+\.\d+\s', s) and '\t' in l and len(l.strip().split('\t')) > 3:
        continue
    # Skip trailing empty-ish lines like " \t \t ..."
    if all(c in ' \t' for c in s):
        continue
    clean.append(l)

# Find block boundaries (lines starting with DD/MM/YY\t)
block_starts = []
for i, line in enumerate(clean):
    if re.match(r'^\d{2}/\d{2}/\d{2}\t', line):
        block_starts.append(i)

transactions = []
for idx, start_i in enumerate(block_starts):
    end_i = block_starts[idx + 1] if idx + 1 < len(block_starts) else len(clean)
    block_lines = clean[start_i:end_i]
    
    first_tabs = block_lines[0].split('\t')
    date = first_tabs[0].strip()
    
    # --- Case 1: single-line (7+ tab fields with closing balance) ---
    if len(first_tabs) >= 7:
        cb_str = first_tabs[6].strip()
        if cb_str and re.match(r'^[\d.]+$', cb_str):
            narr = first_tabs[1].strip()
            ref = first_tabs[2].strip()
            wd_str = first_tabs[4].strip()
            dp_str = first_tabs[5].strip()
            
            wd = float(wd_str) if wd_str and re.match(r'^[\d.]+$', wd_str) else 0
            dp = float(dp_str) if dp_str and re.match(r'^[\d.]+$', dp_str) else 0
            cb = float(cb_str)
            
            if wd > 0 or dp > 0:
                transactions.append({
                    'date': date,
                    'type': 'DR' if wd > 0 else 'CR',
                    'desc': narr,
                    'ref': ref,
                    'amount': round(wd if wd > 0 else dp, 2),
                    'bal': round(cb, 2)
                })
            continue
    
    # --- Case 2: multi-line ---
    narration = first_tabs[1].strip() if len(first_tabs) > 1 else ''
    
    # Scan remaining lines in the block for narration + amounts
    ref = ''
    for j in range(1, len(block_lines)):
        sub_line = block_lines[j]
        sub_tabs = sub_line.split('\t')
        
        # Check if this is the amounts line (has 4+ tab fields, last is numeric)
        if len(sub_tabs) >= 4 and re.match(r'^[\d.]+$', sub_tabs[-1].strip()):
            ref = sub_tabs[0].strip()
            
            if len(sub_tabs) >= 5:
                wd_str = sub_tabs[2].strip()
                dp_str = sub_tabs[3].strip()
                cb_str = sub_tabs[4].strip()
            else:
                wd_str = ''
                dp_str = sub_tabs[2].strip()
                cb_str = sub_tabs[3].strip()
            
            wd = float(wd_str) if wd_str and re.match(r'^[\d.]+$', wd_str) else 0
            dp = float(dp_str) if dp_str and re.match(r'^[\d.]+$', dp_str) else 0
            cb = float(cb_str) if cb_str and re.match(r'^[\d.]+$', cb_str) else 0
            
            if (wd > 0 or dp > 0) and cb > 0:
                narration = re.sub(r'\s+', ' ', narration).strip()
                transactions.append({
                    'date': date,
                    'type': 'DR' if wd > 0 else 'CR',
                    'desc': narration,
                    'ref': ref,
                    'amount': round(wd if wd > 0 else dp, 2),
                    'bal': round(cb, 2)
                })
            break
        else:
            # Narration continuation (skip standalone ref numbers)
            text = sub_line.strip()
            if text and not re.match(r'^(IN\d{14,17}|YESF\d{12,15}|AXISCN\d{10}|0{13,16})$', text):
                narration += (' ' if narration else '') + text

# --- Validation ---
total_debits = round(sum(t['amount'] for t in transactions if t['type'] == 'DR'), 2)
total_credits = round(sum(t['amount'] for t in transactions if t['type'] == 'CR'), 2)
dr_count = len([t for t in transactions if t['type'] == 'DR'])
cr_count = len([t for t in transactions if t['type'] == 'CR'])

print(f"Parsed {len(transactions)} transactions")
print(f"Debits:  {total_debits:>12.2f} (exp: 237,871.00)  Count: {dr_count} (exp: 11)")
print(f"Credits: {total_credits:>12.2f} (exp: 339,036.08)  Count: {cr_count} (exp: 84)")
print(f"Closing: {transactions[-1]['bal'] if transactions else 'N/A'} (exp: 564,090.95)")

# Running balance check
prev = 462925.87
errs = 0
for t in transactions:
    calc = round(prev - t['amount'], 2) if t['type'] == 'DR' else round(prev + t['amount'], 2)
    if abs(calc - t['bal']) > 0.02:
        errs += 1
    prev = t['bal']
print(f"Balance mismatches: {errs}")

# --- Build vendor analysis ---
vendor_map = {}
for t in transactions:
    if t['type'] != 'DR': continue
    upper = t['desc'].upper()
    if 'SELF' in upper and 'CHQ' in upper:
        vn, vt = 'Self Withdrawal (Mohammedwadi)', 'Cash Handling'
    elif 'SANDIP RAJU' in upper:
        vn, vt = 'Sandip Raju Wavare', 'Security Guard'
    elif 'SIDHAVARAM' in upper or 'SIDHARAM' in upper:
        vn, vt = 'Sidharam Parmeshwar', 'Staff Wages'
    elif 'SHUBHAM' in upper:
        vn, vt = 'Shubham Enterprises', 'Repairs & Operations'
    elif 'MSEDCL' in upper:
        vn, vt = 'MSEDCL', 'Electricity Utility'
    elif 'SAI SWIMMING' in upper:
        vn, vt = 'Sai Swimming Pool M', 'Pool Upkeep'
    elif 'MAJESTIQUE EURISKA C' in upper:
        vn, vt = 'Majestique Euriska C Bldg', 'Inter-Building Transfer'
    elif 'MAJESTIQUE EURISKA' in upper:
        vn, vt = 'Majestique Euriska (Admin)', 'Inter-Building Transfer'
    elif 'IGS ENTERPRISES' in upper:
        vn, vt = 'IGS Enterprises', 'Miscellaneous'
    elif 'RAJIB MADAN' in upper:
        vn, vt = 'Rajib Madan Patra', 'Staff Wages'
    elif 'SHREE SWAMI' in upper:
        vn, vt = 'Shree Swami Samarth', 'Housekeeping'
    else:
        vn, vt = t['desc'], 'Miscellaneous'
    
    if vn not in vendor_map:
        vendor_map[vn] = {'count': 0, 'total': 0, 'type': vt, 'refs': []}
    vendor_map[vn]['count'] += 1
    vendor_map[vn]['total'] += t['amount']
    vendor_map[vn]['refs'].append(t['ref'][-3:])

vendors_data = [
    {'rank': i+1, 'name': n, 'count': v['count'], 'total': round(v['total'],2), 'type': v['type'],
     'cheque': ', '.join(f"CHQ {r}" for r in v['refs'])}
    for i, (n, v) in enumerate(sorted(vendor_map.items(), key=lambda x: -x[1]['total']))
]

# --- Income categories ---
cr_txs = [t for t in transactions if t['type'] == 'CR']
cat_preds = [
    ('Maintenance (Vivish PG)', lambda t: 'VIVISH' in t['desc'].upper(), '#196c6c'),
    ('Inter-Building Inflows', lambda t: 'EURISKA C BLDG' in t['desc'].upper() or 'EURISKA B BUILD' in t['desc'].upper(), '#3b82f6'),
    ('Cheque Deposits (CTS)', lambda t: 'CHQ DEP' in t['desc'].upper(), '#31553e'),
    ('Refund (Tata Play)', lambda t: 'TATA PLAY' in t['desc'].upper(), '#5f665f'),
    ('UPI Settlements', lambda t: 'UPI SETTLEMENT' in t['desc'].upper(), '#a855f7'),
    ('Direct Member IMPS', lambda t: 'IMPS' in t['desc'].upper(), '#b98216'),
]
income_categories = []
total_cat = 0
for cname, pred, color in cat_preds:
    matched = [t for t in cr_txs if pred(t)]
    if matched:
        val = round(sum(t['amount'] for t in matched), 2)
        income_categories.append({'name': cname, 'value': val, 'count': len(matched), 'color': color})
        total_cat += val
other_cr_val = round(total_credits - total_cat, 2)
if other_cr_val > 0.01:
    income_categories.append({'name': 'Other Credits', 'value': other_cr_val, 'count': 0, 'color': '#c2644a'})

# --- Expense categories ---
exp_map = {
    'Electricity Utility (MSEDCL)': ('Electricity Utility',), 
    'Security & Staff': ('Security Guard', 'Staff Wages', 'Housekeeping'),
    'Repairs & Operations': ('Repairs & Operations',),
    'Society Admin / Cash': ('Cash Handling',),
    'Inter-Building Outflows': ('Inter-Building Transfer',),
    'Pool Upkeep': ('Pool Upkeep',),
}
exp_colors = {'Electricity Utility (MSEDCL)': '#b98216', 'Security & Staff': '#196c6c', 'Repairs & Operations': '#5f665f',
              'Society Admin / Cash': '#ef4444', 'Inter-Building Outflows': '#3b82f6', 'Pool Upkeep': '#0284c7'}
expense_categories = []
exp_total = 0
for ename, vtypes in exp_map.items():
    val = round(sum(v['total'] for v in vendor_map.values() if v['type'] in vtypes), 2)
    if val > 0:
        expense_categories.append({'name': ename, 'value': val, 'color': exp_colors[ename]})
        exp_total += val
misc_val = round(total_debits - exp_total, 2)
if misc_val > 0.01:
    expense_categories.append({'name': 'Miscellaneous', 'value': misc_val, 'color': '#c2644a'})
expense_categories.sort(key=lambda x: -x['value'])

# --- Timeline ---
dm = {}
for t in transactions:
    k = t['date'][:5]
    if k not in dm: dm[k] = {'date': k, 'balance': 0, 'credit': 0, 'debit': 0}
    if t['type'] == 'CR': dm[k]['credit'] += t['amount']
    if t['type'] == 'DR': dm[k]['debit'] += t['amount']
    dm[k]['balance'] = t['bal']
timeline_data = [{'date': v['date'], 'balance': round(v['balance'],2), 'credit': round(v['credit'],2), 'debit': round(v['debit'],2)}
                 for v in [dm[k] for k in sorted(dm, key=lambda x: (int(x[3:5]), int(x[0:2])))]]

# --- Write output ---
result = {
    'period': 'September 1, 2026 - September 30, 2026',
    'openingBalance': 462925.87,
    'closingBalance': 564090.95,
    'totalCredits': total_credits,
    'totalDebits': total_debits,
    'netCashFlow': round(total_credits - total_debits, 2),
    'vendorsData': vendors_data,
    'incomeCategories': income_categories,
    'expenseCategories': expense_categories,
    'timelineData': timeline_data,
    'transactionsList': transactions
}

with open(OUT_FILE, 'w') as f:
    json.dump(result, f, indent=2)

print(f"\nWrote: {OUT_FILE}")
print(f"Vendors: {len(vendors_data)}, Income: {len(income_categories)}, Expense: {len(expense_categories)}, Timeline: {len(timeline_data)}")
