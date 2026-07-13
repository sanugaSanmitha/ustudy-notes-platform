import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = 'UStudy <noreply@mail.ustudy.dev>';

export async function sendVerificationEmail(
  email: string,
  token: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Your Ustudy Notes Verification Code',
      html: `
        <h2>Welcome to Ustudy Notes!</h2>
        <p>Use this verification code to activate your account:</p>
        <div style="
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 1px;
          padding: 12px 16px;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          background-color: #F8FAFC;
          display: inline-block;
          color: #0F172A;
        ">
          ${token}
        </div>
        <p style="margin-top: 16px;">This code expires in 24 hours.</p>
        <p>If you requested multiple codes, only the latest one works.</p>
      `,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
) {
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Reset Your Ustudy account Password',
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="
          background-color: #2563EB;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 8px;
          display: inline-block;
        ">
          Reset Password
        </a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, ignore this email.</p>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

type AdminReviewEmailPayload = {
  adminEmail: string | string[];
  studentName: string;
  studentEmail: string;
  university: string;
  uploadDate: string;
  transcriptId: string;
  issueType: string;
  userMessage: string;
  transcriptFilename: string;
  externalTranscriptUrl?: string;
};

export async function sendAdminReviewRequestEmail(payload: AdminReviewEmailPayload) {
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: payload.adminEmail,
      subject: `Manual Transcript Review Request - ${payload.studentName}`,
      html: `
        <h2>Request Manual Transcript Review</h2>
        <p>Your user submitted a manual transcript review request.</p>

        <h3>Student</h3>
        <p>${payload.studentName}</p>

        <h3>Email</h3>
        <p>${payload.studentEmail}</p>

        <h3>University</h3>
        <p>${payload.university}</p>

        <h3>Upload Date</h3>
        <p>${payload.uploadDate}</p>

        <h3>Transcript ID</h3>
        <p>${payload.transcriptId}</p>

        <h3>Issue Type</h3>
        <p>${payload.issueType}</p>

        <h3>User Message</h3>
        <p>${payload.userMessage || '(no additional message)'}</p>

        <h3>Attachment</h3>
        <p>${payload.transcriptFilename || 'Transcript.pdf'}</p>
        ${
          payload.externalTranscriptUrl
            ? `
        <h3>External Transcript Link</h3>
        <p><a href="${payload.externalTranscriptUrl}">${payload.externalTranscriptUrl}</a></p>
        `
            : ''
        }
      `,
    });

    if (error) {
      console.error('Admin review email send error:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Admin review email send error:', error);
    return { success: false, error };
  }
}

type VerificationOutcomeEmailPayload = {
  studentEmail: string;
  studentName: string;
  transcriptId: string;
  adminNotes?: string | null;
};

export async function sendGradeVerificationApprovedEmail(payload: VerificationOutcomeEmailPayload) {
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: payload.studentEmail,
      subject: 'Your transcript has been approved',
      html: `
        <h2>Transcript Approved</h2>
        <p>Hi ${payload.studentName || 'Student'},</p>
        <p>Your transcript verification has been approved.</p>
        <p><strong>Transcript ID:</strong> ${payload.transcriptId}</p>
        ${
          payload.adminNotes
            ? `<p><strong>Reviewer notes:</strong> ${payload.adminNotes}</p>`
            : ''
        }
        <p>You can now continue seller onboarding and upload notes.</p>
      `,
    });

    if (error) {
      console.error('Verification approved email error:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Verification approved email error:', error);
    return { success: false, error };
  }
}

export async function sendGradeVerificationRejectedEmail(payload: VerificationOutcomeEmailPayload) {
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: payload.studentEmail,
      subject: 'Your transcript verification requires re-submission',
      html: `
        <h2>Transcript Verification Update</h2>
        <p>Hi ${payload.studentName || 'Student'},</p>
        <p>We could not approve this transcript submission.</p>
        <p><strong>Transcript ID:</strong> ${payload.transcriptId}</p>
        ${
          payload.adminNotes
            ? `<p><strong>Reviewer notes:</strong> ${payload.adminNotes}</p>`
            : ''
        }
        <p>Please re-upload a clearer transcript or provide additional details and submit again.</p>
      `,
    });

    if (error) {
      console.error('Verification rejected email error:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Verification rejected email error:', error);
    return { success: false, error };
  }
}

type NoteListingOutcomeEmailPayload = {
  sellerEmail: string;
  sellerName: string;
  listingTitle: string;
  courseCode: string;
  adminNotes?: string | null;
  rejectReasonLabel?: string | null;
  rejectComment?: string | null;
};

export async function sendNoteListingApprovedEmail(payload: NoteListingOutcomeEmailPayload) {
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: payload.sellerEmail,
      subject: `Your note listing is now live — ${payload.courseCode}`,
      html: `
        <h2>Note Listing Approved</h2>
        <p>Hi ${payload.sellerName || 'Seller'},</p>
        <p>Your note listing <strong>${payload.listingTitle}</strong> for ${payload.courseCode} has been approved and is now published on UStudy.</p>
        ${
          payload.adminNotes
            ? `<p><strong>Reviewer notes:</strong> ${payload.adminNotes}</p>`
            : ''
        }
        <p>Buyers can now discover and purchase your notes.</p>
      `,
    });

    if (error) {
      console.error('Note listing approved email error:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Note listing approved email error:', error);
    return { success: false, error };
  }
}

export async function sendNoteListingRejectedEmail(payload: NoteListingOutcomeEmailPayload) {
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: payload.sellerEmail,
      subject: `Note listing update — ${payload.courseCode}`,
      html: `
        <h2>Note Listing Not Approved</h2>
        <p>Hi ${payload.sellerName || 'Seller'},</p>
        <p>We could not approve your note listing <strong>${payload.listingTitle}</strong> for ${payload.courseCode}.</p>
        ${
          payload.rejectReasonLabel
            ? `<p><strong>Reason:</strong> ${payload.rejectReasonLabel}</p>`
            : ''
        }
        ${
          payload.rejectComment
            ? `<p><strong>Reviewer comment:</strong> ${payload.rejectComment}</p>`
            : ''
        }
        <p>You can revise your materials and submit a new listing from the Notes Upload page.</p>
      `,
    });

    if (error) {
      console.error('Note listing rejected email error:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Note listing rejected email error:', error);
    return { success: false, error };
  }
}
