#!/usr/bin/env python3
"""
Majestique Euriska Society Operations & Governance Portal
Presentation Generator for the Workflow & Project Lifecycle Engine
"""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def build_presentation(output_path="Majestique_Euriska_Workflow_Engine_Presentation.pptx"):
    prs = Presentation()
    # Set 16:9 widescreen
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Palette
    C_DARK_TEAL  = RGBColor(11, 43, 38)     # #0b2b26
    C_MID_TEAL   = RGBColor(13, 148, 136)   # #0d9488
    C_EMERALD    = RGBColor(5, 150, 105)    # #059669
    C_GOLD       = RGBColor(196, 155, 79)   # #C49B4F
    C_LIGHT_BG   = RGBColor(248, 250, 252)  # #f8fafc
    C_WHITE      = RGBColor(255, 255, 255)  # #ffffff
    C_TEXT_DARK  = RGBColor(15, 23, 42)     # #0f172a
    C_TEXT_MUTED = RGBColor(100, 116, 139)  # #64748b
    C_CARD_BG    = RGBColor(255, 255, 255)
    C_BORDER     = RGBColor(226, 232, 240)
    C_RED        = RGBColor(225, 29, 72)
    C_PURPLE     = RGBColor(126, 34, 206)

    def add_bg(slide, color=C_LIGHT_BG):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = color
        bg.line.fill.background()
        return bg

    def add_header(slide, title_text, category_text="MAJESTIQUE EURISKA • OPERATIONS ARCHITECTURE"):
        # Category label
        tb_cat = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.5), Inches(0.35))
        tf_cat = tb_cat.text_frame
        tf_cat.word_wrap = True
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.size = Pt(10)
        p_cat.font.bold = True
        p_cat.font.color.rgb = C_MID_TEAL

        # Slide Title
        tb_title = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.5), Inches(0.65))
        tf_title = tb_title.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title_text
        p_title.font.size = Pt(22)
        p_title.font.bold = True
        p_title.font.color.rgb = C_TEXT_DARK

    def add_card(slide, left, top, width, height, bg_color=C_WHITE, border_color=C_BORDER):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1)
        return card

    # =========================================================================
    # SLIDE 1: Title Slide (Dark Executive Aesthetic)
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    add_bg(s1, C_DARK_TEAL)

    # Accent decorative box
    dec = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.5), Inches(0.15), Inches(4.5))
    dec.fill.solid()
    dec.fill.fore_color.rgb = C_GOLD
    dec.line.fill.background()

    tb = s1.shapes.add_textbox(Inches(1.2), Inches(1.4), Inches(11.0), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True

    p0 = tf.paragraphs[0]
    p0.text = "MAJESTIQUE EURISKA CO-OPERATIVE HOUSING SOCIETY"
    p0.font.size = Pt(13)
    p0.font.bold = True
    p0.font.color.rgb = C_GOLD
    p0.space_after = Pt(16)

    p1 = tf.add_paragraph()
    p1.text = "Enterprise Project & Workflow Lifecycle Engine"
    p1.font.size = Pt(36)
    p1.font.bold = True
    p1.font.color.rgb = C_WHITE
    p1.space_after = Pt(12)

    p2 = tf.add_paragraph()
    p2.text = "End-to-End Governance, 10-State Formal Transition Machine, Committee Approval Gates & Execution Architecture"
    p2.font.size = Pt(16)
    p2.font.color.rgb = RGBColor(167, 243, 208)
    p2.space_after = Pt(32)

    p3 = tf.add_paragraph()
    p3.text = "Role: Senior Software Architect, Project Manager & Full-Stack Developer  •  Version: 3.0 Production Ready"
    p3.font.size = Pt(12)
    p3.font.color.rgb = RGBColor(148, 163, 184)

    # =========================================================================
    # SLIDE 2: Executive Summary & Strategic Objectives
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    add_bg(s2)
    add_header(s2, "Executive Summary: Modernizing Society Operations")

    col_w, col_h, top_pos = 3.65, 5.3, 1.6
    cards_data = [
        ("Institutional Accountability", C_MID_TEAL, [
            "Transitioned from unmonitored ad-hoc manager logs to formal enterprise project governance.",
            "Complete traceability of decisions, budget allocations, contractor milestones, and signoffs.",
            "Enforces strict separation of duties between operational execution (Manager/Staff) and financial/governance signoff (Committee)."
        ]),
        ("10-State Lifecycle Control", C_EMERALD, [
            "Formal state machine eliminating bypasses: Draft → Planned → Ready → In Progress → Blocked → In Review → Approved → Completed.",
            "Active blocker and risk mitigation: every blocked task mandates documented impediments and resolution tracking.",
            "Committee Approval Desk ensures zero unverified vendor payments or closures."
        ]),
        ("Production Integration", C_GOLD, [
            "Zero disruption: 100% backward compatible with existing A-Building and Common Task data.",
            "Cloud Firestore rules updated with atomic role guards and append-only tamper-evident audit ledger.",
            "Passed 46 test suites (362 tests) with production PWA bundle built in 5.22s."
        ])
    ]

    for i, (title, accent, bullets) in enumerate(cards_data):
        left_pos = 0.8 + i * (col_w + 0.35)
        add_card(s2, left_pos, top_pos, col_w, col_h)
        
        # Header inside card
        tb = s2.shapes.add_textbox(Inches(left_pos + 0.25), Inches(top_pos + 0.25), Inches(col_w - 0.5), Inches(0.6))
        p = tb.text_frame.paragraphs[0]
        p.text = title
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = accent

        # Bullets
        tb_b = s2.shapes.add_textbox(Inches(left_pos + 0.25), Inches(top_pos + 0.95), Inches(col_w - 0.5), Inches(col_h - 1.2))
        tf_b = tb_b.text_frame
        tf_b.word_wrap = True
        for b_idx, bullet in enumerate(bullets):
            p_b = tf_b.paragraphs[0] if b_idx == 0 else tf_b.add_paragraph()
            p_b.text = "•  " + bullet
            p_b.font.size = Pt(12)
            p_b.font.color.rgb = C_TEXT_DARK
            p_b.space_after = Pt(14)

    # =========================================================================
    # SLIDE 3: Before vs After: Architectural Evolution
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    add_bg(s3)
    add_header(s3, "Architecture Transformation: Before vs. After")

    half_w = 5.65
    # Left Box: Before (Legacy)
    add_card(s3, 0.8, 1.6, half_w, 5.3, bg_color=RGBColor(254, 242, 242), border_color=RGBColor(254, 205, 211))
    tb_old = s3.shapes.add_textbox(Inches(1.1), Inches(1.8), Inches(half_w - 0.6), Inches(4.8))
    tf_old = tb_old.text_frame
    tf_old.word_wrap = True
    p = tf_old.paragraphs[0]
    p.text = "PREVIOUS STATE: Ad-Hoc Task Tracker"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_RED
    p.space_after = Pt(12)

    old_points = [
        "Flat, static 2-tab lists (A Building vs Common) with no multi-project clustering.",
        "Only 4 rudimentary statuses ('Pending', 'In Progress', 'Done', 'On Hold').",
        "No transition rules: any user could instantly toggle a task from Pending straight to Done without evidence.",
        "No Committee review or approval gates before payment release or work signoff.",
        "No dependency validation: tasks could be started before prerequisite civil works finished.",
        "Blockers and risks were tracked as free text remarks with no resolution accountability.",
        "Zero integration with formal audit ledger or real-time proactive notification alerts."
    ]
    for pt in old_points:
        p_pt = tf_old.add_paragraph()
        p_pt.text = "✗  " + pt
        p_pt.font.size = Pt(11)
        p_pt.font.color.rgb = RGBColor(153, 27, 27)
        p_pt.space_after = Pt(10)

    # Right Box: After (Engine)
    add_card(s3, 6.85, 1.6, half_w, 5.3, bg_color=RGBColor(240, 253, 250), border_color=RGBColor(153, 246, 228))
    tb_new = s3.shapes.add_textbox(Inches(7.15), Inches(1.8), Inches(half_w - 0.6), Inches(4.8))
    tf_new = tb_new.text_frame
    tf_new.word_wrap = True
    p = tf_new.paragraphs[0]
    p.text = "NEW STATE: Central Workflow Engine"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_MID_TEAL
    p.space_after = Pt(12)

    new_points = [
        "Strategic multi-project grouping with budgets, owners, scope narratives & milestones.",
        "10-State Formal Workflow: Draft, Planned, Ready, In Progress, Blocked, In Review, Approved, Rejected, Completed, Cancelled.",
        "Mathematically enforced state machine prohibiting invalid status skips.",
        "Executive Committee Approval Desk with 1-click Approve / Reject with remarks.",
        "Automated dependency checks blocking execution until prerequisites pass acceptance.",
        "Mandatory Blocker reason on hold, and mandatory resolution audit trail upon unblocking.",
        "Tamper-evident audit logging in Firestore /auditLogs and real-time Notification Center alerts."
    ]
    for pt in new_points:
        p_pt = tf_new.add_paragraph()
        p_pt.text = "✓  " + pt
        p_pt.font.size = Pt(11)
        p_pt.font.color.rgb = RGBColor(4, 120, 87)
        p_pt.space_after = Pt(10)

    # =========================================================================
    # SLIDE 4: The 10-State Formal Workflow Transition Model
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    add_bg(s4)
    add_header(s4, "The 10-State Formal Workflow Lifecycle", "WORKFLOW ENGINE • STATE MACHINE SPECIFICATION")

    grid_cards = [
        ("1. Draft", "Initial idea, scope formulation & committee briefing", "#64748b", ["To: Planned", "To: Cancelled"]),
        ("2. Planned", "Scope defined, target deadline & estimated budget allocated", "#1d4ed8", ["To: Ready", "To: Draft"]),
        ("3. Ready", "Prerequisites verified, vendor empanelled, ready for kickoff", "#0f766e", ["To: In Progress", "To: Blocked"]),
        ("4. In Progress", "Actively underway on site by assigned owner or vendor", "#b45309", ["To: In Review", "To: Blocked"]),
        ("5. Blocked", "Impeded by supply, vendor, or access (Requires Reason)", "#b91c1c", ["To: In Progress", "To: Ready"]),
        ("6. In Review", "Deliverables completed; submitted for Committee inspection", "#7e22ce", ["To: Approved", "To: Rejected"]),
        ("7. Approved", "Signed off by Approver (Chairman, Secretary, Treasurer)", "#0369a1", ["To: Completed", "To: In Progress"]),
        ("8. Rejected", "Review failed; returned to assignee with corrective notes", "#be123c", ["To: In Progress", "To: Cancelled"]),
        ("9. Completed", "All acceptance checks verified, warranty archived, closed", "#15803d", ["Closed State", "Reopen: Admin"]),
        ("10. Cancelled", "De-scoped, superseded or terminated with recorded notes", "#475569", ["Closed State", "Reopen: Admin"]),
    ]

    card_w, card_h = 2.2, 2.45
    for idx, (st_name, st_desc, hex_c, transitions) in enumerate(grid_cards):
        row = idx // 5
        col = idx % 5
        c_left = 0.8 + col * (card_w + 0.2)
        c_top  = 1.6 + row * (card_h + 0.3)

        add_card(s4, c_left, c_top, card_w, card_h)
        
        # Color bar indicator on top of card
        c_bar = s4.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(c_left), Inches(c_top), Inches(card_w), Inches(0.08))
        c_bar.fill.solid()
        c_bar.fill.fore_color.rgb = C_MID_TEAL if "Progress" in st_name or "Ready" in st_name else C_GOLD if "Planned" in st_name else C_RED if "Blocked" in st_name else C_PURPLE if "Review" in st_name else C_EMERALD if "Completed" in st_name or "Approved" in st_name else C_TEXT_MUTED
        c_bar.line.fill.background()

        tb_st = s4.shapes.add_textbox(Inches(c_left + 0.1), Inches(c_top + 0.15), Inches(card_w - 0.2), Inches(card_h - 0.3))
        tf_st = tb_st.text_frame
        tf_st.word_wrap = True

        p = tf_st.paragraphs[0]
        p.text = st_name
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = C_TEXT_DARK
        p.space_after = Pt(4)

        p_d = tf_st.add_paragraph()
        p_d.text = st_desc
        p_d.font.size = Pt(9.5)
        p_d.font.color.rgb = C_TEXT_MUTED
        p_d.space_after = Pt(8)

        for tr in transitions:
            p_tr = tf_st.add_paragraph()
            p_tr.text = "→ " + tr
            p_tr.font.size = Pt(9)
            p_tr.font.bold = True
            p_tr.font.color.rgb = C_MID_TEAL

    # =========================================================================
    # SLIDE 5: Governance, RBAC & Committee Approval Gates
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    add_bg(s5)
    add_header(s5, "Role-Based Access Control (RBAC) & Approval Gates")

    w_col = 3.65
    roles_cards = [
        ("Executive Approvers", "Chairman, Secretary, Treasurer, Admin", C_PURPLE, [
            "Exclusive authority to advance tasks from 'In Review' to 'Approved' or 'Rejected'.",
            "Authority to sign off on final project completion and invoice release.",
            "Override privileges to reopen closed or cancelled projects with recorded audit rationale.",
            "Supervisory dashboard view of all society portfolios and pending approvals queue."
        ]),
        ("Operational Leads & Assignees", "Estate Manager, Staff & Leads", C_MID_TEAL, [
            "Create and schedule tasks under committee initiatives.",
            "Transition tasks through 'Draft', 'Planned', 'Ready', and 'In Progress'.",
            "Mandated to submit tasks to 'In Review' with proof of completion & test certificates.",
            "Forbidden from self-approving work, enforcing strict segregation of duties."
        ]),
        ("Society Residents & Audits", "Wing A Flat Owners & Tenants", C_EMERALD, [
            "Full read-only transparency into society ongoing initiatives and modernization progress.",
            "Real-time visibility into infrastructure punchlists, solar status, and water tank waterproofing.",
            "Cryptographically enforced zero-write access to prevent unauthorized status changes.",
            "Complete trust through public compliance visibility."
        ])
    ]

    for idx, (grp_title, grp_sub, accent, bullets) in enumerate(roles_cards):
        c_left = 0.8 + idx * (w_col + 0.35)
        add_card(s5, c_left, 1.6, w_col, 5.3)

        tb = s5.shapes.add_textbox(Inches(c_left + 0.25), Inches(1.85), Inches(w_col - 0.5), Inches(0.8))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = grp_title
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = accent

        p_sub = tf.add_paragraph()
        p_sub.text = grp_sub
        p_sub.font.size = Pt(11)
        p_sub.font.bold = True
        p_sub.font.color.rgb = C_GOLD

        tb_b = s5.shapes.add_textbox(Inches(c_left + 0.25), Inches(2.75), Inches(w_col - 0.5), Inches(4.0))
        tf_b = tb_b.text_frame
        tf_b.word_wrap = True
        for b_idx, bullet in enumerate(bullets):
            p_b = tf_b.paragraphs[0] if b_idx == 0 else tf_b.add_paragraph()
            p_b.text = "•  " + bullet
            p_b.font.size = Pt(11.5)
            p_b.font.color.rgb = C_TEXT_DARK
            p_b.space_after = Pt(14)

    # =========================================================================
    # SLIDE 6: UI/UX Multi-View Implementation
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    add_bg(s6)
    add_header(s6, "UI/UX Architecture: 5 Specialized Views")

    views = [
        ("1. Executive Dashboard", "Real-time KPI metrics displaying Active Projects, Progress Ring %, Blocked Counts, Overdue Tasks, and Total Budget vs Actual Spend."),
        ("2. Interactive Kanban", "Phase-based lanes (Planning, Ready, In Progress, Blocked, Review, Completed) with 1-click status advances, priority badges, and overdue chips."),
        ("3. Comprehensive List & Table", "Data-dense grid with multi-column sorting, multi-attribute filtering (Project, Priority, Status, Assignee), instant search, and CSV export."),
        ("4. Committee Approval Desk", "Dedicated executive queue filtering tasks in 'In Review' state. Approvers review completion notes and execute 1-click Approve or Reject."),
        ("5. Task Detail & Action Drawer", "Slide-over panel containing technical scope, quality acceptance checklist, blocker risk log, cost breakdown, and chronological audit history.")
    ]

    for idx, (v_title, v_desc) in enumerate(views):
        top_pos = 1.6 + idx * 1.05
        add_card(s6, 0.8, top_pos, 11.733, 0.9, bg_color=C_WHITE)

        # Icon box
        num_box = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.95), Inches(top_pos + 0.15), Inches(0.6), Inches(0.6))
        num_box.fill.solid()
        num_box.fill.fore_color.rgb = C_MID_TEAL
        num_box.line.fill.background()
        p = num_box.text_frame.paragraphs[0]
        p.text = str(idx + 1)
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = C_WHITE
        p.alignment = PP_ALIGN.CENTER

        tb = s6.shapes.add_textbox(Inches(1.75), Inches(top_pos + 0.1), Inches(10.6), Inches(0.7))
        tf = tb.text_frame
        tf.word_wrap = True
        p_t = tf.paragraphs[0]
        p_t.text = v_title
        p_t.font.size = Pt(13)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEXT_DARK

        p_d = tf.add_paragraph()
        p_d.text = v_desc
        p_d.font.size = Pt(10.5)
        p_d.font.color.rgb = C_TEXT_MUTED

    # =========================================================================
    # SLIDE 7: Live Society Projects & Case Studies
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    add_bg(s7)
    add_header(s7, "Pre-Seeded Production Society Initiatives")

    case_studies = [
        ("PRJ-SOLAR-2026: Rooftop Solar PV & Net Metering", "Budget: ₹8,50,000  •  Target: Nov 2026  •  Lead: Amit (Secretary)", [
            "Scope: 50 kWp Rooftop Grid-Tied PV system to offset common area electricity bill.",
            "Tasks: DISCOM net metering sanction (Approved), galvalume mounting structure (In Progress).",
            "Impact: Saves society ₹65,000/month in Tata Power common electricity tariffs."
        ]),
        ("PRJ-WATER-2026: 5,39,400L Water Tanks Waterproofing", "Budget: ₹4,20,000  •  Target: Dec 2026  •  Lead: Siddu (Manager)", [
            "Scope: Food-grade dual-layer polymer epoxy slurry for underground & overhead tanks.",
            "Blocker Management: Chamber 1 task blocked due to specialized solvent delivery delay.",
            "Quality Inspection: Includes bacterial potability lab test certificate before signoff."
        ]),
        ("PRJ-FIRE-2026: Fire Safety NOC & Pump Overhaul", "Budget: ₹1,80,000  •  Target: Oct 2026  •  Lead: Executive Committee", [
            "Scope: Hydrant pump pressure overhaul to 7.5 bar and diesel backup generator servicing.",
            "Review Gate: In Review awaiting Committee signoff of Form B inspection report.",
            "Quality Inspection: Jockey pump auto-trigger upon line pressure drop verified."
        ]),
        ("PRJ-BUILDER-2026: Builder Handover Punchlist Resolution", "Budget: Legal Fund  •  Target: Dec 2026  •  Lead: Legal Committee", [
            "Scope: Formal rectification notice under MOFA for 47 forensic audit defects with builder Eisha.",
            "Critical Tasks: Basement pillar P-12 seepage rectification & conveyance deed filing.",
            "Milestone: Joint site inspection completed; escalation hearing scheduled."
        ])
    ]

    card_h = 2.45
    card_w = 5.65
    for idx, (title, meta, bullets) in enumerate(case_studies):
        row = idx // 2
        col = idx % 2
        c_left = 0.8 + col * (card_w + 0.433)
        c_top  = 1.6 + row * (card_h + 0.3)

        add_card(s7, c_left, c_top, card_w, card_h)

        tb = s7.shapes.add_textbox(Inches(c_left + 0.25), Inches(c_top + 0.15), Inches(card_w - 0.5), Inches(card_h - 0.3))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = C_MID_TEAL
        p.space_after = Pt(2)

        p_m = tf.add_paragraph()
        p_m.text = meta
        p_m.font.size = Pt(10)
        p_m.font.bold = True
        p_m.font.color.rgb = C_GOLD
        p_m.space_after = Pt(6)

        for b in bullets:
            p_b = tf.add_paragraph()
            p_b.text = "• " + b
            p_b.font.size = Pt(10)
            p_b.font.color.rgb = C_TEXT_DARK
            p_b.space_after = Pt(3)

    # =========================================================================
    # SLIDE 8: Quality Assurance, Verification & Build Results
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    add_bg(s8)
    add_header(s8, "Testing & Quality Verification: 100% Passing")

    metrics_boxes = [
        ("46 / 46", "Test Suites Passed", C_MID_TEAL),
        ("362 / 362", "Unit Tests Passing", C_EMERALD),
        ("5.22s", "Vite Build Time", C_GOLD),
        ("0 Errors", "ESLint Security & Code Quality", C_DARK_TEAL)
    ]

    for idx, (val, lbl, color) in enumerate(metrics_boxes):
        b_left = 0.8 + idx * (2.8 + 0.177)
        add_card(s8, b_left, 1.6, 2.8, 1.4)
        
        tb = s8.shapes.add_textbox(Inches(b_left + 0.1), Inches(1.75), Inches(2.6), Inches(1.1))
        tf = tb.text_frame
        p_v = tf.paragraphs[0]
        p_v.text = val
        p_v.font.size = Pt(28)
        p_v.font.bold = True
        p_v.font.color.rgb = color
        p_v.alignment = PP_ALIGN.CENTER

        p_l = tf.add_paragraph()
        p_l.text = lbl
        p_l.font.size = Pt(10.5)
        p_l.font.bold = True
        p_l.font.color.rgb = C_TEXT_MUTED
        p_l.alignment = PP_ALIGN.CENTER

    # Verification Details Card
    add_card(s8, 0.8, 3.25, 11.733, 3.65)
    tb_v = s8.shapes.add_textbox(Inches(1.1), Inches(3.45), Inches(11.1), Inches(3.2))
    tf_v = tb_v.text_frame
    tf_v.word_wrap = True

    p = tf_v.paragraphs[0]
    p.text = "Comprehensive Test Suite Coverage"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_after = Pt(10)

    test_bullets = [
        "workflowService.test.js: 12 tests verifying all valid and invalid transitions, role checks, blocker requirements, dependency locks, and metrics.",
        "WorkflowManager.test.jsx: 7 tests verifying Kanban lanes, List filtering, Projects overview, Approval desk, and Task Detail drawer.",
        "rbacService.test.js: 7 tests ensuring role hierarchy (Admin, Chairman, Secretary, Treasurer, Manager, Security, Resident).",
        "Firestore Security Rules: Validated /workflowProjects and /workflowTasks collections with manager/admin write and authenticated read.",
        "Production Bundle: Verified Vite 6.3.5 chunking with Progressive Web App (PWA) precache generation in dist/."
    ]
    for b in test_bullets:
        p_b = tf_v.add_paragraph()
        p_b.text = "✓  " + b
        p_b.font.size = Pt(11.5)
        p_b.font.color.rgb = C_TEXT_DARK
        p_b.space_after = Pt(8)

    # =========================================================================
    # SLIDE 9: Deployment, Rollback & Future Roadmap
    # =========================================================================
    s9 = prs.slides.add_slide(blank_layout)
    add_bg(s9)
    add_header(s9, "Deployment Strategy & Future Roadmap")

    add_card(s9, 0.8, 1.6, 5.65, 5.3)
    tb_dep = s9.shapes.add_textbox(Inches(1.1), Inches(1.85), Inches(5.05), Inches(4.8))
    tf_dep = tb_dep.text_frame
    tf_dep.word_wrap = True
    p = tf_dep.paragraphs[0]
    p.text = "Zero-Risk Deployment & Safeguards"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_MID_TEAL
    p.space_after = Pt(14)

    dep_points = [
        "Isolated Data Collections: All workflow entities write to new collections (workflowProjects, workflowTasks) without modifying live legacy records.",
        "Local Storage Fallback: Automatic offline and dev mode preview fallback when Firebase session is inactive.",
        "Firestore Rule Deployment: Deploy rules via `npx firebase-tools deploy --only firestore:rules`.",
        "Hosting Deployment: Deploy static build via `npx firebase-tools deploy --only hosting`.",
        "Instant Rollback: Standard git revert HEAD allows instantaneous rollback with zero data contamination."
    ]
    for pt in dep_points:
        p_pt = tf_dep.add_paragraph()
        p_pt.text = "•  " + pt
        p_pt.font.size = Pt(11)
        p_pt.font.color.rgb = C_TEXT_DARK
        p_pt.space_after = Pt(12)

    add_card(s9, 6.85, 1.6, 5.65, 5.3)
    tb_fut = s9.shapes.add_textbox(Inches(7.15), Inches(1.85), Inches(5.05), Inches(4.8))
    tf_fut = tb_fut.text_frame
    tf_fut.word_wrap = True
    p = tf_fut.paragraphs[0]
    p.text = "Next Phase Roadmap"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_GOLD
    p.space_after = Pt(14)

    fut_points = [
        "Cloud Function Webhooks: Automated WhatsApp and email notifications to committee approvers when tasks enter 'In Review'.",
        "Vendor Extranet Portal: Restricted external vendor logins for uploading lab reports, warranties, and photographic proofs.",
        "Gantt Chart Interactive Visualizer: Drag-to-reschedule milestone timeline with critical path analysis.",
        "Automated Accounting Bridge: Auto-generate debit vouchers in the Expense Tracker once tasks reach 'Approved' state."
    ]
    for pt in fut_points:
        p_pt = tf_fut.add_paragraph()
        p_pt.text = "→  " + pt
        p_pt.font.size = Pt(11)
        p_pt.font.color.rgb = C_TEXT_DARK
        p_pt.space_after = Pt(12)

    # Save presentation
    prs.save(output_path)
    print(f"Presentation saved successfully to: {output_path}")

if __name__ == "__main__":
    build_presentation()
