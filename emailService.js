import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const environment = process.env.NODE_ENV || 'development';
let transporter;

if (environment === 'production' || environment === 'staging') {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  console.log('📧 Email Service siap menggunakan: Mode SMTP (Production/Staging)');
} else {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS
    }
  });
  console.log('📧 Email Service siap menggunakan: Mode Gmail (Local Development)');
}


export const sendTicketCreatedEmail = async (owner_email, merchant, ticket_number, title, type, sub_type) => {
  if (!owner_email) return; 


  const namaUser = owner_email.split('@')[0];

  try {
    const sender = '"IT Support Eloku" <' + (environment === 'production' ? process.env.SMTP_USER : process.env.EMAIL_USER) + '>';
    await transporter.sendMail({
      from: sender, 
      to: owner_email,
      subject: `[Eloku Support] Tiket Diterima (Inbox) - ${ticket_number}`,
      html: `
        <h3>Halo ${namaUser},</h3>
        <p>Laporan kendala Anda dari cabang <strong>${merchant}</strong> telah berhasil masuk ke <strong>Inbox</strong> sistem kami.</p>
        <ul>
          <li><strong>Nomor Tiket:</strong> ${ticket_number}</li>
          <li><strong>Kategori:</strong> ${type.toUpperCase()} (${sub_type})</li>
          <li><strong>Detail Masalah:</strong> ${title}</li>
        </ul>
        <p>Mohon ditunggu, tim kami akan segera menindaklanjuti laporan ini.</p>
      `
    });
    console.log(`✅ Email Inbox tiket ${ticket_number} terkirim ke ${owner_email}`);
  } catch (err) { console.error("❌ Gagal kirim email:", err); }
};


export const sendTicketStatusUpdateEmail = async (owner_email, ticket_number, status, resolution_note = '') => {
  if (!owner_email) return; 

  
  const namaUser = owner_email.split('@')[0];

  let subject = '';
  let htmlBody = '';

  switch (status) {
    case 'open':
      subject = `[Eloku Support] Status Berubah: Sedang Dilihat (Open) - ${ticket_number}`;
      htmlBody = `
        <h3>Halo ${namaUser},</h3>
        <p>Tiket Anda (<strong>${ticket_number}</strong>) sekarang berstatus <strong style="color: #2563eb;">Open (Sedang Dilihat)</strong>.</p>
        <p>Laporan Anda sedang dicek dan ditangani oleh tim ahli kami. Kami akan menginformasikan kembali jika ada perkembangan terbaru.</p>
      `;
      break;
    case 'in_progress':
      subject = `[Eloku Support] Status Berubah: In Progress - ${ticket_number}`;
      htmlBody = `
        <h3>Halo ${namaUser},</h3>
        <p>Kabar baik! Tiket Anda (<strong>${ticket_number}</strong>) saat ini sudah berstatus <strong style="color: #d97706;">In Progress</strong>.</p>
        <p>Tim kami sedang fokus memproses dan menindaklanjuti kendala yang Anda laporkan.</p>
      `;
      break;
    case 'close':
      subject = `[Eloku Support] Tiket Selesai (Completed) - ${ticket_number}`;
      htmlBody = `
        <h3>Halo ${namaUser},</h3>
        <p>Selesai! Tiket Anda (<strong>${ticket_number}</strong>) kini telah berstatus <strong style="color: #10b981;">Completed</strong>.</p>
        <p>Kendala yang Anda laporkan telah berhasil diatasi.</p>
        ${resolution_note ? `
        <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #10b981; margin-top: 15px;">
          <p style="margin:0; font-size: 12px; color: #6b7280; font-weight: bold;">TINDAKAN PENYELESAIAN:</p>
          <p style="margin: 5px 0 0 0; font-style: italic;">"${resolution_note}"</p>
        </div>` : ''}
        <p style="margin-top: 15px;">Terima kasih telah menggunakan layanan IT Support kami!</p>
      `;
      break;
    default:
      return; 
  }

  try {
    const sender = '"IT Support Eloku" <' + (environment === 'production' ? process.env.SMTP_USER : process.env.EMAIL_USER) + '>';
    await transporter.sendMail({
      from: sender,
      to: owner_email,
      subject: subject,
      html: htmlBody
    });
    console.log(`✅ Email update status (${status}) tiket ${ticket_number} terkirim!`);
  } catch (err) { console.error(`❌ Gagal kirim email status ${status}:`, err); }
};