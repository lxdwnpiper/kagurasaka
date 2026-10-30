# CLAUDE.md

Instruksi untuk agen di repo ini ada di **[AGENTS.md](./AGENTS.md)** — baca berkas itu, jangan
menulis instruksi di sini.

Ringkas untuk yang hanya membaca berkas ini: artikel baru = satu berkas markdown di
`src/content/research/<slug>.md` dengan frontmatter sesuai skema di `src/content.config.ts`, lalu
`npm run check && npm run build`, commit, dan `git push origin main`. Push memicu deploy GitHub Pages
ke https://lxdwnpiper.github.io/kagurasaka/ — jangan klaim terbit sebelum URL itu merespons 200.
