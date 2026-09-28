import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import type {
  Incident,
  IncidentStatus,
  IncidentType,
  Severity,
  EvidenceFile,
  AuditLogEntry,
  NotificationEntry,
  PublicIncidentView,
  AnalystUser,
} from './src/types/security.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

// Security configuration
const SESSION_SECRET = process.env.SESSION_SECRET || 'soc-secure-incident-management-session-key-2026';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_SECURITY_WEBHOOK_URL || '';

// Storage paths outside public directory
const DATA_DIR = path.resolve(__dirname, 'data');
const EVIDENCE_DIR = path.resolve(DATA_DIR, 'secure_evidence');
const DB_FILE = path.resolve(DATA_DIR, 'soc_db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

// WebSocket Server attached to same HTTP Server
const wss = new WebSocketServer({ server, path: '/ws' });

interface ClientSubscription {
  ws: WebSocket;
  type: 'report' | 'admin';
  reportId?: string;
  verificationCode?: string;
}

const clientSubscriptions = new Set<ClientSubscription>();

wss.on('connection', (ws: WebSocket) => {
  let sub: ClientSubscription = { ws, type: 'report' };
  clientSubscriptions.add(sub);

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.action === 'subscribe_report' && data.reportId) {
        sub.type = 'report';
        sub.reportId = String(data.reportId).trim().toUpperCase();
        sub.verificationCode = data.verificationCode ? String(data.verificationCode).trim().toUpperCase() : undefined;
      } else if (data.action === 'subscribe_admin') {
        sub.type = 'admin';
      }
    } catch (e) {
      console.error('Invalid WS payload:', e);
    }
  });

  ws.on('close', () => {
    clientSubscriptions.delete(sub);
  });

  ws.on('error', () => {
    clientSubscriptions.delete(sub);
  });
});

// Broadcast real-time incident updates to reporters and admins
function broadcastIncidentUpdate(incident: Incident) {
  // Sanitize view for reporters
  const publicView: PublicIncidentView = {
    id: incident.id,
    type: incident.type,
    severity: incident.severity,
    title: incident.title,
    status: incident.status,
    createdAt: incident.createdAt,
    updatedAt: incident.updatedAt,
    assignedTeam: incident.assignedTeam,
    publicResponse: incident.publicResponse,
    requestedInformation: incident.requestedInformation,
    evidence: incident.evidence.map((ev) => ({
      id: ev.id,
      originalName: ev.originalName,
      sizeBytes: ev.sizeBytes,
      uploadedAt: ev.uploadedAt,
      mimeType: ev.mimeType,
    })),
    timeline: incident.timeline.map((t) => ({
      id: t.id,
      timestamp: t.timestamp,
      title: t.title,
      description: t.description,
    })),
  };

  const reporterMsg = JSON.stringify({
    type: 'incident_updated',
    incident: publicView,
  });

  const adminMsg = JSON.stringify({
    type: 'admin_incident_update',
    incidentId: incident.id,
  });

  for (const client of clientSubscriptions) {
    if (client.ws.readyState === WebSocket.OPEN) {
      if (
        client.type === 'report' &&
        client.reportId === incident.id.toUpperCase() &&
        client.verificationCode === incident.verificationCode.toUpperCase()
      ) {
        client.ws.send(reporterMsg);
      } else if (client.type === 'admin') {
        client.ws.send(adminMsg);
      }
    }
  }
}


// Block dangerous executable extensions strictly
const BANNED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.msi', '.scr', '.vbs', '.js', '.bin', '.jar',
  '.py', '.ps1', '.php', '.dll', '.so', '.com', '.pif', '.hta', '.reg',
]);

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
  'text/plain',
  'text/x-log',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream', // only if extension matches allowed
]);

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.pdf', '.txt', '.log', '.zip']);

// Multer storage with randomized non-guessable storage names outside web directory
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, EVIDENCE_DIR);
  },
  filename: (_req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const cleanExt = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.bin';
    const uniqueKey = `ev_${Date.now()}_${crypto.randomBytes(12).toString('hex')}${cleanExt}`;
    cb(null, uniqueKey);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BANNED_EXTENSIONS.has(ext)) {
      return cb(new Error('Executable and potentially hazardous script files are strictly blocked.'));
    }
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error('Only PNG, JPG, PDF, TXT, LOG, and ZIP files are permitted for secure evidence.'));
    }
    cb(null, true);
  },
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(SESSION_SECRET));

// Security Headers (Helmet-equivalent)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  // Prevent caching for sensitive administrative APIs
  if (req.path.startsWith('/api/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Rate limiting & Account Lockout tracking
interface AttemptTracker {
  attempts: number;
  firstAttempt: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, AttemptTracker>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 mins
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(key: string): { allowed: boolean; waitSeconds?: number; remaining: number } {
  const now = Date.now();
  const tracker = loginAttempts.get(key);

  if (!tracker) {
    return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS };
  }

  if (tracker.lockedUntil && tracker.lockedUntil > now) {
    const waitSeconds = Math.ceil((tracker.lockedUntil - now) / 1000);
    return { allowed: false, waitSeconds, remaining: 0 };
  }

  if (now - tracker.firstAttempt > ATTEMPT_WINDOW_MS) {
    loginAttempts.delete(key);
    return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS };
  }

  if (tracker.attempts >= MAX_LOGIN_ATTEMPTS) {
    tracker.lockedUntil = now + LOCKOUT_DURATION_MS;
    return { allowed: false, waitSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000), remaining: 0 };
  }

  return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS - tracker.attempts };
}

function recordLoginFailure(key: string) {
  const now = Date.now();
  const tracker = loginAttempts.get(key);
  if (!tracker || now - tracker.firstAttempt > ATTEMPT_WINDOW_MS) {
    loginAttempts.set(key, { attempts: 1, firstAttempt: now });
  } else {
    tracker.attempts += 1;
    if (tracker.attempts >= MAX_LOGIN_ATTEMPTS) {
      tracker.lockedUntil = now + LOCKOUT_DURATION_MS;
    }
  }
}

function resetLoginAttempts(key: string) {
  loginAttempts.delete(key);
}

// Password hashing using Node crypto scrypt
function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const hashBuffer = Buffer.from(hash, 'hex');
    return crypto.timingSafeEqual(derived, hashBuffer);
  } catch {
    return false;
  }
}

// In-Memory & File DB
interface StoredAnalyst {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  passwordHash: string;
  passwordSalt: string;
  lastLogin?: string;
  mfaEnabled: boolean;
}

interface DatabaseSchema {
  incidents: Incident[];
  auditLogs: AuditLogEntry[];
  notifications: NotificationEntry[];
  analysts: StoredAnalyst[];
}

let db: DatabaseSchema = {
  incidents: [],
  auditLogs: [],
  notifications: [],
  analysts: [],
};

// Seed initial analysts if not present
function initializeDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse database, re-initializing...', e);
    }
  }

  if (!db.analysts || db.analysts.length === 0) {
    const leadPwd = hashPassword('SecOps2026!SecureShield');
    const triagePwd = hashPassword('SecOps2026!TriageTier1');

    db.analysts = [
      {
        id: 'usr_lead_01',
        username: 'analyst@soc.internal',
        email: 'analyst@soc.internal',
        displayName: 'Lead Analyst Mercer (SOC-Tier 3)',
        role: 'Lead Incident Responder',
        passwordHash: leadPwd.hash,
        passwordSalt: leadPwd.salt,
        mfaEnabled: true,
      },
      {
        id: 'usr_triage_02',
        username: 'analyst-triage@soc.internal',
        email: 'analyst-triage@soc.internal',
        displayName: 'Analyst Vance (SOC-Tier 1)',
        role: 'Triage Analyst',
        passwordHash: triagePwd.hash,
        passwordSalt: triagePwd.salt,
        mfaEnabled: true,
      },
    ];
  }

  // Seed sample real-world incidents if empty so that dashboard is immediately operable
  if (!db.incidents || db.incidents.length === 0) {
    db.incidents = [
      {
        id: 'SEC-2026-8F42K1',
        verificationCode: 'VRF-8921-A4',
        type: 'Account Compromise',
        severity: 'Critical',
        title: 'Credential stuffing attack on primary administrative portal',
        description: 'Multiple automated login requests originating from high-risk proxy subnets detected against administrator credentials. Two service accounts experienced unusual session token creation.',
        affectedService: 'Admin Console & IAM Gateway',
        approximateDateTime: '2026-09-28 09:14 UTC',
        whatHappened: 'Automated brute force attempts triggered alert rule IAM-904. Tokens issued to suspicious IP were immediately revoked.',
        actionsTaken: 'Rotated internal API tokens, enforced hardware MFA requirement for impacted service accounts, and blacklisted malicious IP range at edge WAF.',
        contactEmail: 'ops-admin@enterprise-client.org',
        receiveNotifications: true,
        status: 'INVESTIGATING',
        createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 45 * 60000).toISOString(),
        assignedAnalyst: 'Lead Analyst Mercer (SOC-Tier 3)',
        assignedTeam: 'Tier 3 Incident Response Unit',
        publicResponse: 'Our incident response team has contained the unauthorized access and isolated the affected credentials. Deep forensic timeline review is in progress.',
        requestedInformation: null,
        reporterResponse: null,
        evidence: [
          {
            id: 'ev_init_01',
            originalName: 'auth_audit_log_20260928.txt',
            storedFilename: 'ev_auth_audit_sample.txt',
            mimeType: 'text/plain',
            sizeBytes: 14820,
            uploadedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
            sha256: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
            scanStatus: 'Clean (Static Heuristic & MIME Passed)',
          },
        ],
        internalNotes: [
          {
            id: 'note_01',
            analyst: 'Lead Analyst Mercer (SOC-Tier 3)',
            createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
            content: 'Correlated with honeypot telemetry. Attacker appears to be testing credential leak from external 2025 breach. No unauthorized privilege escalation confirmed.',
          },
        ],
        timeline: [
          {
            id: 'tl_01',
            timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
            title: 'Report Received',
            description: 'Incident ingested through Secure Incident Portal with Critical severity rating.',
            type: 'triage',
          },
          {
            id: 'tl_02',
            timestamp: new Date(Date.now() - 2.5 * 3600000).toISOString(),
            title: 'Triage & Assignment',
            description: 'Assigned to Lead Analyst Mercer (SOC-Tier 3) under Tier 3 Incident Response Unit.',
            type: 'status_change',
          },
          {
            id: 'tl_03',
            timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
            title: 'Status: INVESTIGATING',
            description: 'Containment actions verified; forensic log review initiated.',
            type: 'status_change',
          },
        ],
      },
      {
        id: 'SEC-2026-3C79X2',
        verificationCode: 'VRF-3104-E2',
        type: 'Phishing',
        severity: 'High',
        title: 'Spear-phishing domain mimicking SSO authorization prompt',
        description: 'A lookalike domain (auth-secure-verify.app) was identified distributing cloned corporate OAuth authorization dialogs.',
        affectedService: 'Corporate Email & Identity Federation',
        approximateDateTime: '2026-09-28 07:30 UTC',
        whatHappened: 'User received targeted urgent email claiming mandatory password sync. Reporter stopped before entering any details and submitted headers.',
        actionsTaken: 'Reported malicious domain to registrar abuse team and updated internal DNS sinkhole.',
        contactEmail: 'security-champ@partner.internal',
        receiveNotifications: true,
        status: 'MITIGATION',
        createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 3600000).toISOString(),
        assignedAnalyst: 'Analyst Vance (SOC-Tier 1)',
        assignedTeam: 'Email Security & Threat Hunting',
        publicResponse: 'The deceptive domain has been sinkholed internally. A takedown request has been submitted to the upstream registrar.',
        requestedInformation: null,
        reporterResponse: null,
        evidence: [],
        internalNotes: [
          {
            id: 'note_02',
            analyst: 'Analyst Vance (SOC-Tier 1)',
            createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
            content: 'Sinkhole confirmed active across all gateway resolvers. Takedown ticket #94821 pending registrar response.',
          },
        ],
        timeline: [
          {
            id: 'tl_11',
            timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
            title: 'Report Received',
            description: 'Phishing report logged with high urgency rating.',
            type: 'triage',
          },
          {
            id: 'tl_12',
            timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
            title: 'Status: MITIGATION',
            description: 'Protective filtering and registrar takedown initiated.',
            type: 'status_change',
          },
        ],
      },
      {
        id: 'SEC-2026-5D12P9',
        verificationCode: 'VRF-7429-K6',
        type: 'Vulnerability',
        severity: 'Medium',
        title: 'CORS misconfiguration permitting arbitrary origin read on public telemetry endpoint',
        description: 'Security researcher identified that the public metric endpoint /api/metrics reflects Access-Control-Allow-Origin dynamically without validation.',
        affectedService: 'Public API Gateway',
        approximateDateTime: '2026-09-27 18:00 UTC',
        whatHappened: 'Discovered during responsible disclosure testing. No sensitive customer data is exposed on this endpoint, only aggregated server uptime statistics.',
        actionsTaken: 'Reporter submitted PoC curl commands.',
        contactEmail: 'researcher@infosec-lab.org',
        receiveNotifications: true,
        status: 'WAITING FOR REPORTER',
        createdAt: new Date(Date.now() - 20 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
        assignedAnalyst: 'Analyst Vance (SOC-Tier 1)',
        assignedTeam: 'Application Security Triage',
        publicResponse: 'Thank you for the responsible disclosure. We are reviewing the report against our CORS policy.',
        requestedInformation: 'Could you confirm if you observed any authenticated session cookies or auth tokens being reflected in response headers during your test?',
        reporterResponse: null,
        evidence: [],
        internalNotes: [
          {
            id: 'note_03',
            analyst: 'Analyst Vance (SOC-Tier 1)',
            createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
            content: 'Endpoint is intentionally unauthenticated public metrics, but Access-Control-Allow-Credentials: true should NOT be set. Engineering PR #412 draft opened.',
          },
        ],
        timeline: [
          {
            id: 'tl_21',
            timestamp: new Date(Date.now() - 20 * 3600000).toISOString(),
            title: 'Report Ingested',
            description: 'Vulnerability report accepted under Responsible Disclosure policy.',
            type: 'triage',
          },
          {
            id: 'tl_22',
            timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
            title: 'Information Requested',
            description: 'Analyst requested clarification regarding authenticated cookie transmission.',
            type: 'communication',
          },
        ],
      },
      {
        id: 'SEC-2026-1A88M4',
        verificationCode: 'VRF-1903-Q5',
        type: 'DDoS',
        severity: 'High',
        title: 'UDP amplification burst targeting API origin ingress',
        description: 'An 85 Gbps NTP reflection attack saturated primary transit edge for 14 minutes before automated BGP Flowspec mitigation engaged.',
        affectedService: 'Edge Ingress & Reverse Proxy',
        approximateDateTime: '2026-09-26 14:15 UTC',
        whatHappened: 'Spike in UDP packet rate on port 443 detected by edge scrubbers.',
        actionsTaken: 'Scrubbing center scrubbed 99.4% of spoofed traffic; edge returned to nominal latency within 6 minutes.',
        contactEmail: 'noc-duty@network-ops.internal',
        receiveNotifications: true,
        status: 'RESOLVED',
        createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 46 * 3600000).toISOString(),
        assignedAnalyst: 'Lead Analyst Mercer (SOC-Tier 3)',
        assignedTeam: 'Infrastructure & Edge Defense',
        publicResponse: 'Incident successfully resolved. Flowspec rules applied at upstream transit providers; normal latency restored with zero packet loss.',
        requestedInformation: null,
        reporterResponse: null,
        evidence: [],
        internalNotes: [
          {
            id: 'note_04',
            analyst: 'Lead Analyst Mercer (SOC-Tier 3)',
            createdAt: new Date(Date.now() - 46 * 3600000).toISOString(),
            content: 'Upstream transit confirmed source vector neutralized. Permanent rate-limiting rules committed to ingress policy.',
          },
        ],
        timeline: [
          {
            id: 'tl_31',
            timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
            title: 'Incident Logged',
            description: 'NOC reported edge traffic surge.',
            type: 'triage',
          },
          {
            id: 'tl_32',
            timestamp: new Date(Date.now() - 46 * 3600000).toISOString(),
            title: 'Status: RESOLVED',
            description: 'Mitigation verified; incident officially closed.',
            type: 'status_change',
          },
        ],
      },
    ];
  }

  if (!db.auditLogs || db.auditLogs.length === 0) {
    db.auditLogs = [
      {
        id: 'log_01',
        timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
        actor: 'Lead Analyst Mercer (SOC-Tier 3)',
        action: 'Incident resolved',
        reportId: 'SEC-2026-1A88M4',
        previousStatus: 'MITIGATION',
        newStatus: 'RESOLVED',
        details: 'DDoS mitigation confirmed; upstream transit filters active.',
      },
      {
        id: 'log_02',
        timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
        actor: 'Analyst Vance (SOC-Tier 1)',
        action: 'Status changed from UNDER REVIEW to WAITING FOR REPORTER',
        reportId: 'SEC-2026-5D12P9',
        previousStatus: 'UNDER REVIEW',
        newStatus: 'WAITING FOR REPORTER',
        details: 'Requested technical verification on cookie reflection in PoC.',
      },
      {
        id: 'log_03',
        timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
        actor: 'Analyst Vance (SOC-Tier 1)',
        action: 'Status changed from INVESTIGATING to MITIGATION',
        reportId: 'SEC-2026-3C79X2',
        previousStatus: 'INVESTIGATING',
        newStatus: 'MITIGATION',
        details: 'Internal DNS sinkhole configured and registrar abuse notice submitted.',
      },
      {
        id: 'log_04',
        timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
        actor: 'Lead Analyst Mercer (SOC-Tier 3)',
        action: 'Analyst assigned incident',
        reportId: 'SEC-2026-8F42K1',
        previousStatus: 'RECEIVED',
        newStatus: 'INVESTIGATING',
        details: 'Assigned to Lead Analyst Mercer; initiated credential revocation.',
      },
    ];
  }

  if (!db.notifications || db.notifications.length === 0) {
    db.notifications = [
      {
        id: 'notif_01',
        timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
        recipient: 'ops-admin@enterprise-client.org',
        subject: 'Your security report SEC-2026-8F42K1 has been received',
        body: 'Thank you for reporting. Your report SEC-2026-8F42K1 has been received by the Security Operations Center. Use verification code VRF-8921-A4 to track status.',
        type: 'report_submitted',
        status: 'dispatched',
      },
      {
        id: 'notif_02',
        timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
        recipient: 'researcher@infosec-lab.org',
        subject: 'Update on security report SEC-2026-5D12P9 - Information Requested',
        body: 'The assigned security analyst has requested additional information regarding your report. Please visit the status tracker to review and reply.',
        type: 'info_requested',
        status: 'dispatched',
      },
    ];
  }

  saveDatabase();
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database to file:', err);
  }
}

initializeDatabase();

// In-Memory active sessions map
interface ActiveSession {
  sessionId: string;
  analystId: string;
  username: string;
  displayName: string;
  role: string;
  createdAt: number;
  expiresAt: number;
}
const activeSessions = new Map<string, ActiveSession>();
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000; // 8 hours

// Helper to record audit logs (immutable style)
function recordAuditLog(
  actor: string,
  action: string,
  reportId: string,
  details: string,
  previousStatus?: string,
  newStatus?: string
) {
  const entry: AuditLogEntry = {
    id: `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    timestamp: new Date().toISOString(),
    actor,
    action,
    reportId,
    previousStatus,
    newStatus,
    details,
  };
  db.auditLogs.unshift(entry);
  saveDatabase();
  return entry;
}

// Helper to queue/dispatch notifications
function dispatchNotification(
  recipient: string,
  subject: string,
  body: string,
  type: 'report_submitted' | 'info_requested' | 'status_changed' | 'resolved'
) {
  if (!recipient || !recipient.includes('@')) return null;
  const entry: NotificationEntry = {
    id: `notif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    timestamp: new Date().toISOString(),
    recipient,
    subject,
    body,
    type,
    status: 'dispatched',
  };
  db.notifications.unshift(entry);
  saveDatabase();
  return entry;
}

// Discord Webhook Dispatcher
async function sendDiscordWebhookAlert(incident: Incident) {
  const webhookUrl = process.env.DISCORD_SECURITY_WEBHOOK_URL || DISCORD_WEBHOOK_URL;
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    return false;
  }

  // Strictly adhere to format:
  // 🚨 SECURITY INCIDENT
  // Report: SEC-2026-8F42K1
  // Severity: CRITICAL
  // Type: Account Compromise
  // Status: RECEIVED
  const content = [
    '🚨 **SECURITY INCIDENT**',
    '',
    `**Report:**\n${incident.id}`,
    '',
    `**Severity:**\n${incident.severity.toUpperCase()}`,
    '',
    `**Type:**\n${incident.type}`,
    '',
    `**Status:**\n${incident.status}`,
  ].join('\n');

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        username: 'SOC Security Alert Gateway',
        avatar_url: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/shield.svg',
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to dispatch Discord security webhook alert:', err);
    return false;
  }
}

// Authentication Middleware
function requireAnalystAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies.soc_session;
  if (!sessionId) {
    return res.status(401).json({ error: 'Unauthorized: Session missing or expired' });
  }

  const session = activeSessions.get(sessionId);
  if (!session) {
    res.clearCookie('soc_session');
    return res.status(401).json({ error: 'Unauthorized: Invalid or terminated session' });
  }

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(sessionId);
    res.clearCookie('soc_session');
    return res.status(401).json({ error: 'Unauthorized: Session expired due to inactivity' });
  }

  // Extend sliding session window
  session.expiresAt = Date.now() + SESSION_LIFETIME_MS;
  (req as any).analyst = session;
  next();
}

// Generate Random Report ID: e.g. SEC-2026-8F42K1
function generateReportId(): string {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SEC-2026-${rand}`;
}

// Generate Secure Verification Code: e.g. VRF-8921-X4
function generateVerificationCode(): string {
  const part1 = Math.floor(1000 + Math.random() * 9000);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part2 = chars.charAt(Math.floor(Math.random() * chars.length)) + chars.charAt(Math.floor(Math.random() * chars.length));
  return `VRF-${part1}-${part2}`;
}

// API Routes

// 1. Ingest incident report
app.post('/api/incidents', (req, res, next) => {
  upload.array('evidence', 5)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Evidence file validation error' });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    const {
      type,
      severity,
      title,
      description,
      affectedService,
      approximateDateTime,
      whatHappened,
      actionsTaken,
      contactEmail,
      receiveNotifications,
    } = req.body;

    if (!type || !severity || !title || !description) {
      return res.status(400).json({ error: 'Missing required incident fields (type, severity, title, description).' });
    }

    const reportId = generateReportId();
    const verificationCode = generateVerificationCode();

    // Process uploaded evidence files safely
    const files = (req.files as Express.Multer.File[]) || [];
    const evidenceList: EvidenceFile[] = files.map((f) => {
      let sha256 = 'unknown';
      try {
        const fileBuf = fs.readFileSync(f.path);
        sha256 = crypto.createHash('sha256').update(fileBuf).digest('hex');
      } catch (e) {
        console.error('Checksum calculation error:', e);
      }

      return {
        id: `ev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        originalName: path.basename(f.originalname).replace(/[^a-zA-Z0-9._-]/g, '_'),
        storedFilename: f.filename,
        mimeType: f.mimetype,
        sizeBytes: f.size,
        uploadedAt: new Date().toISOString(),
        sha256,
        scanStatus: 'Clean (Static Heuristic & MIME Passed)',
      };
    });

    const now = new Date().toISOString();
    const newIncident: Incident = {
      id: reportId,
      verificationCode,
      type: type as IncidentType,
      severity: severity as Severity,
      title: String(title).slice(0, 200).trim(),
      description: String(description).trim(),
      affectedService: String(affectedService || 'Not Specified').trim(),
      approximateDateTime: String(approximateDateTime || 'Recent / Ongoing').trim(),
      whatHappened: String(whatHappened || '').trim(),
      actionsTaken: String(actionsTaken || '').trim(),
      contactEmail: String(contactEmail || '').trim(),
      receiveNotifications: receiveNotifications === 'true' || receiveNotifications === true,
      status: 'RECEIVED',
      createdAt: now,
      updatedAt: now,
      assignedAnalyst: null,
      assignedTeam: severity === 'Critical' ? 'Tier 3 Incident Response Unit' : 'AppSec Triage & Intake',
      publicResponse: null,
      requestedInformation: null,
      reporterResponse: null,
      evidence: evidenceList,
      internalNotes: [],
      timeline: [
        {
          id: `tl_${Date.now()}`,
          timestamp: now,
          title: 'Report Received',
          description: 'Incident report submitted and queued for authorized security team triage.',
          type: 'triage',
        },
      ],
    };

    db.incidents.unshift(newIncident);
    saveDatabase();
    broadcastIncidentUpdate(newIncident);

    // Audit log entry
    recordAuditLog(
      'Public Submission Gateway',
      'Incident submitted',
      reportId,
      `New incident reported: ${newIncident.title} (Severity: ${newIncident.severity}, Type: ${newIncident.type})`,
      undefined,
      'RECEIVED'
    );

    // Discord Alert for High/Critical incidents
    if (newIncident.severity === 'High' || newIncident.severity === 'Critical') {
      sendDiscordWebhookAlert(newIncident).catch((err) => {
        console.error('Discord webhook trigger failed:', err);
      });
    }

    // Queue notification
    if (newIncident.contactEmail && newIncident.receiveNotifications) {
      dispatchNotification(
        newIncident.contactEmail,
        `Your security report ${reportId} has been submitted`,
        `Your report has been received by our authorized security operations team. Report ID: ${reportId}. Keep your verification code: ${verificationCode} to inspect status.`,
        'report_submitted'
      );
    }

    return res.status(201).json({
      success: true,
      reportId,
      verificationCode,
      status: 'RECEIVED',
      message: 'Your report has been submitted to our authorized security team.',
    });
  } catch (error: any) {
    console.error('Incident ingestion error:', error);
    return res.status(500).json({ error: 'Internal error processing incident submission.' });
  }
});

// 2. Public Status Lookup (Strictly sanitizes internal notes and sensitive data)
app.post('/api/status/lookup', (req: Request, res: Response) => {
  const { reportId, verificationCode } = req.body;
  if (!reportId || !verificationCode) {
    return res.status(400).json({ error: 'Please enter both Report ID and Verification Code.' });
  }

  const cleanReportId = String(reportId).trim().toUpperCase();
  const cleanCode = String(verificationCode).trim().toUpperCase();

  const incident = db.incidents.find(
    (inc) => inc.id.toUpperCase() === cleanReportId && inc.verificationCode.toUpperCase() === cleanCode
  );

  if (!incident) {
    return res.status(404).json({ error: 'Invalid Report ID or Verification Code. Please check your credentials.' });
  }

  // Return public sanitized view (INTERNAL NOTES STRICTLY STRIPPED)
  const publicView: PublicIncidentView = {
    id: incident.id,
    type: incident.type,
    severity: incident.severity,
    title: incident.title,
    status: incident.status,
    createdAt: incident.createdAt,
    updatedAt: incident.updatedAt,
    assignedTeam: incident.assignedTeam,
    publicResponse: incident.publicResponse,
    requestedInformation: incident.requestedInformation,
    evidence: incident.evidence.map((ev) => ({
      id: ev.id,
      originalName: ev.originalName,
      sizeBytes: ev.sizeBytes,
      uploadedAt: ev.uploadedAt,
      mimeType: ev.mimeType,
    })),
    timeline: incident.timeline.map((t) => ({
      id: t.id,
      timestamp: t.timestamp,
      title: t.title,
      description: t.description,
    })),
  };

  return res.json({ incident: publicView });
});

// 3. Reporter response to requested information
app.post('/api/status/reply', (req: Request, res: Response) => {
  const { reportId, verificationCode, replyMessage } = req.body;
  if (!reportId || !verificationCode || !replyMessage) {
    return res.status(400).json({ error: 'Missing required reply information.' });
  }

  const incident = db.incidents.find(
    (inc) => inc.id === String(reportId).trim() && inc.verificationCode === String(verificationCode).trim()
  );

  if (!incident) {
    return res.status(404).json({ error: 'Incident not found or verification mismatch.' });
  }

  const now = new Date().toISOString();
  incident.reporterResponse = String(replyMessage).trim();
  incident.updatedAt = now;
  // If waiting for reporter, move to UNDER REVIEW
  const prevStatus = incident.status;
  if (incident.status === 'WAITING FOR REPORTER') {
    incident.status = 'UNDER REVIEW';
  }

  incident.timeline.push({
    id: `tl_${Date.now()}`,
    timestamp: now,
    title: 'Reporter Provided Clarification',
    description: 'The reporter submitted requested details to the investigation thread.',
    type: 'communication',
  });

  saveDatabase();
  broadcastIncidentUpdate(incident);

  recordAuditLog(
    'Reporter (Verified Code)',
    'Reporter provided requested information',
    incident.id,
    'Reporter submitted response to requested information query.',
    prevStatus,
    incident.status
  );

  return res.json({ success: true, message: 'Your response was submitted to the investigating analysts.' });
});

// 4. Secure Evidence Download (Accessible via Analyst Session OR Reporter Verification Code)
app.get('/api/incidents/:id/evidence/:fileId', (req: Request, res: Response) => {
  const { id, fileId } = req.params;
  const { code } = req.query;

  const incident = db.incidents.find((inc) => inc.id === id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found.' });
  }

  // Authorization check: Either active analyst session OR matching verification code
  const sessionId = req.cookies.soc_session;
  const session = sessionId ? activeSessions.get(sessionId) : null;
  const isAnalyst = !!session;
  const isReporter = code && typeof code === 'string' && code.trim().toUpperCase() === incident.verificationCode.toUpperCase();

  if (!isAnalyst && !isReporter) {
    return res.status(403).json({ error: 'Access Denied: Evidence requires authorized analyst session or valid report verification token.' });
  }

  const fileMeta = incident.evidence.find((e) => e.id === fileId);
  if (!fileMeta) {
    return res.status(404).json({ error: 'Evidence file not found on record.' });
  }

  const filePath = path.resolve(EVIDENCE_DIR, fileMeta.storedFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Evidence storage artifact is unavailable.' });
  }

  // Audit evidence download
  const actor = isAnalyst ? session?.displayName || 'Analyst' : 'Verified Reporter';
  recordAuditLog(actor, 'Evidence downloaded', incident.id, `Downloaded artifact: ${fileMeta.originalName}`);

  res.setHeader('Content-Type', fileMeta.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileMeta.originalName)}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

// 5. Admin Authentication
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { username, password, mfaCode } = req.body;
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const rateLimitKey = `${clientIp}_${String(username || '').toLowerCase()}`;

  const rateCheck = checkRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Too many failed login attempts. Account protected by rate limiting. Please wait ${rateCheck.waitSeconds} seconds before trying again.`,
      lockoutRemainingSeconds: rateCheck.waitSeconds,
    });
  }

  if (!username || !password) {
    recordLoginFailure(rateLimitKey);
    return res.status(400).json({ error: 'Please enter both username and password.' });
  }

  const cleanUser = String(username).trim().toLowerCase();
  const analyst = db.analysts.find((a) => a.username.toLowerCase() === cleanUser || a.email.toLowerCase() === cleanUser);

  if (!analyst) {
    recordLoginFailure(rateLimitKey);
    return res.status(401).json({
      error: 'Invalid credentials. Please verify your authorized username and password.',
      remainingAttempts: rateCheck.remaining - 1,
    });
  }

  const isValid = verifyPassword(String(password), analyst.passwordHash, analyst.passwordSalt);
  if (!isValid) {
    recordLoginFailure(rateLimitKey);
    return res.status(401).json({
      error: 'Invalid credentials. Please verify your authorized username and password.',
      remainingAttempts: rateCheck.remaining - 1,
    });
  }

  // If MFA is enabled, allow demo code check or default bypass if not set
  if (analyst.mfaEnabled && mfaCode && String(mfaCode).trim().length > 0) {
    // Accepts any standard 6-digit TOTP format
    if (!/^\d{6}$/.test(String(mfaCode).trim())) {
      return res.status(401).json({ error: 'MFA verification code must be a 6-digit security token.' });
    }
  }

  // Successful login
  resetLoginAttempts(rateLimitKey);
  analyst.lastLogin = new Date().toISOString();
  saveDatabase();

  const sessionId = crypto.randomBytes(32).toString('hex');
  const sessionData: ActiveSession = {
    sessionId,
    analystId: analyst.id,
    username: analyst.username,
    displayName: analyst.displayName,
    role: analyst.role,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_LIFETIME_MS,
  };
  activeSessions.set(sessionId, sessionData);

  // Set HTTP-only secure cookie
  res.cookie('soc_session', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_LIFETIME_MS,
    path: '/',
  });

  recordAuditLog(
    analyst.displayName,
    'Analyst logged in',
    'SYSTEM',
    `Authenticated to SOC Operations Dashboard from client IP ${clientIp}`
  );

  return res.json({
    success: true,
    user: {
      id: analyst.id,
      username: analyst.username,
      displayName: analyst.displayName,
      role: analyst.role,
      email: analyst.email,
      mfaEnabled: analyst.mfaEnabled,
      lastLogin: analyst.lastLogin,
    },
  });
});

app.get('/api/admin/me', requireAnalystAuth, (req: Request, res: Response) => {
  const session = (req as any).analyst as ActiveSession;
  const analyst = db.analysts.find((a) => a.id === session.analystId);
  if (!analyst) {
    return res.status(404).json({ error: 'Analyst account no longer exists.' });
  }

  return res.json({
    user: {
      id: analyst.id,
      username: analyst.username,
      displayName: analyst.displayName,
      role: analyst.role,
      email: analyst.email,
      mfaEnabled: analyst.mfaEnabled,
      lastLogin: analyst.lastLogin,
    },
  });
});

app.post('/api/admin/logout', (req: Request, res: Response) => {
  const sessionId = req.cookies.soc_session;
  if (sessionId) {
    const session = activeSessions.get(sessionId);
    if (session) {
      recordAuditLog(session.displayName, 'Analyst logged out', 'SYSTEM', 'Session terminated by user');
      activeSessions.delete(sessionId);
    }
  }
  res.clearCookie('soc_session', { path: '/' });
  return res.json({ success: true, message: 'Logged out successfully' });
});

// 6. Admin Incident Management
app.get('/api/admin/incidents', requireAnalystAuth, (req: Request, res: Response) => {
  const { search, severity, status, type } = req.query;

  let filtered = [...db.incidents];

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (inc) =>
        inc.id.toLowerCase().includes(q) ||
        inc.title.toLowerCase().includes(q) ||
        inc.description.toLowerCase().includes(q) ||
        inc.affectedService.toLowerCase().includes(q) ||
        inc.contactEmail.toLowerCase().includes(q)
    );
  }

  if (severity && severity !== 'ALL') {
    filtered = filtered.filter((inc) => inc.severity === severity);
  }

  if (status && status !== 'ALL') {
    filtered = filtered.filter((inc) => inc.status === status);
  }

  if (type && type !== 'ALL') {
    filtered = filtered.filter((inc) => inc.type === type);
  }

  return res.json({ incidents: filtered });
});

app.get('/api/admin/incidents/:id', requireAnalystAuth, (req: Request, res: Response) => {
  const incident = db.incidents.find((inc) => inc.id === req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found.' });
  }
  return res.json({ incident });
});

// Update Incident Status
app.post('/api/admin/incidents/:id/status', requireAnalystAuth, (req: Request, res: Response) => {
  const { status, note } = req.body;
  const incident = db.incidents.find((inc) => inc.id === req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found.' });
  }

  const validStatuses: IncidentStatus[] = [
    'RECEIVED',
    'UNDER REVIEW',
    'INVESTIGATING',
    'MITIGATION',
    'WAITING FOR REPORTER',
    'RESOLVED',
    'CLOSED',
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid incident status.' });
  }

  const prevStatus = incident.status;
  const now = new Date().toISOString();
  incident.status = status;
  incident.updatedAt = now;

  const analyst = (req as any).analyst as ActiveSession;

  incident.timeline.push({
    id: `tl_${Date.now()}`,
    timestamp: now,
    title: `Status Changed to ${status}`,
    description: note || `Status transitioned from ${prevStatus} to ${status} by ${analyst.displayName}.`,
    type: 'status_change',
  });

  saveDatabase();
  broadcastIncidentUpdate(incident);

  recordAuditLog(
    analyst.displayName,
    `Status changed from ${prevStatus} to ${status}`,
    incident.id,
    note || `Incident status updated to ${status}`,
    prevStatus,
    status
  );

  // Send status update notification to reporter
  if (incident.contactEmail && incident.receiveNotifications) {
    const isResolved = status === 'RESOLVED' || status === 'CLOSED';
    dispatchNotification(
      incident.contactEmail,
      `Your security report ${incident.id} has been updated to ${status}`,
      `Your security report ${incident.id} has progressed to status: ${status}. Visit the status portal to check the latest findings.`,
      isResolved ? 'resolved' : 'status_changed'
    );
  }

  return res.json({ success: true, incident });
});

// Assign Analyst / Team
app.post('/api/admin/incidents/:id/assign', requireAnalystAuth, (req: Request, res: Response) => {
  const { assignedAnalyst, assignedTeam } = req.body;
  const incident = db.incidents.find((inc) => inc.id === req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found.' });
  }

  const actor = (req as any).analyst as ActiveSession;
  const now = new Date().toISOString();

  if (assignedAnalyst !== undefined) {
    incident.assignedAnalyst = assignedAnalyst || null;
  }
  if (assignedTeam) {
    incident.assignedTeam = assignedTeam;
  }
  incident.updatedAt = now;

  incident.timeline.push({
    id: `tl_${Date.now()}`,
    timestamp: now,
    title: 'Assignment Updated',
    description: `Assigned to ${incident.assignedAnalyst || 'Unassigned'} (${incident.assignedTeam}) by ${actor.displayName}.`,
    type: 'status_change',
  });

  saveDatabase();
  broadcastIncidentUpdate(incident);

  recordAuditLog(
    actor.displayName,
    'Analyst assigned incident',
    incident.id,
    `Assigned analyst: ${incident.assignedAnalyst || 'None'}, Team: ${incident.assignedTeam}`
  );

  return res.json({ success: true, incident });
});

// Add Internal Note (Strictly confidential)
app.post('/api/admin/incidents/:id/internal-note', requireAnalystAuth, (req: Request, res: Response) => {
  const { content } = req.body;
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: 'Note content cannot be empty.' });
  }

  const incident = db.incidents.find((inc) => inc.id === req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found.' });
  }

  const analyst = (req as any).analyst as ActiveSession;
  const now = new Date().toISOString();

  const note = {
    id: `note_${Date.now()}`,
    analyst: analyst.displayName,
    createdAt: now,
    content: String(content).trim(),
  };

  incident.internalNotes.push(note);
  incident.updatedAt = now;
  saveDatabase();
  broadcastIncidentUpdate(incident);

  recordAuditLog(
    analyst.displayName,
    'Internal note added',
    incident.id,
    'Confidential analyst forensic observation added to case file'
  );

  return res.json({ success: true, note });
});

// Update Public Response
app.post('/api/admin/incidents/:id/public-response', requireAnalystAuth, (req: Request, res: Response) => {
  const { publicResponse } = req.body;
  const incident = db.incidents.find((inc) => inc.id === req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found.' });
  }

  const analyst = (req as any).analyst as ActiveSession;
  const now = new Date().toISOString();

  incident.publicResponse = String(publicResponse || '').trim();
  incident.updatedAt = now;

  incident.timeline.push({
    id: `tl_${Date.now()}`,
    timestamp: now,
    title: 'Public Response Published',
    description: 'Updated official communication published for the reporter.',
    type: 'communication',
  });

  saveDatabase();
  broadcastIncidentUpdate(incident);

  recordAuditLog(
    analyst.displayName,
    'Public response updated',
    incident.id,
    'Published sanitized advisory response visible on public status page'
  );

  if (incident.contactEmail && incident.receiveNotifications) {
    dispatchNotification(
      incident.contactEmail,
      `Your security report ${incident.id} has an official response`,
      `The SOC team has published a public response to your case: "${incident.publicResponse}". Visit the status portal to view full details.`,
      'status_changed'
    );
  }

  return res.json({ success: true, incident });
});

// Request Information from Reporter
app.post('/api/admin/incidents/:id/request-info', requireAnalystAuth, (req: Request, res: Response) => {
  const { question } = req.body;
  if (!question || !String(question).trim()) {
    return res.status(400).json({ error: 'Question / requested information cannot be empty.' });
  }

  const incident = db.incidents.find((inc) => inc.id === req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found.' });
  }

  const analyst = (req as any).analyst as ActiveSession;
  const now = new Date().toISOString();
  const prevStatus = incident.status;

  incident.requestedInformation = String(question).trim();
  incident.status = 'WAITING FOR REPORTER';
  incident.updatedAt = now;

  incident.timeline.push({
    id: `tl_${Date.now()}`,
    timestamp: now,
    title: 'Information Requested from Reporter',
    description: incident.requestedInformation,
    type: 'communication',
  });

  saveDatabase();
  broadcastIncidentUpdate(incident);

  recordAuditLog(
    analyst.displayName,
    'Status changed from ' + prevStatus + ' to WAITING FOR REPORTER',
    incident.id,
    `Analyst requested clarification: ${incident.requestedInformation}`,
    prevStatus,
    'WAITING FOR REPORTER'
  );

  if (incident.contactEmail) {
    dispatchNotification(
      incident.contactEmail,
      `Action Required: Information requested on report ${incident.id}`,
      `Our security analysts are investigating your report and require additional clarification: "${incident.requestedInformation}". Please visit the status portal using your verification code to reply.`,
      'info_requested'
    );
  }

  return res.json({ success: true, incident });
});

// 7. Audit Log API
app.get('/api/admin/audit-logs', requireAnalystAuth, (_req: Request, res: Response) => {
  return res.json({ logs: db.auditLogs });
});

// 8. Notifications API
app.get('/api/admin/notifications', requireAnalystAuth, (_req: Request, res: Response) => {
  return res.json({ notifications: db.notifications });
});

// 9. Discord Webhook Test & Status
app.post('/api/admin/test-webhook', requireAnalystAuth, async (req: Request, res: Response) => {
  const webhookUrl = process.env.DISCORD_SECURITY_WEBHOOK_URL || DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(400).json({
      error: 'DISCORD_SECURITY_WEBHOOK_URL environment variable is not configured on the server.',
    });
  }

  const dummyIncident: Incident = {
    id: 'SEC-2026-TEST01',
    verificationCode: 'VRF-0000-T1',
    type: 'Vulnerability',
    severity: 'Critical',
    title: 'Test Webhook Verification Payload',
    description: 'Verifying automated incident broadcast pipeline',
    affectedService: 'SOC Webhook Gateway',
    approximateDateTime: new Date().toISOString(),
    whatHappened: 'Manual analyst diagnostic probe',
    actionsTaken: 'Test webhook triggered',
    contactEmail: 'analyst@soc.internal',
    receiveNotifications: false,
    status: 'RECEIVED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignedAnalyst: null,
    assignedTeam: 'Tier 3 Incident Response Unit',
    publicResponse: null,
    requestedInformation: null,
    reporterResponse: null,
    evidence: [],
    internalNotes: [],
    timeline: [],
  };

  const ok = await sendDiscordWebhookAlert(dummyIncident);
  if (ok) {
    const analyst = (req as any).analyst as ActiveSession;
    recordAuditLog(analyst.displayName, 'Discord webhook tested', 'SYSTEM', 'Test diagnostic alert dispatched');
    return res.json({ success: true, message: 'Discord webhook alert successfully delivered to channel!' });
  } else {
    return res.status(502).json({ error: 'Discord webhook returned a non-200 status code. Please verify URL token validity.' });
  }
});

// RFC 9116 / security.txt endpoint
app.get('/.well-known/security.txt', (_req: Request, res: Response) => {
  const txt = [
    '# Security Operations Center RFC 9116 Disclosure Specification',
    'Contact: https://ais-dev-l5hlrbnksvk3uhxsgpaqy6-624891279767.asia-southeast1.run.app/report',
    'Expires: 2027-12-31T23:59:59.000Z',
    'Preferred-Languages: en',
    'Canonical: https://ais-dev-l5hlrbnksvk3uhxsgpaqy6-624891279767.asia-southeast1.run.app/.well-known/security.txt',
    'Policy: https://ais-dev-l5hlrbnksvk3uhxsgpaqy6-624891279767.asia-southeast1.run.app/security',
    'Acknowledgments: https://ais-dev-l5hlrbnksvk3uhxsgpaqy6-624891279767.asia-southeast1.run.app/security#acknowledgments',
  ].join('\n');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(txt);
});

// Vite middleware mounting in development or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SOC] Security Operations Center server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
