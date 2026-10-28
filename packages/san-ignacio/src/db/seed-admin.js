import 'dotenv/config';import bcrypt from 'bcrypt';import {db} from '../lib/db.js';
const name=String(process.env.ADMIN_NAME||'Secretaría').trim(),email=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase(),password=String(process.env.ADMIN_PASSWORD||'');
try{
 const existing=email?await db.query('SELECT id FROM users WHERE lower(email)=$1',[email]):await db.query("SELECT id FROM users WHERE role='admin' AND active=TRUE LIMIT 1");
 if(existing.rowCount){console.log('Administrador existente conservado; no se cambia su contraseña ni sus permisos.');}
 else{
  if(!email||!password)throw new Error('ADMIN_EMAIL y ADMIN_PASSWORD son obligatorios para crear la primera cuenta.');
  if(password.length<12)throw new Error('La contraseña de una cuenta nueva requiere al menos 12 caracteres.');
  const passwordHash=await bcrypt.hash(password,12);
  await db.query("INSERT INTO users(name,email,password_hash,role,active) VALUES($1,$2,$3,'admin',TRUE) ON CONFLICT(email) DO NOTHING",[name,email,passwordHash]);
  console.log('Inicialización completada; las cuentas existentes no se modificaron.');
 }
}catch(error){console.error('No se pudo preparar el administrador:',error.message);process.exitCode=1;}finally{await db.end();}
