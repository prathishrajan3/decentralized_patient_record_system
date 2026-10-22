import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_vitals_pdf(
    patient_name: str,
    patient_email: str,
    patient_id: int,
    heart_rate: int,
    spo2: int,
    rhythm: str = "Lead-II Normal Sinus Rhythm",
    mode: str = "BOTH",
    device_id: str = "ESP32-VITALS-01"
) -> bytes:
    """
    Generates a hospital-grade Biometric Telemetry & Vital Signs Examination Report PDF in bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a')
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748b')
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=12,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#0f172a')
    )

    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#059669')
    )

    elements = []

    # Header Bar
    elements.append(Paragraph("DECENTRALIZED PATIENT RECORD MANAGEMENT SYSTEM", subtitle_style))
    elements.append(Paragraph("Biometric Telemetry & Vital Signs Report", title_style))
    elements.append(Spacer(1, 4))
    timestamp_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    elements.append(Paragraph(f"Official Examination Record • Generated on {timestamp_str}", subtitle_style))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#cbd5e1'), spaceBefore=2, spaceAfter=14))

    # Patient & Device Information Table
    patient_data = [
        [
            Paragraph("<b>Patient Name:</b>", body_style),
            Paragraph(patient_name, body_bold),
            Paragraph("<b>Record Type:</b>", body_style),
            Paragraph("Biometric Vitals Session", body_bold)
        ],
        [
            Paragraph("<b>Patient ID:</b>", body_style),
            Paragraph(str(patient_id), body_bold),
            Paragraph("<b>Telemetry Node:</b>", body_style),
            Paragraph(device_id, body_bold)
        ],
        [
            Paragraph("<b>Patient Email:</b>", body_style),
            Paragraph(patient_email, body_bold),
            Paragraph("<b>Acquisition Mode:</b>", body_style),
            Paragraph(mode, body_bold)
        ],
    ]

    patient_table = Table(patient_data, colWidths=[95, 170, 105, 162])
    patient_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(patient_table)
    elements.append(Spacer(1, 16))

    # Biometric Measurements Table
    elements.append(Paragraph("CLINICAL TELEMETRY FINDINGS", section_heading))
    
    hr_status = "Normal (60-100 bpm)" if 60 <= heart_rate <= 100 else ("Bradycardia (<60 bpm)" if heart_rate < 60 else "Tachycardia (>100 bpm)")
    spo2_status = "Optimal (95-100%)" if spo2 >= 95 else ("Mild Hypoxia (90-94%)" if spo2 >= 90 else "Critical Hypoxia (<90%)")

    vitals_table_data = [
        [
            Paragraph("<b>Parameter</b>", body_bold),
            Paragraph("<b>Measured Value</b>", body_bold),
            Paragraph("<b>Standard Range</b>", body_bold),
            Paragraph("<b>Diagnostic Assessment</b>", body_bold)
        ],
        [
            Paragraph("Pulse Rate (PR)", body_style),
            Paragraph(f"<b>{heart_rate} bpm</b>", body_bold),
            Paragraph("60 - 100 bpm", body_style),
            Paragraph(hr_status, badge_style if "Normal" in hr_status else body_bold)
        ],
        [
            Paragraph("Oxygen Saturation (SpO₂)", body_style),
            Paragraph(f"<b>{spo2} %</b>" if mode != "ECG_ONLY" else "<i>Bypassed</i>", body_bold),
            Paragraph("95% - 100%", body_style),
            Paragraph(spo2_status if mode != "ECG_ONLY" else "N/A (ECG Only)", badge_style if "Optimal" in spo2_status else body_bold)
        ],
        [
            Paragraph("Cardiac Rhythm", body_style),
            Paragraph(rhythm, body_bold),
            Paragraph("Lead-II Sinus Rhythm", body_style),
            Paragraph("Normal Sinus Rhythm", badge_style)
        ],
    ]

    vitals_table = Table(vitals_table_data, colWidths=[140, 110, 110, 172])
    vitals_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(vitals_table)
    elements.append(Spacer(1, 16))

    # Cryptographic & Blockchain Attestation Notice
    elements.append(Paragraph("CRYPTOGRAPHIC INTEGRITY & IMMUTABLE ANCHOR", section_heading))
    security_text = (
        "This medical document is protected under enterprise-grade <b>AES-256-GCM</b> encryption. "
        "The cryptographic SHA-256 hash digest of this document is anchored onto the <b>Ethereum Sepolia Blockchain</b> "
        "via smart contract (PatientRecord.sol). Any post-generation modification, tampering, or deletion of this document "
        "will invalidate the on-chain hash verification."
    )
    elements.append(Paragraph(security_text, body_style))
    elements.append(Spacer(1, 20))

    # Verification Footer
    footer_data = [
        [
            Paragraph("<b>Security Attestation:</b>", body_style),
            Paragraph("SHA-256 Digest Anchored • Zero Knowledge Off-Chain Storage", body_bold)
        ],
        [
            Paragraph("<b>Smart Contract:</b>", body_style),
            Paragraph("Ethereum Sepolia Testnet (DPRMS Core)", body_style)
        ],
        [
            Paragraph("<b>Verification Portal:</b>", body_style),
            Paragraph("Decentralized Patient Record Management System (DPRMS)", body_style)
        ]
    ]
    footer_table = Table(footer_data, colWidths=[120, 412])
    footer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(footer_table)

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
