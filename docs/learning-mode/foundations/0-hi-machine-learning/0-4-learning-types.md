# 0.4: Jenis-Jenis Machine Learning

Status: Draft  
Path: Machine Learning Foundations  
Module: 0. Hi, Machine Learning!

## Goal

Memberi peta awal tentang supervised learning, unsupervised learning, dan reinforcement learning, lalu menghubungkannya dengan regression, classification, dan clustering.

## Material

Machine learning punya beberapa jenis utama. Setiap jenis berbeda dari sisi data yang tersedia dan tujuan belajarnya.

Supervised learning memakai contoh yang sudah memiliki jawaban. Model belajar hubungan antara input dan output. Jika output berupa angka, task-nya disebut regression. Jika output berupa kategori, task-nya disebut classification.

Unsupervised learning memakai data tanpa jawaban target. Tujuannya mencari struktur atau pola tersembunyi. Contoh yang umum adalah clustering, yaitu mengelompokkan contoh yang mirip.

Reinforcement learning melatih agen untuk memilih tindakan berdasarkan reward. Agen mencoba tindakan, menerima feedback, lalu belajar strategi yang memberi hasil lebih baik.

Semi-supervised learning juga ada, yaitu gabungan data berlabel dan tidak berlabel. Untuk foundation awal, cukup pahami dulu supervised, unsupervised, dan reinforcement.

Peta singkat:

- Regression: supervised learning untuk memprediksi angka.
- Classification: supervised learning untuk memprediksi kategori.
- Clustering: unsupervised learning untuk menemukan kelompok tanpa label jawaban.

## Exercise

Type: multiple-choice

Prompt: Pasangan mana yang benar?

Options:

- A. Regression memprediksi nilai numerik.
- B. Classification memprediksi kategori.
- C. Clustering mengelompokkan data tanpa label jawaban.
- D. Reinforcement learning belajar dari reward atas tindakan.
- E. Unsupervised learning selalu membutuhkan target yang sudah benar.

Answer Key:

- Correct: A, B, C, D

## Feedback

Regression dan classification termasuk supervised learning. Clustering termasuk unsupervised learning. Reinforcement learning belajar dari tindakan dan reward.

## Hints

1. Angka mengarah ke regression.
2. Kategori mengarah ke classification.
3. Kelompok tanpa label mengarah ke clustering.
4. Tindakan dan reward mengarah ke reinforcement learning.

## Implementation Notes

Primary exercise can use a multi-select evaluator with exact-set scoring.
