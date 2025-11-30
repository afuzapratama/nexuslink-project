# 🔐 GitHub SSH Setup - Arch Linux

**Tanggal:** November 30, 2025  
**OS:** Arch Linux (Baru)

---

## **Step 1: Generate SSH Key**

```bash
# Generate SSH key dengan email GitHub kamu
ssh-keygen -t ed25519 -C "your-email@example.com"

# Kalau diminta:
# - Enter file location: Tekan ENTER (pakai default)
# - Enter passphrase: Tekan ENTER (kosong) atau isi password (lebih aman)
# - Confirm passphrase: Ulangi password atau ENTER
```

**Output akan simpan di:**
- Private key: `~/.ssh/id_ed25519`
- Public key: `~/.ssh/id_ed25519.pub`

---

## **Step 2: Start SSH Agent**

```bash
# Start ssh-agent di background
eval "$(ssh-agent -s)"

# Add SSH key ke agent
ssh-add ~/.ssh/id_ed25519
```

**Expected output:** `Identity added: /home/natama/.ssh/id_ed25519`

---

## **Step 3: Copy Public Key**

```bash
# Print public key (untuk copy manual)
cat ~/.ssh/id_ed25519.pub

# Atau copy langsung ke clipboard (jika ada xclip)
cat ~/.ssh/id_ed25519.pub | xclip -selection clipboard
```

**Public key format:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... your-email@example.com
```

---

## **Step 4: Add to GitHub**

1. **Buka browser → GitHub.com**
2. **Settings** (klik foto profil kanan atas → Settings)
3. **SSH and GPG keys** (sidebar kiri)
4. **New SSH key** (tombol hijau)
5. **Isi form:**
   - Title: `Arch Linux - NexusLink Dev` (atau nama PC kamu)
   - Key type: `Authentication Key`
   - Key: **Paste** public key dari step 3
6. **Add SSH key** (tombol hijau)
7. **Confirm password** GitHub kamu

---

## **Step 5: Test Connection**

```bash
# Test SSH connection ke GitHub
ssh -T git@github.com
```

**Expected output:**
```
Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

**Kalau ada warning "authenticity of host":**
- Ketik `yes` dan ENTER
- Fingerprint GitHub akan disimpan di `~/.ssh/known_hosts`

---

## **Step 6: Configure Git (Kalau Belum)**

```bash
# Set nama (akan muncul di commit)
git config --global user.name "Your Name"

# Set email (HARUS sama dengan GitHub email)
git config --global user.email "your-email@example.com"

# Verify
git config --global --list
```

---

## **✅ VERIFIKASI BERHASIL**

Jalankan semua ini untuk memastikan setup berhasil:

```bash
# 1. SSH key exists
ls -la ~/.ssh/id_ed25519*

# 2. SSH agent running
ssh-add -l

# 3. GitHub connection works
ssh -T git@github.com

# 4. Git configured
git config --global user.name
git config --global user.email
```

---

## **🚨 Troubleshooting**

### Error: "Permission denied (publickey)"
```bash
# Check apakah key sudah di-add ke agent
ssh-add -l

# Kalau belum, add lagi
ssh-add ~/.ssh/id_ed25519

# Test lagi
ssh -T git@github.com
```

### Error: "Could not open a connection to your authentication agent"
```bash
# Start ssh-agent lagi
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

### Error: "Bad owner or permissions"
```bash
# Fix permission SSH folder
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
```

---

## **📝 Notes**

- **Private key** (`id_ed25519`) → JANGAN PERNAH SHARE!
- **Public key** (`id_ed25519.pub`) → Aman untuk ditambahkan ke GitHub
- **Passphrase** → Optional tapi lebih aman (encrypt private key)
- **SSH Agent** → Harus running setiap boot (atau tambah ke `.zshrc`)

---

## **🔄 Auto-start SSH Agent (Optional)**

Tambahkan ke `~/.zshrc` agar auto-start:

```bash
# Add to ~/.zshrc
echo '# Start SSH Agent' >> ~/.zshrc
echo 'if [ -z "$SSH_AUTH_SOCK" ]; then' >> ~/.zshrc
echo '  eval "$(ssh-agent -s)" > /dev/null' >> ~/.zshrc
echo '  ssh-add ~/.ssh/id_ed25519 2>/dev/null' >> ~/.zshrc
echo 'fi' >> ~/.zshrc

# Reload shell
source ~/.zshrc
```

---

**Status:** ⏳ Ready untuk dijalankan  
**Next:** Setelah setup SSH, lanjut ke repository setup
