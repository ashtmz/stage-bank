# 用語データ

Each JSON file exports an array of entries with these fields:
- id: unique ASCII id prefixed stage-, audio-, lighting-, video-, production-, safety-, costume-, music-, network-
- name: Japanese display name
- reading: hiragana reading (for kana sorting/search)
- english: English term; if no exact equivalent, indicate context in note
- aliases: string[] Japanese/English alternate names, abbreviations (no duplicate entries for mere synonyms)
- category: stage | audio | lighting | video | production | safety | costume | music | network
- subcategory: concise Japanese subgroup; reuse an existing content-based group when it fits. Do not split the same subject into basic/advanced or “詳細” groups. Use kind to distinguish equipment/features.
- definition: accurate original Japanese explanation, normally 40–110 chars
- usage: concise practical usage/example in Japanese
- japan: Japanese usage/context
- us: US usage/context, do not invent regional differences
- uk: UK usage/context, do not invent regional differences
- note: important ambiguity, limits/equivalence, or safety context; empty string if none
- related: string[] names of related entries (not IDs)
- europe: optional string with specific language/country usage; do not conflate Europe into one convention
- regions: array of JP / US / UK / EU describing regions where vocabulary is used. Include all supported regions for a shared technical term only when appropriate.
- sources: array of {label: string, url: string} authoritative online references actually consulted

Descriptions must be original paraphrases, never copied. Data is a terminology reference, not equipment operation instructions. Stage directions are from the performer's point of view for SL/SR. No claims of exhaustive coverage or universally standardized equivalence. Avoid normative safety thresholds or procedures. Region statements can explicitly say shared usage. Use concise Japanese labels without emoji.

## Extended content (optional, render only when present)
- kind: term | technology | equipment | feature (default term)
- detail: original detailed Japanese explanation (150–350 chars recommended), functional context rather than marketing
- examples: string[] additional concrete stage/live use cases
- pitfalls: string[] distinctions, constraints, incompatible assumptions; no hazardous step-by-step procedures
- specs: array of {label, value} for source-supported equipment/feature characteristics; never invent values
- manufacturer: official manufacturer name, equipment/feature only
- version: exact version if source-verified; never imply latest without evidence
- announcedAt: YYYY-MM-DD only when an official announcement supplies a precise date
- verifiedAt: YYYY-MM-DD of actual source verification, not a release date

Wider stage scope includes costume (衣裳・メイク), music (楽器・音楽), network (電源・通信).
New entries must include original detailed explanation and at least one practical example or distinction. Existing fields remain required. Sources must be actually consulted primary sources. Shared terminology is not evidence of regional differences. Do not describe a legacy product as a current release. Distinguish an announced feature from one available in a published release. Main stages/audio/lighting/video/production/safety remain original categories. Add data files containing arrays only under src/data; no metadata objects there.
