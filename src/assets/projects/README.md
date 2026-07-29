# Екранни снимки на проектите

Сложи тук по един файл на проект, кръстен на домейна без разширението:

| Проект | Файл |
| --- | --- |
| routinly.org | `routinly.png` |
| bulgariaradio.com | `bulgariaradio.png` |
| plumeo.ink | `plumeo.png` |
| ponomer.com | `ponomer.png` |
| communitylovable.bg | `communitylovable.png` |
| pensionen-kalkulator.bg | `pensionen-kalkulator.png` |

Приемат се `.png`, `.jpg`, `.jpeg`, `.webp` и `.avif`. Картата взима файла
автоматично — няма нужда да пипаш код. Без файл картата изглежда както досега,
с инициал вместо снимка, така че може да се добавят и един по един.

Препоръчан размер: 1600×1000 (съотношение 16:10). Astro ги смалява и
преобразува в WebP при билд, така че не се тревожи за големината на файла.

Най-лесно се правят с `npm run shots` (виж `scripts/capture-screenshots.mjs`).
