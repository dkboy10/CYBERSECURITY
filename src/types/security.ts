export type IncidentType =
  | 'Account Compromise'
  | 'Phishing'
  | 'Malware'
  | 'Vulnerability'
  | 'Suspicious Login'
  | 'Website Attack'
  | 'Discord/Community Attack'
  | 'Data Exposure'
  | 'Impersonation'
  | 'DDoS'
  | 'Other';

export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

export type IncidentStatus =
  | 'RECEIVED'
  | 'UNDER REVIEW'
  | 'INVESTIGATING'
  | 'MITIGATION'
  | 'WAITING FOR REPORTER'
  | 'RESOLVED'
  | 'CLOSED';

export interface EvidenceFile {
  id: string;
  originalName: string;
  storedFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  sha256: string;
  scanStatus: string;
}

export interface InternalNote {
  id: string;
  analyst: string;
  createdAt: string;
  content: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: 'status_change' | 'note' | 'evidence' | 'communication' | 'triage';
}

export interface Incident {
  id: string;
  verificationCode: string;
  type: IncidentType;
  severity: Severity;
  title: string;
  description: string;
  affectedService: string;
  approximateDateTime: string;
  whatHappened: string;
  actionsTaken: string;
  contactEmail: string;
  receiveNotifications: boolean;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  assignedAnalyst: string | null;
  assignedTeam: string;
  publicResponse: string | null;
  requestedInformation: string | null;
  reporterResponse: string | null;
  evidence: EvidenceFile[];
  internalNotes: InternalNote[];
  timeline: TimelineEvent[];
}

export interface PublicIncidentView {
  id: string;
  type: IncidentType;
  severity: Severity;
  title: string;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  assignedTeam: string;
  publicResponse: string | null;
  requestedInformation: string | null;
  evidence: Array<{
    id: string;
    originalName: string;
    sizeBytes: number;
    uploadedAt: string;
    mimeType: string;
  }>;
  timeline: Array<{
    id: string;
    timestamp: string;
    title: string;
    description: string;
  }>;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  reportId: string;
  previousStatus?: string;
  newStatus?: string;
  details: string;
}

export interface NotificationEntry {
  id: string;
  timestamp: string;
  recipient: string;
  subject: string;
  body: string;
  type: 'report_submitted' | 'info_requested' | 'status_changed' | 'resolved';
  status: 'dispatched' | 'simulated';
}

export interface AnalystUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  email: string;
  lastLogin?: string;
  mfaEnabled: boolean;
}
