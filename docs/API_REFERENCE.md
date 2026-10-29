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
  "scope": "user,key,room",
  "username": "user@example.com"
}
```

---

## 2. Endpoint Lockbox

### `GET /api/locks/enriched`
Mengambil seluruh daftar lockbox yang diperkaya dengan data waktu pembukaan terakhir (`lastOpen`), kekuatan sinyal gateway terbaik (`rssi`), waktu scan sinyal (`rssiUpdateDate`), serta status gateway terkait (`gatewayIsOnline`, `gatewayId`, `gatewayName`, `networkName`).

**Respon Contoh:**
```json
{
  "list": [
    {
      "lockId": 26136614,
      "lockName": "K3BLE_b27fff",
      "lockAlias": "Dev Lockbox",
      "lockMac": "78:36:63:FF:7F:B2",
      "electricQuantity": 20,
      "hasGateway": 1,
      "lastOpen": 1793066951000,
      "rssi": -82,
      "rssiUpdateDate": 1793071899000,
      "gatewayId": 1902010,
      "gatewayName": "DEV SHARECAR",
      "networkName": "SHARECAR",
      "gatewayIsOnline": 1
    }
  ]
}
```

---

### `GET /api/locks`
Mengambil daftar seluruh lockbox secara cepat (*fast endpoint*) tanpa query `lastOpen` dan sinyal gateway. Digunakan khusus oleh komponen **Autocomplete Search** agar pencarian instan dan responsif.

**Respon Contoh:**
```json
{
  "list": [
    {
      "lockId": 26136614,
      "lockName": "K3BLE_b27fff",
      "lockAlias": "Dev Lockbox",
      "lockMac": "78:36:63:FF:7F:B2",
      "electricQuantity": 20,
      "hasGateway": 1
    }
  ],
  "total": 84
}
```

---

### `GET /api/locks/:lockId`
Mengambil rincian spesifikasi lengkap satu lockbox (firmware, model, hardware, battery, feature value, passage mode, dll).

---

### `GET /api/locks/:lockId/records?pageNo=1&pageSize=20`
Mengambil riwayat log pembukaan lockbox secara paginated.

**Parameter Query:**
- `pageNo` (opsional, default: `1`): Nomor halaman.
- `pageSize` (opsional, default: `20`): Jumlah log per halaman.

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
  "pages": 5,
  "pageNo": 1,
  "pageSize": 10
}
```

---

### `GET /api/locks/:lockId/gateway`
Mengambil informasi gateway yang terhubung ke lockbox beserta kekuatan sinyal RSSI dan waktu pembaruannya.

**Respon Contoh:**
```json
{
  "list": [
    {
      "gatewayId": 1902010,
      "gatewayName": "DEV SHARECAR",
      "gatewayMac": "34:34:30:BB:99:39",
      "rssi": -82,
      "rssiUpdateDate": 1793071899000,
      "networkName": "SHARECAR",
      "isOnline": 1,
      "lockNum": 2,
      "gatewayVersion": 2
    }
  ]
}
```

---

### `POST /api/locks/:lockId/passcode`
Menghasilkan One-Time Passcode (PIN 6-10 digit) offline yang berlaku selama 6 jam dari waktu request. Passcode dihasilkan melalui algoritma sinkronisasi waktu dan **dapat digunakan langsung pada keypad fisik lockbox tanpa koneksi gateway/internet**.

**Respon Contoh:**
```json
{
  "ok": true,
  "keyboardPwd": "12345678",
  "keyboardPwdId": 9876543,
  "lockId": 26136614,
  "type": 1,
  "typeName": "One-time",
  "validHours": 6,
  "ts": "2026-10-27T04:00:00.000Z"
}
```

---

### `POST /api/locks/:lockId/unlock`
Mengirimkan perintah pembukaan kunci jarak jauh (*remote unlock*) ke lockbox melalui Gateway WiFi.

**Syarat Eksekusi:**
1. Lockbox terhubung ke Gateway WiFi yang sedang Online.
2. Fitur *Remote Unlock* telah diaktifkan pada pengaturan lockbox di aplikasi TTLOCK.

**Respon Sukses:**
```json
{
  "ok": true,
  "errcode": 0,
  "errmsg": "none error message",
  "description": null,
  "human": "Success",
  "lockId": 26136614,
  "ts": "2026-10-27T04:00:00.000Z"
}
```

**Respon Gagal (Contoh Gateway Down / Not Connected):**
```json
{
  "ok": false,
  "errcode": -2012,
  "errmsg": "Lock not connected to any Gateway",
  "description": null,
  "human": "Lock not connected to any Gateway",
  "lockId": 26136614,
  "ts": "2026-10-27T04:00:00.000Z"
}
```

---

## 3. Endpoint Gateway & Topologi

### `GET /api/gateways`
Mengambil daftar seluruh gateway yang terdaftar pada akun TTLOCK.

**Respon Contoh:**
```json
{
  "list": [
    {
      "gatewayId": 1902010,
      "gatewayName": "DEV SHARECAR",
      "gatewayMac": "34:34:30:BB:99:39",
      "networkName": "SHARECAR",
      "isOnline": 1,
      "lockNum": 2,
      "gatewayVersion": 2
    }
  ]
}
```

---

### `GET /api/gateways/:gatewayId/topology`
Mengambil data topologi satu gateway beserta daftar lockbox dalam jangkauannya dan nilai sinyal RSSI masing-masing.

> **Catatan Cache:** Hasil query endpoint ini dicache selama **30 detik** di backend untuk mencegah pembatasan kuota (*rate limiting*) API TTLOCK.

**Respon Contoh:**
```json
{
  "gateway": {
    "gatewayId": 1902010,
    "gatewayName": "DEV SHARECAR",
    "networkName": "SHARECAR",
    "isOnline": 1
  },
  "locks": [
    {
      "lockId": 26136614,
      "lockName": "K3BLE_b27fff",
      "lockAlias": "Dev Lockbox",
      "rssi": -82,
      "updateDate": 1793071899000
    }
  ]
}
```
