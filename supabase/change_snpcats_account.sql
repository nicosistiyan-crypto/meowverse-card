-- Ganti username + password akun 'snpcats'. Jalankan sekali di Supabase SQL Editor.
-- username baru: sistiyan | password baru: (hash bcrypt cost 12, sama seperti yang dibuat saat register/login)
update users
   set username = 'sistiyan',
       password_hash = '$2b$12$t/56T9r9x/qWiB3Xuoy6b.CWQ7PuRxyg5q0DNQQCH5U.JbE7Ww9/O'
 where username = 'snpcats';

-- cek: harus tampil 1 baris dengan username sistiyan
select id, username, role, active from users where username = 'sistiyan';
