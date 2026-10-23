# Security Specification - VetGo Veterinary Platform

## 1. Data Invariants
1. **User Identity Invariant**: A user document in `/users/{userId}` can only be read or written by the authenticated owner where `request.auth.uid == userId` or the bootstrapped admin (`p.nikolas3@gmail.com`).
2. **Relational Ownership**: Every business record (`clinics`, `surgeons`, `tutors`, `patients`, `anesthesias`, `appointments`, `financial_entries`, `inventory_items`, `consultations`, `documents`) must belong to an authenticated user (`userId == request.auth.uid`).
3. **No Cross-User Leaks**: A veterinarian cannot view, edit, or delete another veterinarian's patients, records, finances, clinics, or surgeons.
4. **ID Poisoning Guard**: All document IDs must be strings of at most 128 characters matching `^[a-zA-Z0-9_\-]+$`.
5. **PII Isolation**: Contact data (tutor phone, CPF, email) is isolated and strictly bounded to authenticated queries where `resource.data.userId == request.auth.uid`.
6. **Immutability of Author & CreatedAt**: `userId` and `createdAt` cannot be modified once set.
7. **Action-Based Updates**: Updates must validate allowed keys via `affectedKeys().hasOnly(...)` and retain schema integrity.
8. **Admin Privilege**: The master administrator (`p.nikolas3@gmail.com`) can read and manage platform records for operational maintenance.

## 2. The "Dirty Dozen" Payloads (Adversarial Tests)

1. **Spoofed User ID on Clinic Creation**:
   - `clinic_id_spoof`: Attacker attempts to create a clinic setting `userId: "victim_123"` while authenticated as `attacker_456`.
   - Expected: `PERMISSION_DENIED`.
2. **Ghost Field Injection (Shadow Update)**:
   - `shadow_field_injection`: Attacker attempts to update a surgeon with `{ name: "Dr. Silva", __role: "super_admin", isPrivileged: true }`.
   - Expected: `PERMISSION_DENIED`.
3. **ID Poisoning Attack**:
   - `id_poisoning`: Attempt to create a document with a 2000-character malicious path ID containing SQL injection / directory traversal characters (`../../etc/passwd`).
   - Expected: `PERMISSION_DENIED`.
4. **Cross-Tenant Patient Snooping (Blanket Query Bypass)**:
   - `cross_tenant_read`: Authenticated user `vet_B` attempts `get` or query on `/patients/{patientId}` owned by `vet_A`.
   - Expected: `PERMISSION_DENIED`.
5. **Unauthorized Anesthesia Record Tampering**:
   - `anesthesia_tampering`: User `vet_B` attempts to update or delete `vet_A`'s anesthesia record.
   - Expected: `PERMISSION_DENIED`.
6. **Unauthenticated Write (No Auth)**:
   - `unauthenticated_write`: Anonymous or unauthenticated request to write to `/financial_entries`.
   - Expected: `PERMISSION_DENIED`.
7. **Immutable Field Tampering (`userId` change)**:
   - `change_owner_id`: User attempts to change `userId` of an existing clinic from their own to another user.
   - Expected: `PERMISSION_DENIED`.
8. **Value Poisoning (Type Confusion)**:
   - `value_poisoning`: Sending `{ amount: "FREE_MONEY_STRING" }` where `amount` must be a positive number.
   - Expected: `PERMISSION_DENIED`.
9. **Denial of Wallet (Huge String Attack)**:
   - `huge_payload`: Inserting a 5MB string into patient notes or clinic name to exhaust storage quotas.
   - Expected: `PERMISSION_DENIED`.
10. **Email Spoofing without Verification**:
    - `unverified_email_admin`: User sets auth email to `p.nikolas3@gmail.com` but `email_verified == false`.
    - Expected: `PERMISSION_DENIED`.
11. **Financial Entry Cross-Owner Deletion**:
    - `malicious_delete`: User attempts to delete another veterinarian's cash flow records.
    - Expected: `PERMISSION_DENIED`.
12. **Global Catch-All Probe**:
    - `catch_all_probe`: Attempting to read or write to arbitrary undeclared collections (e.g. `/_internal/keys`).
    - Expected: `PERMISSION_DENIED`.
