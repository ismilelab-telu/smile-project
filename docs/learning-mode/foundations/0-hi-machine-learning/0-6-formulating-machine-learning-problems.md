# 0.6: Merumuskan Masalah dalam Machine Learning

Status: Draft  
Path: Machine Learning Foundations  
Module: 0. Hi, Machine Learning!

## Goal

Melatih learner mengubah kebutuhan nyata menjadi problem statement ML yang jelas, termasuk target, fitur, waktu prediksi, dan jenis task.

## Material

Proyek machine learning yang baik dimulai dari masalah yang jelas.

Langkah awal:

1. Tentukan tujuan nyata.
2. Ubah tujuan itu menjadi pertanyaan prediksi atau pertanyaan pola.
3. Tentukan output yang ingin dihasilkan model.
4. Tentukan informasi apa yang tersedia sebelum model membuat output.
5. Tentukan jenis task: regression, classification, clustering, atau jenis lain.
6. Tentukan cara mengevaluasi apakah hasil model berguna.

Dalam supervised learning, dua istilah penting adalah target dan fitur.

Target adalah nilai atau kategori yang ingin diprediksi. Contoh target: jumlah penjualan besok, apakah pelanggan churn, atau kategori risiko transaksi.

Fitur adalah informasi yang dipakai model sebagai input. Fitur harus tersedia saat prediksi dibuat. Jika sebuah informasi baru diketahui setelah kejadian selesai, informasi itu tidak aman dipakai sebagai fitur untuk prediksi sebelumnya.

Contoh:

Tujuan bisnis: cafe ingin menyiapkan stok lebih baik sebelum shift dimulai.

Problem statement ML: memprediksi jumlah minuman yang akan terjual pada shift berikutnya.

Target: jumlah minuman terjual.

Fitur yang masuk akal: hari, jam shift, cuaca yang diprediksi, promo aktif, dan riwayat permintaan sebelumnya.

Jenis task: regression, karena target berupa angka.

Problem statement yang jelas membantu tim menghindari model yang salah sasaran.

## Exercise 1

Type: multiple-choice

Prompt: Sebuah cafe ingin memperkirakan jumlah minuman yang perlu disiapkan sebelum shift dimulai. Pilihan mana yang tepat untuk merumuskan masalah ML-nya?

Options:

- A. Target yang masuk akal adalah jumlah minuman yang terjual pada shift tersebut.
- B. Jenis task yang masuk akal adalah regression karena output berupa angka.
- C. Fitur yang aman bisa mencakup hari, jam shift, cuaca yang diprediksi, dan promo yang sudah diketahui sebelum shift.
- D. Fitur terbaik adalah jumlah minuman aktual yang baru diketahui setelah shift selesai.
- E. Problem statement yang jelas: memprediksi jumlah minuman terjual sebelum shift dimulai.

Answer Key:

- Correct: A, B, C, E

## Exercise 2

Type: table-column-role-assignment

Prompt: Pilih target dan fitur dari tabel shift cafe.

Context: Cafe ingin memprediksi jumlah minuman yang akan terjual sebelum shift dimulai.

Columns:

| Column | Meaning | Example |
|---|---|---|
| `shift_id` | ID unik untuk tiap shift | `SHIFT-1042` |
| `day_part` | Waktu shift | `morning`, `afternoon`, `evening` |
| `weather_forecast` | Perkiraan cuaca sebelum shift | `sunny`, `rainy` |
| `promo_active` | Apakah promo sudah dijadwalkan sebelum shift | `true`, `false` |
| `staff_count` | Jumlah staf yang dijadwalkan | `4` |
| `drinks_sold` | Jumlah minuman yang benar-benar terjual setelah shift selesai | `186` |
| `end_shift_revenue` | Pendapatan akhir setelah shift selesai | `3720000` |

Roles:

- Target.
- Feature.
- Metadata.
- Ignore / not used yet.

Answer Key:

| Column | Expected Role | Reason |
|---|---|---|
| `shift_id` | Metadata | ID membantu melacak baris, tetapi bukan sinyal utama untuk memprediksi permintaan. |
| `day_part` | Feature | Diketahui sebelum shift dan bisa memengaruhi permintaan. |
| `weather_forecast` | Feature | Diketahui sebelum shift dan bisa memengaruhi permintaan. |
| `promo_active` | Feature | Diketahui sebelum shift dan bisa memengaruhi permintaan. |
| `staff_count` | Feature | Diketahui sebelum shift dan bisa memberi konteks kapasitas operasional. |
| `drinks_sold` | Target | Ini nilai yang ingin diprediksi. |
| `end_shift_revenue` | Ignore / not used yet | Baru diketahui setelah shift selesai dan berisiko membocorkan jawaban. |

## Feedback

Exercise 1 menilai apakah learner bisa merumuskan task ML dari kebutuhan nyata. Problem statement harus menyebut output yang jelas, waktu prediksi, dan jenis task yang masuk akal.

Exercise 2 menilai apakah learner bisa membedakan target, fitur, metadata, dan informasi yang tidak aman dipakai. Target adalah nilai yang ingin diprediksi. Fitur harus tersedia sebelum prediksi dibuat. Informasi setelah shift selesai adalah jawaban atau turunan dari jawaban, bukan fitur aman.

## Hints

1. Target adalah output yang ingin diprediksi.
2. Fitur harus tersedia sebelum waktu prediksi.
3. Angka mengarah ke regression.
4. ID biasanya metadata.
5. Informasi yang baru diketahui setelah kejadian selesai tidak aman dipakai sebagai fitur.

## Implementation Notes

Exercise 1 can use a multi-select evaluator with exact-set scoring.

Exercise 2 can reuse the previous column role assignment interaction from `lesson-0-1-feature-target`, but it should appear here as the second exercise in the problem-formulation lesson.
