# Disk → Firebase image migration (later)

## Firebase path (current app)

```
Koshal/cookstovecare/{type}/{id}.jpg
```

Example:
- `Koshal/cookstovecare/received_product/task90_1710000000_ab12cd34.jpg`

Use exact casing: **Koshal** (capital K).

Types: `received_product`, `distribution`, `after_repair`, `old_cookstove`, `new_cookstove`, `signature`, `profile`  
(No `before_repair` — technician only uploads an after-repair photo.)

## Migrating old server disk files later

Copy into:
```
Koshal/cookstovecare/{type}/{id}.{ext}
```

Then update DB URL columns to Firebase download URLs.

## Rules

Publish `storage.rules` in Firebase Console → Storage → Rules.
