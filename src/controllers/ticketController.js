import { pool } from '../config/db.js';
import { sendTicketCreatedEmail, sendTicketStatusUpdateEmail } from '../../emailService.js'; 

const HISTORY_TEMPLATES = {
  'receive': { title: "Laporan Diterima 📥", desc: "Laporan Anda sudah masuk dan sedang menunggu antrean." },
  'open': { title: "Sedang Dilihat Admin 👀", desc: "Laporan Anda sedang dicek dan ditangani oleh tim teknisi kami." },
  'in_progress': { title: "Sedang Dikerjakan 🛠️", desc: "Tim teknisi sedang menangani kendala Anda." },
  'close': { title: "Tiket Selesai ✅", desc: "Kendala telah berhasil diselesaikan." }
};

export const createTicket = async (req, res) => {
  const { merchant_serial, user_serial, owner_email, type, sub_type, title, description, images } = req.body;
  const ticket_number = `TIK-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  const client = await pool.connect(); 

  try {
    await client.query('BEGIN'); 
    
    const ticketSql = `
      INSERT INTO tickets (ticket_number, merchant_serial, user_serial, owner_email, type, sub_type, title, description, status, created_by) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'receive', $9) RETURNING id
    `;
    const ticketRes = await client.query(ticketSql, [
      ticket_number, merchant_serial, user_serial, owner_email, type || 'device', sub_type, title, description, user_serial
    ]);
    const newTicketId = ticketRes.rows[0].id;

    if (images && images.length > 0) {
      for (const url of images) {
        if(url) await client.query('INSERT INTO ticket_attachments (ticket_id, file_url) VALUES ($1, $2)', [newTicketId, url]);
      }
    }
    
    await client.query(
      "INSERT INTO ticket_histories (ticket_id, title, description, created_by) VALUES ($1, $2, $3, $4)", 
      [newTicketId, 'Tiket Dibuat 📝', 'Laporan berhasil diterima oleh sistem.', user_serial]
    );

    await client.query('COMMIT'); 

    if (owner_email) {
      sendTicketCreatedEmail(owner_email, merchant_serial, ticket_number, title, type, sub_type)
        .catch(err => console.error("❌ Email gagal dikirim:", err));
    }
    res.json({ message: 'Sukses!' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release(); 
  }
};

export const getAllTickets = async (req, res) => {
  try { 
    const sql = `
      SELECT t.*, COALESCE((SELECT json_agg(file_url) FROM ticket_attachments WHERE ticket_id = t.id), '[]'::json) as images
      FROM tickets t ORDER BY t.created_at DESC
    `;
    const result = await pool.query(sql);
    res.json(result.rows); 
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getTicketHistory = async (req, res) => {
  try { 
    const result = await pool.query("SELECT * FROM ticket_histories WHERE ticket_id = $1 ORDER BY created_at DESC", [req.params.id]);
    res.json(result.rows); 
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, resolution_note, admin_note, user_serial } = req.body;
    
    const finalStatus = status === 'testing' ? 'in_progress' : status;

    await pool.query(`
      UPDATE tickets SET status = $1, priority = COALESCE($2, priority), resolution_note = COALESCE($3, resolution_note), updated_by = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [finalStatus, priority, resolution_note, user_serial, id]);

    let finalTitle = "Status Diperbarui 🔄";
    let finalDesc = `Status tiket diubah ke: ${finalStatus}`;

    if (admin_note) {
      finalDesc = admin_note; 
    } else {
      const template = HISTORY_TEMPLATES[finalStatus];
      if (template) {
        finalTitle = template.title;
        finalDesc = template.desc;
      }
      if (finalStatus === 'close' && resolution_note) finalDesc = `Catatan Penyelesaian: ${resolution_note}`;
    }

    await pool.query(
      "INSERT INTO ticket_histories (ticket_id, title, description, created_by) VALUES ($1, $2, $3, $4)", 
      [id, finalTitle, finalDesc, user_serial]
    );

    // 📧 Tarik email pelapor dari database sebelum mengirim notifikasi status
    if (!admin_note) {
      const ticketInfo = await pool.query('SELECT ticket_number, owner_email FROM tickets WHERE id = $1', [id]);
      
      if (ticketInfo.rows.length > 0) {
        const t = ticketInfo.rows[0];
        if (t.owner_email) {
          sendTicketStatusUpdateEmail(t.owner_email, t.ticket_number, finalStatus, resolution_note)
            .catch(err => console.error("❌ Email Error:", err));
        } else {
          console.log(`⚠️ Tiket ${t.ticket_number} tidak punya owner_email, notifikasi dilewati.`);
        }
      }
    }
    
    res.json({ message: 'Sukses' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const deleteTicket = async (req, res) => {
  try {
    await pool.query("DELETE FROM tickets WHERE id = $1", [req.params.id]);
    res.json({ message: 'Dihapus!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};