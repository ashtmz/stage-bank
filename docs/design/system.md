# Design specification

Reference: concept.png, generated with built-in Image Gen for this project.

- Three columns: category rail, searchable editorial term list, white detail surface.
- Background #f7f7f2; detail #ffffff; text #292e29; sage #687966; border #dedfd7.
- Native Japanese sans for interface and body, Japanese serif for term headwords.
- No brand/title or promotional copy. No decorative imagery, gradients, saturated colors, card grid.
- Header: ライブラリ / current view; 追加. Sidebar: すべての用語, 保存した用語; six field categories; データ.
- Search: 用語・英語・略語で検索. Region tabs: すべて, 日本, 米国, 英国, 欧州 (Europe added to fulfill original user scope).
- Category-dependent subgroup selector is required for clear classification. Real record counts replace concept mock counts.
- Term list: selected sage row, Japanese headword, English subline, field label, bookmark.
- Detail: category/subgroup, headword, reading, English, aliases, definition, optional audience-view stage diagram; region comparison, usage, related terms, sources.
- Diagram: audience at bottom; 上手 is audience-right and stage-left; 下手 is audience-left and stage-right.
- Responsive: category rail becomes a drawer; term detail is a focused mobile pane with back action. No horizontal overflow.
- Reusable controls: icon buttons, text buttons, native selects, simple form fields; visible focus states and keyboard use.
- Dialogs needed for custom terms and backup/restore use the same quiet paper surface and sage button family.
- User notes, bookmarks and custom terms are local browser data, with versioned JSON backup/restore.
