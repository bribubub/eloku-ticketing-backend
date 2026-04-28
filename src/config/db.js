import pkg from 'pg';
import 'dotenv/config';

const { Pool } = pkg;

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.connect(async (err) => {
  if (err) {
    console.error('❌ Database Gagal:', err.message);
    return;
  }
  console.log('✅ PostgreSQL Lokal Terhubung! 🐘');

  try {
    // Jalankan DROP TABLE ini SEKALI SAJA jika ingin reset data dari nol (hapus "//" di depannya)
    // await pool.query('DROP TABLE IF EXISTS ticket_histories CASCADE;');
    // await pool.query('DROP TABLE IF EXISTS ticket_attachments CASCADE;');
    // await pool.query('DROP TABLE IF EXISTS tickets CASCADE;');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        ticket_number VARCHAR(50) UNIQUE,
        merchant_serial VARCHAR(100),
        user_serial VARCHAR(100),
        owner_email VARCHAR(150),
        type VARCHAR(50), 
        sub_type VARCHAR(100),
        title VARCHAR(150),
        description TEXT,
        status VARCHAR(50) DEFAULT 'receive',
        priority VARCHAR(50),
        resolution_note TEXT,
        created_by VARCHAR(100),
        updated_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Memastikan kolom owner_email ditambahkan jika sebelumnya lupa (Tanpa perlu reset DB)
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS owner_email VARCHAR(150);

      CREATE TABLE IF NOT EXISTS ticket_attachments (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
        file_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ticket_histories (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
        title VARCHAR(100),
        description TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("✅ Struktur database baru (General Ticketing) berhasil diterapkan!");
  } catch (error) {
    console.error("❌ Gagal memproses struktur database:", error.message);
  }
}); 