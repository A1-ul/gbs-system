'use strict';

/**
 * GBS CENTRAL SYSTEM RESPONSE CATALOGUE (GBS-RCCE)
 * Predefined, standardized operation codes, user-facing messages, and HTTP status codes.
 * Ensures the system NEVER guesses, invents, or leaves responses undefined.
 * Every operation across every GBS application has a predetermined, meaningful outcome.
 */

const RESPONSE_CATALOGUE = Object.freeze({
  // =========================================================================
  // 1. AUTHENTICATION & ACCESS CONTROL (AUTH)
  // =========================================================================
  AUTH_REGISTER_SUCCESS: {
    code: 'AUTH_REGISTER_SUCCESS',
    statusCode: 201,
    category: 'AUTH',
    message: 'Registration completed successfully.',
    description: 'User account registered and initialized.'
  },
  AUTH_REGISTER_PENDING: {
    code: 'AUTH_REGISTER_PENDING',
    statusCode: 201,
    category: 'AUTH',
    message: 'Registration submitted successfully and is awaiting administrative credential verification.',
    description: 'User registered with pending verification status.'
  },
  AUTH_REGISTER_FAILED: {
    code: 'AUTH_REGISTER_FAILED',
    statusCode: 400,
    category: 'AUTH',
    message: 'Registration could not be completed. Please review the information and try again.',
    description: 'Registration failed due to invalid or incomplete input.'
  },
  AUTH_LOGIN_SUCCESS: {
    code: 'AUTH_LOGIN_SUCCESS',
    statusCode: 200,
    category: 'AUTH',
    message: 'Authentication successful. Welcome to your workspace.',
    description: 'User session verified and token generated.'
  },
  AUTH_LOGIN_FAILED: {
    code: 'AUTH_LOGIN_FAILED',
    statusCode: 401,
    category: 'AUTH',
    message: 'Invalid email or password. Please verify your credentials and try again.',
    description: 'Credentials do not match active records.'
  },
  AUTH_UNAUTHORIZED: {
    code: 'AUTH_UNAUTHORIZED',
    statusCode: 401,
    category: 'AUTH',
    message: 'Authentication is required to access this service. Please sign in.',
    description: 'No valid bearer token or session found.'
  },
  AUTH_FORBIDDEN: {
    code: 'AUTH_FORBIDDEN',
    statusCode: 403,
    category: 'AUTH',
    message: 'You do not have permission to perform this operation.',
    description: 'User lacks required role or permission clearance.'
  },
  AUTH_ACCOUNT_LOCKED: {
    code: 'AUTH_ACCOUNT_LOCKED',
    statusCode: 403,
    category: 'AUTH',
    message: 'Your account or institutional enclave is locked. Please contact the System Administrator or Developer.',
    description: 'Account or tenant status is LOCKED or SUSPENDED.'
  },
  AUTH_SESSION_EXPIRED: {
    code: 'AUTH_SESSION_EXPIRED',
    statusCode: 401,
    category: 'AUTH',
    message: 'Your active session has expired. Please log in again to continue.',
    description: 'JWT token has expired.'
  },
  AUTH_PIN_VERIFIED: {
    code: 'AUTH_PIN_VERIFIED',
    statusCode: 200,
    category: 'AUTH',
    message: 'High-security PIN verified successfully. Access granted.',
    description: 'Developer or executive security PIN confirmed.'
  },
  AUTH_PIN_INVALID: {
    code: 'AUTH_PIN_INVALID',
    statusCode: 403,
    category: 'AUTH',
    message: 'Invalid security PIN code. Security clearance rejected.',
    description: 'PIN mismatch.'
  },
  AUTH_LOGOUT_SUCCESS: {
    code: 'AUTH_LOGOUT_SUCCESS',
    statusCode: 200,
    category: 'AUTH',
    message: 'You have been signed out successfully.',
    description: 'User session cleared.'
  },

  // =========================================================================
  // 2. INPUT VALIDATION & BUSINESS RULES (VALIDATION)
  // =========================================================================
  VALIDATION_MISSING_REQUIRED: {
    code: 'VALIDATION_MISSING_REQUIRED',
    statusCode: 400,
    category: 'VALIDATION',
    message: 'Some required information is missing.',
    description: 'One or more mandatory parameters omitted.'
  },
  VALIDATION_INVALID_INPUT: {
    code: 'VALIDATION_INVALID_INPUT',
    statusCode: 422,
    category: 'VALIDATION',
    message: 'The submitted information is invalid or does not match required format.',
    description: 'Input format or regex validation failed.'
  },
  VALIDATION_DUPLICATE_ENTRY: {
    code: 'VALIDATION_DUPLICATE_ENTRY',
    statusCode: 409,
    category: 'VALIDATION',
    message: 'A record with this information already exists in the system.',
    description: 'Unique constraint conflict in database.'
  },
  VALIDATION_PASSED: {
    code: 'VALIDATION_PASSED',
    statusCode: 200,
    category: 'VALIDATION',
    message: 'Information verified and accepted.',
    description: 'All business and schema validations passed.'
  },

  // =========================================================================
  // 3. MULTI-TENANT ISOLATION & GOVERNANCE (TENANT)
  // =========================================================================
  TENANT_PROVISIONED_SUCCESS: {
    code: 'TENANT_PROVISIONED_SUCCESS',
    statusCode: 201,
    category: 'TENANT',
    message: 'Institutional tenant enclave provisioned successfully.',
    description: 'Tenant created with isolated schema and initial subscription.'
  },
  TENANT_UPDATED_SUCCESS: {
    code: 'TENANT_UPDATED_SUCCESS',
    statusCode: 200,
    category: 'TENANT',
    message: 'Institutional information updated successfully.',
    description: 'Tenant details modified in system ledger.'
  },
  TENANT_LOCKED_SUCCESS: {
    code: 'TENANT_LOCKED_SUCCESS',
    statusCode: 200,
    category: 'TENANT',
    message: 'Tenant access has been locked. System entry restricted.',
    description: 'Tenant status set to LOCKED.'
  },
  TENANT_UNLOCKED_SUCCESS: {
    code: 'TENANT_UNLOCKED_SUCCESS',
    statusCode: 200,
    category: 'TENANT',
    message: 'Tenant access unlocked. Full system operational access restored.',
    description: 'Tenant status set to ACTIVE.'
  },
  TENANT_TRIAL_EXTENDED: {
    code: 'TENANT_TRIAL_EXTENDED',
    statusCode: 200,
    category: 'TENANT',
    message: 'Tenant trial duration extended successfully.',
    description: 'Subscription end date extended by developer.'
  },
  TENANT_CROSS_ACCESS_FORBIDDEN: {
    code: 'TENANT_CROSS_ACCESS_FORBIDDEN',
    statusCode: 403,
    category: 'TENANT',
    message: 'Access denied: Cross-tenant data querying is strictly forbidden.',
    description: 'Attempt to access records of another tenant blocked.'
  },
  TENANT_NOT_FOUND: {
    code: 'TENANT_NOT_FOUND',
    statusCode: 404,
    category: 'TENANT',
    message: 'The requested institutional tenant was not found in the registry.',
    description: 'No tenant matching identifier exists.'
  },
  TENANT_ARCHIVED_SUCCESS: {
    code: 'TENANT_ARCHIVED_SUCCESS',
    statusCode: 200,
    category: 'TENANT',
    message: 'Institution moved to deleted archive depot. Access locked.',
    description: 'Tenant deleted safely and archived.'
  },
  TENANT_RESTORED_SUCCESS: {
    code: 'TENANT_RESTORED_SUCCESS',
    statusCode: 200,
    category: 'TENANT',
    message: 'Institution restored from archive and reactivated.',
    description: 'Tenant un-archived and status set to ACTIVE.'
  },
  TENANT_PURGED_SUCCESS: {
    code: 'TENANT_PURGED_SUCCESS',
    statusCode: 200,
    category: 'TENANT',
    message: 'Institution and associated records permanently purged from system.',
    description: 'Permanent deletion confirmed.'
  },

  // =========================================================================
  // 4. ADMISSIONS PIPELINE (ADMISSION)
  // =========================================================================
  ADMISSION_SUBMITTED_SUCCESS: {
    code: 'ADMISSION_SUBMITTED_SUCCESS',
    statusCode: 201,
    category: 'ADMISSION',
    message: 'Admission application submitted successfully and reference generated.',
    description: 'Application recorded in pipeline.'
  },
  ADMISSION_PENDING_APPROVAL: {
    code: 'ADMISSION_PENDING_APPROVAL',
    statusCode: 200,
    category: 'ADMISSION',
    message: 'Your admission dossier has been submitted and is awaiting Headmaster approval.',
    description: 'Admission awaiting review.'
  },
  ADMISSION_APPROVED_SUCCESS: {
    code: 'ADMISSION_APPROVED_SUCCESS',
    statusCode: 200,
    category: 'ADMISSION',
    message: 'Admission application approved. Official admission letter generated.',
    description: 'Applicant approved for enrollment.'
  },
  ADMISSION_REJECTED: {
    code: 'ADMISSION_REJECTED',
    statusCode: 200,
    category: 'ADMISSION',
    message: 'Admission application has been reviewed and declined.',
    description: 'Applicant rejected.'
  },
  ADMISSION_AMENDED_SUCCESS: {
    code: 'ADMISSION_AMENDED_SUCCESS',
    statusCode: 200,
    category: 'ADMISSION',
    message: 'Applicant demographics and admission notes amended successfully.',
    description: 'Record updated with amendments.'
  },
  ADMISSION_STUDENT_ENROLLED: {
    code: 'ADMISSION_STUDENT_ENROLLED',
    statusCode: 200,
    category: 'ADMISSION',
    message: 'Student officially enrolled into active scholar registry.',
    description: 'Enrolled student record created.'
  },
  ADMISSION_DUPLICATE_PREVENTED: {
    code: 'ADMISSION_DUPLICATE_PREVENTED',
    statusCode: 200,
    category: 'ADMISSION',
    message: 'An existing application matching this applicant was already submitted.',
    description: 'Duplicate application suppressed.'
  },

  // =========================================================================
  // 5. ACADEMIC & CLASSROOM WORKSPACE (ACADEMIC)
  // =========================================================================
  ACADEMIC_CLASS_CREATED: {
    code: 'ACADEMIC_CLASS_CREATED',
    statusCode: 201,
    category: 'ACADEMIC',
    message: 'Academic classroom stream created successfully.',
    description: 'New class registered in academic curriculum.'
  },
  ACADEMIC_SUBJECT_CREATED: {
    code: 'ACADEMIC_SUBJECT_CREATED',
    statusCode: 201,
    category: 'ACADEMIC',
    message: 'Curriculum course and accredited subject created successfully.',
    description: 'Subject registered.'
  },
  ACADEMIC_ATTENDANCE_TICKED: {
    code: 'ACADEMIC_ATTENDANCE_TICKED',
    statusCode: 200,
    category: 'ACADEMIC',
    message: 'Student attendance mark auto-saved successfully.',
    description: 'Single student roll call auto-saved.'
  },
  ACADEMIC_ATTENDANCE_COMPLETED: {
    code: 'ACADEMIC_ATTENDANCE_COMPLETED',
    statusCode: 200,
    category: 'ACADEMIC',
    message: 'Daily roll call completed and wrapped into institutional archives successfully.',
    description: 'Entire class attendance archived.'
  },
  ACADEMIC_ATTENDANCE_INCOMPLETE: {
    code: 'ACADEMIC_ATTENDANCE_INCOMPLETE',
    statusCode: 400,
    category: 'ACADEMIC',
    message: 'Roll call incomplete: Some students have not been ticked yet. Please tick each student individually.',
    description: 'Attempt to submit attendance with unticked students blocked.'
  },
  ACADEMIC_ASSIGNMENT_CREATED: {
    code: 'ACADEMIC_ASSIGNMENT_CREATED',
    statusCode: 201,
    category: 'ACADEMIC',
    message: 'Coursework assignment published to class workspace.',
    description: 'Assignment created.'
  },
  ACADEMIC_ASSIGNMENT_SUBMITTED: {
    code: 'ACADEMIC_ASSIGNMENT_SUBMITTED',
    statusCode: 200,
    category: 'ACADEMIC',
    message: 'Assignment submission received and timestamped for instructor grading.',
    description: 'Student submitted coursework.'
  },
  ACADEMIC_EXAM_SCORED: {
    code: 'ACADEMIC_EXAM_SCORED',
    statusCode: 200,
    category: 'ACADEMIC',
    message: 'Examination assessment scored and published to scholar transcript.',
    description: 'Grade recorded.'
  },
  ACADEMIC_VIDEO_PUBLISHED: {
    code: 'ACADEMIC_VIDEO_PUBLISHED',
    statusCode: 201,
    category: 'ACADEMIC',
    message: 'Topic video lesson published successfully to class platform for students to watch.',
    description: 'Video recorded and made available to scholars.'
  },
  ACADEMIC_TIMETABLE_SAVED: {
    code: 'ACADEMIC_TIMETABLE_SAVED',
    statusCode: 200,
    category: 'ACADEMIC',
    message: 'Classroom timetable scheduled and conflict verification passed.',
    description: 'Timetable slots synchronized.'
  },

  // =========================================================================
  // 6. FINANCIAL OPERATIONS & BILLING (FINANCE)
  // =========================================================================
  FINANCE_PAYMENT_SUCCESS: {
    code: 'FINANCE_PAYMENT_SUCCESS',
    statusCode: 200,
    category: 'FINANCE',
    message: 'Payment received successfully.',
    description: 'Fee transaction authorized and settled.'
  },
  FINANCE_PAYMENT_PENDING: {
    code: 'FINANCE_PAYMENT_PENDING',
    statusCode: 202,
    category: 'FINANCE',
    message: 'Payment transaction is pending settlement confirmation.',
    description: 'USSD prompt dispatched or awaiting 3DS clearing.'
  },
  FINANCE_PAYMENT_FAILED: {
    code: 'FINANCE_PAYMENT_FAILED',
    statusCode: 400,
    category: 'FINANCE',
    message: 'Payment transaction could not be completed. Please verify billing details or payment network.',
    description: 'Payment authorization rejected.'
  },
  FINANCE_INVOICE_GENERATED: {
    code: 'FINANCE_INVOICE_GENERATED',
    statusCode: 201,
    category: 'FINANCE',
    message: 'Official billing invoice generated successfully.',
    description: 'Billing invoice created.'
  },
  FINANCE_SUBSCRIPTION_CALCULATED: {
    code: 'FINANCE_SUBSCRIPTION_CALCULATED',
    statusCode: 200,
    category: 'FINANCE',
    message: '100% Student-based subscription invoice calculated according to active population policy.',
    description: 'Calculated fee based on per-student rate.'
  },
  FINANCE_SUBSCRIPTION_ACTIVATED: {
    code: 'FINANCE_SUBSCRIPTION_ACTIVATED',
    statusCode: 200,
    category: 'FINANCE',
    message: 'Cloud subscription and multi-tenant license activated successfully.',
    description: 'Subscription activated.'
  },
  FINANCE_ALUMNI_GIFT_RECORDED: {
    code: 'FINANCE_ALUMNI_GIFT_RECORDED',
    statusCode: 201,
    category: 'FINANCE',
    message: 'Alumni philanthropic pledge or donation recorded and synchronized with treasury ledger.',
    description: 'Alumni donation persisted.'
  },
  FINANCE_DUPLICATE_PAYMENT_PREVENTED: {
    code: 'FINANCE_DUPLICATE_PAYMENT_PREVENTED',
    statusCode: 200,
    category: 'FINANCE',
    message: 'This payment transaction has already been processed. Duplicate billing prevented.',
    description: 'Idempotency sentinel caught repeated transaction.'
  },

  // =========================================================================
  // 7. DEVELOPER & SYSTEM CONTROL (DEV_CONTROL)
  // =========================================================================
  DEV_METRICS_FETCHED: {
    code: 'DEV_METRICS_FETCHED',
    statusCode: 200,
    category: 'DEV_CONTROL',
    message: 'Live system telemetry, database status, and operational metrics retrieved.',
    description: 'Developer telemetry data fetched.'
  },
  DEV_LOCK_TOGGLED: {
    code: 'DEV_LOCK_TOGGLED',
    statusCode: 200,
    category: 'DEV_CONTROL',
    message: 'Global system lock state updated successfully.',
    description: 'System lock toggled.'
  },
  DEV_MAINTENANCE_TOGGLED: {
    code: 'DEV_MAINTENANCE_TOGGLED',
    statusCode: 200,
    category: 'DEV_CONTROL',
    message: 'System maintenance mode state toggled and synchronized.',
    description: 'Maintenance mode state changed.'
  },
  DEV_BACKUP_TRIGGERED: {
    code: 'DEV_BACKUP_TRIGGERED',
    statusCode: 201,
    category: 'DEV_CONTROL',
    message: 'Encrypted system database backup snapshot generated successfully.',
    description: 'Backup created.'
  },
  DEV_BACKUP_DELETED: {
    code: 'DEV_BACKUP_DELETED',
    statusCode: 200,
    category: 'DEV_CONTROL',
    message: 'System backup snapshot removed from storage.',
    description: 'Backup record deleted.'
  },
  DEV_DEPLOYMENT_ROLLBACK: {
    code: 'DEV_DEPLOYMENT_ROLLBACK',
    statusCode: 200,
    category: 'DEV_CONTROL',
    message: 'Production deployment rollback executed successfully.',
    description: 'System rolled back to target version.'
  },
  DEV_ALERT_RESOLVED: {
    code: 'DEV_ALERT_RESOLVED',
    statusCode: 200,
    category: 'DEV_CONTROL',
    message: 'Infrastructure security alert marked as resolved.',
    description: 'Alert status set to RESOLVED.'
  },
  DEV_LOGS_RETRIEVED: {
    code: 'DEV_LOGS_RETRIEVED',
    statusCode: 200,
    category: 'DEV_CONTROL',
    message: 'System audit and activity logs retrieved.',
    description: 'Audit logs query returned.'
  },

  // =========================================================================
  // 8. RECORD CRUD & GENERAL DATA (RECORD)
  // =========================================================================
  RECORD_FOUND_SUCCESS: {
    code: 'RECORD_FOUND_SUCCESS',
    statusCode: 200,
    category: 'RECORD',
    message: 'Record retrieved successfully.',
    description: 'Matching item found.'
  },
  RECORD_CREATED_SUCCESS: {
    code: 'RECORD_CREATED_SUCCESS',
    statusCode: 201,
    category: 'RECORD',
    message: 'New record created successfully.',
    description: 'Item created.'
  },
  RECORD_UPDATED_SUCCESS: {
    code: 'RECORD_UPDATED_SUCCESS',
    statusCode: 200,
    category: 'RECORD',
    message: 'Your information has been updated successfully.',
    description: 'Record updated.'
  },
  RECORD_DELETED_SUCCESS: {
    code: 'RECORD_DELETED_SUCCESS',
    statusCode: 200,
    category: 'RECORD',
    message: 'Record removed successfully.',
    description: 'Item deleted.'
  },
  RECORD_NOT_FOUND: {
    code: 'RECORD_NOT_FOUND',
    statusCode: 404,
    category: 'RECORD',
    message: 'No matching record was found.',
    description: 'Requested resource does not exist.'
  },
  RECORD_ALREADY_EXISTS: {
    code: 'RECORD_ALREADY_EXISTS',
    statusCode: 409,
    category: 'RECORD',
    message: 'A matching record already exists in the system.',
    description: 'Duplicate record detected.'
  },
  RECORD_EXPORTED_SUCCESS: {
    code: 'RECORD_EXPORTED_SUCCESS',
    statusCode: 200,
    category: 'RECORD',
    message: 'Document or report generated and exported successfully.',
    description: 'Export ready.'
  },

  // =========================================================================
  // 9. EVENTS & NOTIFICATIONS (NOTIFICATION)
  // =========================================================================
  NOTIFICATION_SENT_SUCCESS: {
    code: 'NOTIFICATION_SENT_SUCCESS',
    statusCode: 200,
    category: 'NOTIFICATION',
    message: 'Notification delivered to target recipient.',
    description: 'Realtime / in-app notification delivered.'
  },
  NOTIFICATION_QUEUED: {
    code: 'NOTIFICATION_QUEUED',
    statusCode: 202,
    category: 'NOTIFICATION',
    message: 'Notification queued for asynchronous delivery.',
    description: 'Added to delivery queue.'
  },
  NOTIFICATION_READ: {
    code: 'NOTIFICATION_READ',
    statusCode: 200,
    category: 'NOTIFICATION',
    message: 'Notification marked as read.',
    description: 'Notification readAt updated.'
  },
  NOTIFICATION_BROADCAST_SENT: {
    code: 'NOTIFICATION_BROADCAST_SENT',
    statusCode: 200,
    category: 'NOTIFICATION',
    message: 'Campus-wide broadcast announcement dispatched.',
    description: 'Broadcast transmitted.'
  },

  // =========================================================================
  // 10. SYSTEM HEALTH & ERROR HANDLING (SYSTEM)
  // =========================================================================
  SYSTEM_HEALTHY: {
    code: 'SYSTEM_HEALTHY',
    statusCode: 200,
    category: 'SYSTEM',
    message: 'All GBS system services and database pools are fully operational.',
    description: 'System healthy.'
  },
  SYSTEM_MAINTENANCE_ACTIVE: {
    code: 'SYSTEM_MAINTENANCE_ACTIVE',
    statusCode: 503,
    category: 'SYSTEM',
    message: 'The system is currently undergoing scheduled maintenance. Please check back shortly.',
    description: 'Maintenance mode enabled.'
  },
  SYSTEM_DATABASE_UNAVAILABLE: {
    code: 'SYSTEM_DATABASE_UNAVAILABLE',
    statusCode: 503,
    category: 'SYSTEM',
    message: 'Database service is temporarily unavailable. Operational fallback engine engaged.',
    description: 'Database connection failed.'
  },
  SYSTEM_NETWORK_TIMEOUT: {
    code: 'SYSTEM_NETWORK_TIMEOUT',
    statusCode: 504,
    category: 'SYSTEM',
    message: 'The operation timed out waiting for server response. Please check your connection.',
    description: 'Network or gateway timeout.'
  },
  SYSTEM_NETWORK_DISCONNECTED: {
    code: 'SYSTEM_NETWORK_DISCONNECTED',
    statusCode: 0,
    category: 'SYSTEM',
    message: 'Internet connection unavailable. Actions queued for automatic sync upon reconnection.',
    description: 'Client offline.'
  },
  SYSTEM_ERROR_INTERNAL: {
    code: 'SYSTEM_ERROR_INTERNAL',
    statusCode: 500,
    category: 'SYSTEM',
    message: 'An internal system error occurred. Technical diagnostics recorded for developer review.',
    description: 'Unhandled internal exception.'
  },
  SYSTEM_RATE_LIMIT_EXCEEDED: {
    code: 'SYSTEM_RATE_LIMIT_EXCEEDED',
    statusCode: 429,
    category: 'SYSTEM',
    message: 'Too many requests were received in a short time. Please wait a moment and try again.',
    description: 'Rate limit tripped.'
  },

  // =========================================================================
  // 11. IDEMPOTENCY & DUPLICATE PROTECTION (IDEMPOTENCY)
  // =========================================================================
  IDEMPOTENT_TRANSACTION_REPLAYED: {
    code: 'IDEMPOTENT_TRANSACTION_REPLAYED',
    statusCode: 200,
    category: 'IDEMPOTENCY',
    message: 'Transaction already completed. Returning existing verified confirmation.',
    description: 'Idempotent request replayed safely.'
  },
  DUPLICATE_SUBMISSION_DETECTED: {
    code: 'DUPLICATE_SUBMISSION_DETECTED',
    statusCode: 409,
    category: 'IDEMPOTENCY',
    message: 'A duplicate submission was detected and safely intercepted.',
    description: 'Duplicate command blocked.'
  },

  // =========================================================================
  // 12. STAFF APPROVAL, REQUESTS & INSTITUTION WORKFLOWS
  // =========================================================================
  REQUEST_PENDING_APPROVAL: {
    code: 'REQUEST_PENDING_APPROVAL',
    statusCode: 202,
    category: 'AUTH',
    message: 'Your request has been submitted and is awaiting approval.',
    description: 'Pending administrative review.'
  },
  STAFF_APPROVAL_REQUIRED: {
    code: 'STAFF_APPROVAL_REQUIRED',
    statusCode: 403,
    category: 'AUTH',
    message: 'Access denied: Your staff registration is awaiting Headmaster approval.',
    description: 'Staff member must be verified by Headmaster before portal login.'
  },
  STAFF_APPROVED_SUCCESS: {
    code: 'STAFF_APPROVED_SUCCESS',
    statusCode: 200,
    category: 'AUTH',
    message: 'Staff member approved successfully and portal access unlocked.',
    description: 'Headmaster approved pending staff user.'
  },
  DEV_PRIVACY_AUDIT_REQUIRED: {
    code: 'DEV_PRIVACY_AUDIT_REQUIRED',
    statusCode: 403,
    category: 'DEV_CONTROL',
    message: 'Developer inspection of private user data requires an explicit audit reason.',
    description: 'Privacy protection gate requires non-empty diagnostic reason.'
  },
  DEV_PRIVACY_INSPECTED: {
    code: 'DEV_PRIVACY_INSPECTED',
    statusCode: 200,
    category: 'DEV_CONTROL',
    message: 'Privacy-filtered user diagnostics retrieved and audit-sealed.',
    description: 'Authorized privacy-redacted developer view.'
  },

  // =========================================================================
  // 13. SCHOOL CLINIC & MEDICAL REGISTRY (CLINIC)
  // =========================================================================
  CLINIC_PROFILE_SAVED: {
    code: 'CLINIC_PROFILE_SAVED',
    statusCode: 201,
    category: 'CLINIC',
    message: 'Admission medical profile saved and synchronized with School Clinic.',
    description: 'Baseline medical profile created or updated.'
  },
  CLINIC_VISIT_RECORDED: {
    code: 'CLINIC_VISIT_RECORDED',
    statusCode: 201,
    category: 'CLINIC',
    message: 'School Clinic consultation or sickbay admission recorded successfully.',
    description: 'Clinical triage or sickbay encounter stored.'
  },
  CLINIC_VISIT_UPDATED: {
    code: 'CLINIC_VISIT_UPDATED',
    statusCode: 200,
    category: 'CLINIC',
    message: 'School Clinic patient disposition and record updated successfully.',
    description: 'Clinical discharge or update saved.'
  },
  CLINIC_DOSSIER_PULLED: {
    code: 'CLINIC_DOSSIER_PULLED',
    statusCode: 200,
    category: 'CLINIC',
    message: 'Unified patient medical dossier synchronized across school portals.',
    description: 'Cross-portal clinical pull completed.'
  },
  CLINIC_INVENTORY_UPDATED: {
    code: 'CLINIC_INVENTORY_UPDATED',
    statusCode: 201,
    category: 'CLINIC',
    message: 'School Clinic pharmacy stock item saved successfully.',
    description: 'Clinical medicine/first-aid stock updated.'
  },

  // =========================================================================
  // 14. UNIVERSITY & STRICT INSTITUTION TIER GOVERNANCE (UNIVERSITY)
  // =========================================================================
  UNIVERSITY_ONLY_RESTRICTION: {
    code: 'UNIVERSITY_ONLY_RESTRICTION',
    statusCode: 403,
    category: 'UNIVERSITY',
    message: 'Access denied: University module operations are restricted exclusively to accredited University/Tertiary institutions.',
    description: 'Strict institutional tier enforcement blocked non-university access.'
  },
  UNIVERSITY_INTERNSHIP_SUBMITTED: {
    code: 'UNIVERSITY_INTERNSHIP_SUBMITTED',
    statusCode: 201,
    category: 'UNIVERSITY',
    message: 'University internship placement form submitted successfully.',
    description: 'Student internship record stored.'
  },
  UNIVERSITY_INTERNSHIP_GRADED: {
    code: 'UNIVERSITY_INTERNSHIP_GRADED',
    statusCode: 200,
    category: 'UNIVERSITY',
    message: 'University internship evaluated and graded successfully.',
    description: 'Supervisor/lecturer graded internship attachment.'
  },
  UNIVERSITY_EXAM_PUBLISHED: {
    code: 'UNIVERSITY_EXAM_PUBLISHED',
    statusCode: 201,
    category: 'UNIVERSITY',
    message: 'University examination published and scheduled successfully.',
    description: 'Lecturer published university course examination.'
  },
  UNIVERSITY_RESULT_RECORDED: {
    code: 'UNIVERSITY_RESULT_RECORDED',
    statusCode: 200,
    category: 'UNIVERSITY',
    message: 'University course result recorded and GPA updated successfully.',
    description: 'Course examination result posted.'
  },
  UNIVERSITY_STUDENT_PROMOTED: {
    code: 'UNIVERSITY_STUDENT_PROMOTED',
    statusCode: 200,
    category: 'UNIVERSITY',
    message: 'University student progression status updated successfully.',
    description: 'Student advanced or graduated to Alumni.'
  },
  UNIVERSITY_STREAM_CREATED: {
    code: 'UNIVERSITY_STREAM_CREATED',
    statusCode: 201,
    category: 'UNIVERSITY',
    message: 'University study stream created successfully.',
    description: 'Regular, Evening, Sandwich, or Weekend stream added.'
  },
  UNIVERSITY_GOVERNANCE_RECORDED: {
    code: 'UNIVERSITY_GOVERNANCE_RECORDED',
    statusCode: 201,
    category: 'UNIVERSITY',
    message: 'Student leadership position, duties, and school impact plan saved.',
    description: 'SRC/leadership governance record persisted.'
  },

  // =========================================================================
  // 15. DIRECT SMS & DEMO SANDBOX LIMITS (SMS / DEMO)
  // =========================================================================
  SMS_DISPATCHED_SUCCESS: {
    code: 'SMS_DISPATCHED_SUCCESS',
    statusCode: 200,
    category: 'SMS',
    message: 'Message dispatched with complete sender identity and delivered to target recipient.',
    description: 'SMS or in-app message persisted to receiver inbox.'
  },
  SMS_DELIVERY_FAILED: {
    code: 'SMS_DELIVERY_FAILED',
    statusCode: 400,
    category: 'SMS',
    message: 'Message delivery failed. Please verify the recipient mobile number and try again.',
    description: 'SMS validation or provider dispatch rejected.'
  },
  DEMO_TRIAL_LIMIT_REACHED: {
    code: 'DEMO_TRIAL_LIMIT_REACHED',
    statusCode: 403,
    category: 'DEMO',
    message: 'Demo Trial Limit Reached (10/10 entries used for this module). Register or sign into a Live School account for unlimited production access, or reset Demo Data.',
    description: '10-entry Demo Sandbox trial cap enforced cleanly.'
  }
});

/**
 * Deterministically resolve the canonical RESPONSE_CATALOGUE entry for any HTTP operation.
 * Ensures every controller automatically inherits exact GBS-RCCE codes without boilerplate.
 */
function inferOperationResponse({ method = 'GET', path = '/', statusCode = 200, message = '', code = null } = {}) {
  if (code && RESPONSE_CATALOGUE[code]) {
    return getOperationResponse(code, message || null, statusCode);
  }

  const m = String(method || 'GET').toUpperCase();
  const p = String(path || '/').toLowerCase();
  const s = Number(statusCode) || 200;
  const msg = String(message || '').toLowerCase();

  // Failure & Rejection Mappings (never mark failure as success)
  if (s >= 400) {
    if (code === 'DEMO_TRIAL_LIMIT_REACHED' || msg.includes('demo trial limit')) {
      return getOperationResponse('DEMO_TRIAL_LIMIT_REACHED', message || null, s);
    }
    if (s === 503 || msg.includes('maintenance')) {
      return getOperationResponse('SYSTEM_MAINTENANCE_ACTIVE', message || null, 503);
    }
    if (s === 429) {
      return getOperationResponse('SYSTEM_RATE_LIMIT_EXCEEDED', message || null, 429);
    }
    if (s === 401) {
      if (msg.includes('invalid') && (msg.includes('password') || msg.includes('credential') || msg.includes('email') || msg.includes('username'))) {
        return getOperationResponse('AUTH_LOGIN_FAILED', message || null, 401);
      }
      if (msg.includes('expired')) {
        return getOperationResponse('AUTH_SESSION_EXPIRED', message || null, 401);
      }
      return getOperationResponse('AUTH_UNAUTHORIZED', message || null, 401);
    }
    if (s === 403) {
      if (msg.includes('cross-tenant')) {
        return getOperationResponse('TENANT_CROSS_ACCESS_FORBIDDEN', message || null, 403);
      }
      if (msg.includes('awaiting headmaster approval') || msg.includes('approved by headmaster') || msg.includes('pending approval')) {
        return getOperationResponse('STAFF_APPROVAL_REQUIRED', message || null, 403);
      }
      if (msg.includes('university')) {
        return getOperationResponse('UNIVERSITY_ONLY_RESTRICTION', message || null, 403);
      }
      if (msg.includes('locked') || msg.includes('suspended') || msg.includes('deleted')) {
        return getOperationResponse('AUTH_ACCOUNT_LOCKED', message || null, 403);
      }
      return getOperationResponse('AUTH_FORBIDDEN', message || null, 403);
    }
    if (s === 404) {
      if (p.includes('/tenant')) return getOperationResponse('TENANT_NOT_FOUND', message || null, 404);
      return getOperationResponse('RECORD_NOT_FOUND', message || null, 404);
    }
    if (s === 409) {
      if (msg.includes('duplicate submission') || msg.includes('currently processing')) {
        return getOperationResponse('DUPLICATE_SUBMISSION_DETECTED', message || null, 409);
      }
      return getOperationResponse('VALIDATION_DUPLICATE_ENTRY', message || null, 409);
    }
    if (s === 422 || msg.includes('invalid')) {
      if (p.includes('/payment') || p.includes('/fees') || p.includes('/finance')) {
        return getOperationResponse('FINANCE_PAYMENT_FAILED', message || null, s);
      }
      return getOperationResponse('VALIDATION_INVALID_INPUT', message || null, s);
    }
    if (s >= 500) {
      if (msg.includes('database') || msg.includes('prisma')) {
        return getOperationResponse('SYSTEM_DATABASE_UNAVAILABLE', message || null, s);
      }
      return getOperationResponse('SYSTEM_ERROR_INTERNAL', message || null, s);
    }
    if (p.includes('/auth/register')) {
      return getOperationResponse('AUTH_REGISTER_FAILED', message || null, s);
    }
    if (p.includes('/payment')) {
      return getOperationResponse('FINANCE_PAYMENT_FAILED', message || null, s);
    }
    return getOperationResponse('VALIDATION_MISSING_REQUIRED', message || null, s);
  }

  // Success Mappings (2xx / 3xx)
  if (p.includes('/health')) return getOperationResponse('SYSTEM_HEALTHY', message || null, s);
  if (p.includes('/auth/login')) return getOperationResponse('AUTH_LOGIN_SUCCESS', message || null, s);
  if (p.includes('/auth/logout')) return getOperationResponse('AUTH_LOGOUT_SUCCESS', message || null, s);
  if (p.includes('/auth/register')) {
    if (msg.includes('pending') || msg.includes('awaiting')) {
      return getOperationResponse('AUTH_REGISTER_PENDING', message || null, s);
    }
    return getOperationResponse('AUTH_REGISTER_SUCCESS', message || null, s);
  }
  if (p.includes('/verify-pin')) return getOperationResponse('AUTH_PIN_VERIFIED', message || null, s);
  if (p.includes('/approve-staff')) return getOperationResponse('STAFF_APPROVED_SUCCESS', message || null, s);
  if (p.includes('/payment') || p.includes('/fees') || p.includes('/finance')) {
    if (m === 'POST' && s === 202) return getOperationResponse('FINANCE_PAYMENT_PENDING', message || null, s);
    if (m === 'POST' && p.includes('calculate')) return getOperationResponse('FINANCE_SUBSCRIPTION_CALCULATED', message || null, s);
    if (m === 'POST') return getOperationResponse('FINANCE_PAYMENT_SUCCESS', message || null, s);
  }
  if (p.includes('/admission')) {
    if (p.includes('/approve')) return getOperationResponse('ADMISSION_APPROVED_SUCCESS', message || null, s);
    if (p.includes('/reject')) return getOperationResponse('ADMISSION_REJECTED', message || null, s);
    if (m === 'POST') return getOperationResponse('ADMISSION_SUBMITTED_SUCCESS', message || null, s);
  }
  if (p.includes('/clinic') || p.includes('/health-clinic')) {
    if (p.includes('/profiles') && m === 'POST') return getOperationResponse('CLINIC_PROFILE_SAVED', message || null, s);
    if (p.includes('/visits') && m === 'POST') return getOperationResponse('CLINIC_VISIT_RECORDED', message || null, s);
    if (p.includes('/visits') && m === 'PATCH') return getOperationResponse('CLINIC_VISIT_UPDATED', message || null, s);
    if (p.includes('/inventory') && m === 'POST') return getOperationResponse('CLINIC_INVENTORY_UPDATED', message || null, s);
    if (p.includes('/pull-record')) return getOperationResponse('CLINIC_DOSSIER_PULLED', message || null, s);
  }
  if (p.includes('/university')) {
    if (p.includes('/internships') && m === 'POST') return getOperationResponse('UNIVERSITY_INTERNSHIP_SUBMITTED', message || null, s);
    if (p.includes('/internships') && p.includes('/grade')) return getOperationResponse('UNIVERSITY_INTERNSHIP_GRADED', message || null, s);
    if (p.includes('/exams') && m === 'POST') return getOperationResponse('UNIVERSITY_EXAM_PUBLISHED', message || null, s);
    if (p.includes('/results') && m === 'POST') return getOperationResponse('UNIVERSITY_RESULT_RECORDED', message || null, s);
    if (p.includes('/advance-student')) return getOperationResponse('UNIVERSITY_STUDENT_PROMOTED', message || null, s);
    if (p.includes('/streams') && m === 'POST') return getOperationResponse('UNIVERSITY_STREAM_CREATED', message || null, s);
    if (p.includes('/governance') && m === 'POST') return getOperationResponse('UNIVERSITY_GOVERNANCE_RECORDED', message || null, s);
  }
  if (p.includes('/sms') && m === 'POST') return getOperationResponse('SMS_DISPATCHED_SUCCESS', message || null, s);
  if (p.includes('/topic-videos') && m === 'POST') return getOperationResponse('ACADEMIC_VIDEO_PUBLISHED', message || null, s);
  if (p.includes('/attendance') && m === 'POST') return getOperationResponse('ACADEMIC_ATTENDANCE_COMPLETED', message || null, s);
  if (p.includes('/assignment') && m === 'POST') return getOperationResponse('ACADEMIC_ASSIGNMENT_CREATED', message || null, s);
  if (p.includes('/exam') && m === 'POST') return getOperationResponse('ACADEMIC_EXAM_SCORED', message || null, s);
  if (p.includes('/dev-control') || p.includes('/developer-control-center')) {
    if (p.includes('/metrics') || p.includes('/telemetry') || p.includes('/environment')) {
      return getOperationResponse('DEV_METRICS_FETCHED', message || null, s);
    }
    if (p.includes('/lock')) return getOperationResponse('DEV_LOCK_TOGGLED', message || null, s);
    if (p.includes('/backup') && m === 'POST') return getOperationResponse('DEV_BACKUP_TRIGGERED', message || null, s);
    if (p.includes('/logs') || p.includes('/audit')) return getOperationResponse('DEV_LOGS_RETRIEVED', message || null, s);
  }
  if (p.includes('/notifications') || p.includes('/notification')) {
    if (m === 'POST') return getOperationResponse('NOTIFICATION_SENT_SUCCESS', message || null, s);
    if (m === 'PATCH') return getOperationResponse('NOTIFICATION_READ', message || null, s);
  }
  if (p.includes('/export') || p.includes('/reports')) {
    if (m === 'POST' || p.includes('generate') || p.includes('export')) {
      return getOperationResponse('RECORD_EXPORTED_SUCCESS', message || null, s);
    }
  }

  if (m === 'POST') return getOperationResponse('RECORD_CREATED_SUCCESS', message || null, s);
  if (m === 'PUT' || m === 'PATCH') return getOperationResponse('RECORD_UPDATED_SUCCESS', message || null, s);
  if (m === 'DELETE') return getOperationResponse('RECORD_DELETED_SUCCESS', message || null, s);
  return getOperationResponse('RECORD_FOUND_SUCCESS', message || null, s);
}

/**
 * Lookup operation definition from the catalogue
 * @param {string} code - The operation code
 * @param {string} [customMessage] - Optional custom user-facing message
 * @param {number} [overrideStatus] - Optional HTTP status code override
 * @returns {object} Predefined response specification
 */
function getOperationResponse(code, customMessage = null, overrideStatus = null) {
  const spec = RESPONSE_CATALOGUE[code];
  if (!spec) {
    return {
      code: code || 'OPERATION_COMPLETED',
      statusCode: overrideStatus || 200,
      category: 'GENERAL',
      message: customMessage || 'Operation processed by system response engine.',
      description: 'Dynamic operation response.'
    };
  }

  return {
    code: spec.code,
    statusCode: overrideStatus || spec.statusCode,
    category: spec.category,
    message: customMessage || spec.message,
    description: spec.description
  };
}

module.exports = {
  RESPONSE_CATALOGUE,
  getOperationResponse,
  inferOperationResponse
};
