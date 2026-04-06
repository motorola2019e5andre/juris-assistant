const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('juris_dev.db');

const command = process.argv[2];
const email = process.argv[3];
const value = process.argv[4];

async function main() {
  switch(command) {
    case 'list':
      const users = db.prepare('SELECT id, name, email, credits FROM users').all();
      console.table(users);
      break;
      
    case 'add':
      if (!email || !value) {
        console.log('Uso: node admin.js add email quantidade');
        break;
      }
      db.prepare('UPDATE users SET credits = credits + ? WHERE email = ?').run(parseInt(value), email);
      console.log(`✅ Adicionado ${value} créditos para ${email}`);
      break;
      
    case 'set':
      if (!email || !value) {
        console.log('Uso: node admin.js set email quantidade');
        break;
      }
      db.prepare('UPDATE users SET credits = ? WHERE email = ?').run(parseInt(value), email);
      console.log(`✅ Créditos definidos para ${value} para ${email}`);
      break;
      
    case 'create':
      if (!email || !value) {
        console.log('Uso: node admin.js create email senha');
        break;
      }
      const hash = await bcrypt.hash(value, 10);
      const id = 'user_' + Math.random().toString(36).substr(2, 16);
      const name = email.split('@')[0];
      db.prepare('INSERT INTO users (id, name, email, password, credits) VALUES (?, ?, ?, ?, ?)')
        .run(id, name, email, hash, 100);
      console.log(`✅ Usuário criado: ${email} | Senha: ${value}`);
      break;
      
    default:
      console.log(`
╔══════════════════════════════════════════════════════════╗
║                 JURIS ASSISTANT - ADMIN                  ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  COMANDOS:                                               ║
║                                                          ║
║  node admin.js list                   → Listar usuários  ║
║  node admin.js add email 50           → +50 créditos     ║
║  node admin.js set email 500          → =500 créditos    ║
║  node admin.js create email senha     → Novo usuário     ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
      `);
  }
}

main();