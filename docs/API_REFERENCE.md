# Referensi API TTLOCK Dashboard

Dokumen ini merinci endpoint REST API yang disediakan oleh Backend TTLOCK Dashboard serta integrasinya dengan TTLOCK Open Platform API v3.

---

## 1. Endpoint Autentikasi

### `GET /api/auth/status`
Mengecek status autentikasi token TTLOCK saat ini.

**Respon Contoh:**
```json
{
  "authenticated": true,
  "uid": 1234567,
  "expiresAt": "2026-12-08T03:56:40.900Z",
  "scope": "app",
  "username": "user@example.com"
}
```

---

## 2. Endpoint Lockbox

### `GET /api/locks/enriched`
Mengambil seluruh daftar lockbox yang diperkaya dengan data waktu pembukaan terakhir (`lastOpen`).

**Respon Contoh:**
```json
{
  "list": [
    {
      "lockId": 26136614,
      "lockName": "K3BLE_b27fff",
      "lockAlias": "Lockbox-025",
      "lockMac": "78:36:63:FF:7F:B2",
      "electricQuantity": 25,
      "hasGateway": 1,
      "lastOpen": 1790573929000
    }
  ]
}
```

---

### `GET /api/locks/:lockId`
Mengambil rincian spesifikasi lockbox (firmware, hardware, battery, feature value, dll).

---

### `GET /api/locks/:lockId/records?pageNo=1&pageSize=20`
Mengambil riwayat log pembukaan lockbox secara paginated.

**Respon Contoh:**
```json
{
  "list": [
    {
      "recordId": 98214,
      "lockDate": 1790573929000,
      "recordType": 1,
      "username": "Admin",
      "success": 1
    }
  ],
  "total": 45,
  "pages": 3,
  "pageNo": 1,
  "pageSize": 20
}
```

---

### `GET /api/locks/:lockId/gateway`
Mengambil daftar Gateway yang saat ini terhubung dengan Lockbox tertentu beserta kekuatan sinyal Bluetooth (RSSI).

---

### `POST /api/locks/:lockId/passcode`
Membuat **One-Time Passcode (PIN 6 Jam)** secara offline menggunakan algoritma TTLOCK (`keyboardPwdType: 1`).

**Respon Sukses:**
```json
{
  "ok": true,
  "keyboardPwd": "18530547",
  "keyboardPwdId": 120432046,
  "lockId": 26136614,
  "type": 1,
  "typeName": "One-time",
  "validHours": 6,
  "ts": "2026-10-03T07:44:19.544Z"
}
```

**Respon Gagal:**
```json
{
  "ok": false,
  "errcode": -3,
  "errmsg": "Invalid Parameter",
  "human": "Invalid Parameter",
  "lockId": 26136614,
  "ts": "2026-10-03T07:44:19.544Z"
}
```

---

### `POST /api/locks/:lockId/unlock`
Mengirimkan perintah pembukaan kunci jarak jauh (*remote unlock*) ke lockbox via Gateway WiFi.

**Respon Sukses:**
```json
{
  "ok": true,
  "errcode": 0,
  "errmsg": "none error message",
  "human": "Success",
  "lockId": 26136614,
  "ts": "2026-10-03T07:44:19.544Z"
}
```

---

## 3. Endpoint Gateway

### `GET /api/gateways`
Mengambil seluruh daftar Gateway TTLOCK.

---

### `GET /api/gateways/:gatewayId/topology`
Mengambil topologi hubungan antara Gateway dengan seluruh Lockbox yang terhubung di sekitarnya beserta nilai RSSI (dichache 5 detik).

---

## 4. Daftar Kode Error Umum TTLOCK

| Kode Error | Keterangan | Tindakan Solusi |
|---|---|---|
| `0` | Berhasil (Success) | - |
| `-3` | Parameter Tidak Valid | Periksa kelengkapan parameter request (`startDate`, `lockId`, dll). |
| `-2012` | Lock tidak terhubung ke Gateway | Pastikan jarak lockbox dan gateway dalam jangkauan Bluetooth. |
| `-4043` | Fitur Remote Unlock belum aktif | Aktifkan opsi *Remote Unlock* pada pengaturan lockbox di aplikasi mobile TTLOCK. |
| `10003` | Token Tidak Valid / Expired | Backend akan otomatis melakukan refresh token. |
| `10007` | Akun / Password Salah | Periksa kredensial pada file `backend/.env`. |
