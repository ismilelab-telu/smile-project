# 0.3: Komponen Utama dalam Machine Learning

Status: Draft  
Path: Machine Learning Foundations  
Module: 0. Hi, Machine Learning!

## Goal

Mengenalkan komponen dasar yang selalu muncul dalam proyek machine learning: masalah, data, model, training, prediction, dan evaluation.

## Material

Machine learning bukan hanya memilih algoritma. Sebuah sistem ML biasanya punya beberapa komponen utama.

Masalah adalah tujuan yang ingin dibantu oleh model. Contohnya memprediksi permintaan, mengelompokkan pelanggan, atau mendeteksi transaksi berisiko.

Data adalah contoh yang dipakai untuk belajar. Data bisa berupa tabel, teks, gambar, audio, log aktivitas, atau bentuk lain. Pada data tabular, informasi sering muncul sebagai kolom.

Model adalah fungsi atau sistem matematis yang belajar pola dari data. Model menerima input dan menghasilkan output, seperti prediksi angka, kategori, skor, atau kelompok.

Training adalah proses ketika model belajar dari data. Dalam proses ini, model menyesuaikan nilai internalnya agar output yang dihasilkan makin sesuai dengan tujuan.

Prediction atau inference adalah proses memakai model yang sudah dilatih untuk contoh baru.

Evaluation adalah proses mengecek apakah model benar-benar membantu. Evaluasi perlu data atau situasi yang tidak hanya mengulang contoh training.

Untuk foundation, cukup ingat alur besar:

masalah -> data -> model -> training -> prediction -> evaluation

Topik seperti feature engineering, hyperparameter tuning, dan deployment penting, tetapi akan dibahas setelah learner paham alur dasar.

## Exercise

Type: multiple-choice

Prompt: Mana saja yang termasuk komponen dasar dalam machine learning?

Options:

- A. Masalah atau task yang ingin diselesaikan.
- B. Data sebagai contoh untuk belajar.
- C. Model yang belajar pola dari data.
- D. Training untuk menyesuaikan model.
- E. Evaluation untuk menilai manfaat model.
- F. Menebak hasil tanpa data karena model selalu tahu jawabannya.

Answer Key:

- Correct: A, B, C, D, E

## Feedback

Komponen dasar ML selalu terkait tujuan, data, model, proses belajar, penggunaan model, dan evaluasi. Menebak tanpa data bukan proses machine learning.

## Hints

1. Model membutuhkan tujuan dan data.
2. Training adalah proses belajar.
3. Evaluation memastikan model tidak hanya terlihat bagus di awal.

## Implementation Notes

Primary exercise can use a multi-select evaluator with exact-set scoring.
