"""
InsightFlow — University ERP / Student Information System (SIS) Integration Simulator

Simulates real-time enterprise connectivity to Campus ERP / SIS:
  - Real-time student academic standing verification
  - Fee clearance & ledger status check
  - Library clearance status check
  - Official Verification Digest (SHA-256) for printable slips and certificates
"""
import hashlib
from django.utils import timezone


class ERPIntegrationService:
    """
    Simulated University ERP / SIS connector for institutional workflow validation.
    """

    @classmethod
    def get_student_erp_profile(cls, student_user) -> dict:
        """
        Retrieves real-time student record from Campus SIS.
        """
        email = student_user.email
        # Generate stable mock roll number & student ID
        roll_hash = abs(hash(email)) % 900 + 100
        erp_student_id = f'MIT-MCA2025-{roll_hash}'

        return {
            'erp_student_id': erp_student_id,
            'full_name': student_user.full_name or student_user.email.split('@')[0].replace('.', ' ').title(),
            'email': email,
            'program': 'Master of Computer Applications (MCA)',
            'current_semester': 'Semester III',
            'academic_year': '2025-2027',
            'academic_standing': 'Good Standing',
            'cgpa': 8.64,
            'fee_dues_status': 'CLEARED',
            'fee_clearance_date': '2026-08-15',
            'library_clearance': 'CLEARED',
            'active_enrollment': True,
            'last_erp_sync': timezone.now().isoformat(),
            'erp_provider': 'Enterprise Campus ERP (v4.2.1-edu)',
        }

    @classmethod
    def generate_verification_digest(cls, service_request) -> dict:
        """
        Produces a cryptographic SHA-256 verification hash and security digest
        used for official printed acknowledgment slips and institutional audit certificates.
        """
        raw_token = f'{service_request.id}:{service_request.reference_number}:{service_request.student.email}:{service_request.created_at.isoformat()}'
        sha256_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

        return {
            'verification_code': f'VER-{sha256_hash[:8].upper()}-{sha256_hash[8:16].upper()}',
            'full_hash': sha256_hash,
            'issuer': 'MIT World Peace University — InsightFlow Institutional Governance Hub',
            'timestamp': timezone.now().isoformat(),
            'verified_status': service_request.status.upper(),
        }
