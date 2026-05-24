# 0.5: Machine Learning Use Cases

Status: Draft  
Path: Machine Learning Foundations  
Module: 0. Hi, Machine Learning!

## Goal

Membantu learner mengenali kapan machine learning masuk akal dipakai dan kapan aturan sederhana lebih cukup.

## Material

Machine learning kuat ketika masalah memiliki pola yang bisa dipelajari dari contoh.

Use case yang cocok biasanya punya:

- Riwayat data atau contoh yang cukup.
- Tujuan yang dapat diperiksa hasilnya.
- Pola yang sulit ditulis sebagai aturan manual lengkap.
- Kebutuhan memprediksi, mengelompokkan, memberi rekomendasi, mendeteksi risiko, atau memprioritaskan sesuatu.

Contoh use case:

- Memprediksi permintaan minuman untuk shift berikutnya.
- Mengelompokkan pelanggan berdasarkan perilaku belanja.
- Mendeteksi transaksi yang berisiko.
- Merekomendasikan produk berdasarkan riwayat interaksi.
- Mengklasifikasikan email sebagai spam atau bukan spam.

Tidak semua masalah perlu machine learning. Jika masalah bisa diselesaikan dengan aturan sederhana yang stabil, ML bisa menjadi berlebihan.

Contoh yang belum tentu perlu ML:

- Menghitung pajak dengan formula tetap.
- Mengirim notifikasi setiap pukul 08.00.
- Memberi diskon 10 persen untuk semua pelanggan.

Pertanyaan awal yang penting:

Apakah ada pola dari data masa lalu yang bisa membantu keputusan untuk contoh baru?

## Exercise

Type: multiple-choice

Prompt: Use case mana yang paling masuk akal untuk machine learning?

Options:

- A. Memprediksi jumlah pesanan besok dari riwayat penjualan, cuaca, dan promosi.
- B. Mengelompokkan pelanggan berdasarkan pola pembelian.
- C. Menghitung total belanja dengan rumus harga dikali jumlah.
- D. Mendeteksi transaksi berisiko dari pola transaksi sebelumnya.
- E. Menyalakan alarm pada jam yang selalu sama setiap hari.

Answer Key:

- Correct: A, B, D

## Feedback

Use case ML biasanya memanfaatkan pola dari data masa lalu untuk memprediksi, mengelompokkan, atau mendeteksi sesuatu. Formula tetap dan jadwal tetap biasanya tidak membutuhkan ML.

## Hints

1. Cari masalah yang membutuhkan pola dari data.
2. Aturan sederhana tidak selalu perlu ML.
3. Prediksi dan deteksi risiko sering cocok untuk ML jika datanya tersedia.

## Implementation Notes

Primary exercise can use a multi-select evaluator with exact-set scoring.
