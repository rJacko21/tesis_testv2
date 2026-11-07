# Modelo entidad-relación

> Generado por `pnpm db:er` a partir de `src/db/schema`. No se edita a mano.

43 tablas en 5 dominios. Cada diagrama muestra las tablas de su dominio y sus claves ajenas, también las que apuntan a tablas de otros dominios (por ejemplo, `users`). Convenciones: ver [04-arquitectura §4](../plan/04-arquitectura.md).

## Identidad

```mermaid
erDiagram
  users {
    bigint id PK
    varchar username
    varchar display_username
    varchar name
    varchar email
    boolean email_verified
    varchar image
    varchar locale FK
    enum status
    int ap_balance
    datetime created_at
    datetime updated_at
  }
  accounts {
    bigint id PK
    varchar account_id
    varchar provider_id
    bigint user_id FK
    text access_token
    text refresh_token
    text id_token
    datetime access_token_expires_at
    datetime refresh_token_expires_at
    varchar scope
    varchar password
    datetime created_at
    datetime updated_at
  }
  sessions {
    bigint id PK
    varchar token
    bigint user_id FK
    datetime expires_at
    varchar ip_address
    varchar user_agent
    datetime created_at
    datetime updated_at
  }
  verifications {
    bigint id PK
    varchar identifier
    text value
    datetime expires_at
    datetime created_at
    datetime updated_at
  }
  login_attempts {
    bigint id PK
    varchar identifier
    varchar ip
    smallint succeeded
    datetime attempted_at
  }
  rate_limits {
    varchar rate_key PK
    int count
    datetime window_start
  }
  roles {
    bigint id PK
    varchar code
  }
  user_roles {
    bigint user_id PK,FK
    bigint role_id PK,FK
  }
  locales ||--o{ users : "locale"
  users ||--o{ accounts : "user_id"
  users ||--o{ sessions : "user_id"
  users ||--o{ user_roles : "user_id"
  roles ||--o{ user_roles : "role_id"
```

## Contenido

```mermaid
erDiagram
  locales {
    varchar code PK
    varchar name
    smallint sort_order
    boolean is_default
  }
  media {
    bigint id PK
    varchar path
    smallint width
    smallint height
    datetime created_at
    datetime updated_at
  }
  media_translations {
    bigint media_id PK,FK
    varchar locale PK,FK
    varchar alt
  }
  posts {
    bigint id PK
    varchar slug
    enum category
    enum status
    datetime published_at
    datetime expires_at
    bigint author_id FK
    bigint cover_image_id FK
    datetime created_at
    datetime updated_at
  }
  post_translations {
    bigint post_id PK,FK
    varchar locale PK,FK
    varchar title
    varchar excerpt
    text body
    varchar seo_title
    varchar seo_description
  }
  promotions {
    bigint id PK
    bigint image_id FK
    varchar target_url
    datetime starts_at
    datetime ends_at
    smallint sort_order
    datetime created_at
    datetime updated_at
  }
  promotion_translations {
    bigint promotion_id PK,FK
    varchar locale PK,FK
    varchar title
  }
  pages {
    bigint id PK
    varchar slug
    int version
    datetime created_at
    datetime updated_at
  }
  page_translations {
    bigint page_id PK,FK
    varchar locale PK,FK
    varchar title
    text body
  }
  media ||--o{ media_translations : "media_id"
  locales ||--o{ media_translations : "locale"
  users |o--o{ posts : "author_id"
  media |o--o{ posts : "cover_image_id"
  posts ||--o{ post_translations : "post_id"
  locales ||--o{ post_translations : "locale"
  media ||--o{ promotions : "image_id"
  promotions ||--o{ promotion_translations : "promotion_id"
  locales ||--o{ promotion_translations : "locale"
  pages ||--o{ page_translations : "page_id"
  locales ||--o{ page_translations : "locale"
```

## Juego

```mermaid
erDiagram
  character_classes {
    bigint id PK
    varchar code
    varchar name
    bigint parent_id FK
    tinyint required_level
    smallint sort_order
  }
  character_class_translations {
    bigint class_id PK,FK
    varchar locale PK,FK
    varchar role
    varchar description
  }
  servers {
    bigint id PK
    varchar name
    tinyint is_active
  }
  guilds {
    bigint id PK
    bigint server_id FK
    varchar name
  }
  characters {
    bigint id PK
    bigint user_id FK
    bigint server_id FK
    bigint guild_id FK
    bigint class_id FK
    varchar name
    tinyint land_level
    tinyint sea_level
    int experience
    datetime created_at
    datetime updated_at
  }
  ranking_snapshots {
    datetime taken_at PK
    enum area PK
    bigint class_scope PK
    int rank PK
    bigint character_id FK
    int previous_rank
    int score
  }
  character_classes |o--o{ character_classes : "parent_id"
  character_classes ||--o{ character_class_translations : "class_id"
  locales ||--o{ character_class_translations : "locale"
  servers ||--o{ guilds : "server_id"
  users |o--o{ characters : "user_id"
  servers ||--o{ characters : "server_id"
  guilds |o--o{ characters : "guild_id"
  character_classes ||--o{ characters : "class_id"
  characters ||--o{ ranking_snapshots : "character_id"
```

## Tienda y AP

```mermaid
erDiagram
  shop_categories {
    bigint id PK
    bigint parent_id FK
    varchar slug
    smallint sort_order
  }
  shop_category_translations {
    bigint category_id PK,FK
    varchar locale PK,FK
    varchar name
  }
  campaigns {
    bigint id PK
    varchar code
    datetime starts_at
    datetime ends_at
  }
  campaign_translations {
    bigint campaign_id PK,FK
    varchar locale PK,FK
    varchar name
  }
  shop_items {
    bigint id PK
    bigint category_id FK
    varchar sku
    bigint image_id FK
    smallint validity_days
    tinyint is_bundle
    tinyint is_limited
    tinyint is_giftable
    tinyint is_active
    smallint sort_order
    datetime created_at
    datetime updated_at
  }
  shop_item_translations {
    bigint item_id PK,FK
    varchar locale PK,FK
    varchar name
    text description
  }
  item_prices {
    bigint id PK
    bigint item_id FK
    int price_ap
    int sale_price_ap
    bigint campaign_id FK
    datetime starts_at
    datetime ends_at
  }
  carts {
    bigint id PK
    bigint user_id FK
    datetime created_at
    datetime updated_at
  }
  cart_items {
    bigint cart_id PK,FK
    bigint item_id PK,FK
    smallint quantity
    datetime created_at
  }
  orders {
    bigint id PK
    bigint user_id FK
    int total_ap
    enum status
    datetime created_at
    datetime updated_at
  }
  order_items {
    bigint id PK
    bigint order_id FK
    bigint item_id FK
    smallint quantity
    int unit_price_ap
    bigint server_id FK
    bigint character_id FK
  }
  ap_ledger {
    bigint id PK
    bigint user_id FK
    int delta
    enum reason
    bigint reference_id
    int balance_after
    datetime created_at
  }
  topup_packages {
    bigint id PK
    int ap_amount
    int price_cents
    char currency
    tinyint is_active
  }
  payments {
    bigint id PK
    bigint user_id FK
    bigint package_id FK
    enum provider
    varchar provider_payment_id
    enum status
    int amount_cents
    char currency
    datetime created_at
    datetime updated_at
  }
  shop_categories |o--o{ shop_categories : "parent_id"
  shop_categories ||--o{ shop_category_translations : "category_id"
  locales ||--o{ shop_category_translations : "locale"
  campaigns ||--o{ campaign_translations : "campaign_id"
  locales ||--o{ campaign_translations : "locale"
  shop_categories ||--o{ shop_items : "category_id"
  media |o--o{ shop_items : "image_id"
  shop_items ||--o{ shop_item_translations : "item_id"
  locales ||--o{ shop_item_translations : "locale"
  shop_items ||--o{ item_prices : "item_id"
  campaigns |o--o{ item_prices : "campaign_id"
  users ||--o{ carts : "user_id"
  carts ||--o{ cart_items : "cart_id"
  shop_items ||--o{ cart_items : "item_id"
  users ||--o{ orders : "user_id"
  orders ||--o{ order_items : "order_id"
  shop_items ||--o{ order_items : "item_id"
  servers ||--o{ order_items : "server_id"
  characters ||--o{ order_items : "character_id"
  users ||--o{ ap_ledger : "user_id"
  users ||--o{ payments : "user_id"
  topup_packages ||--o{ payments : "package_id"
```

## Soporte y administración

```mermaid
erDiagram
  redeem_codes {
    bigint id PK
    varchar code
    enum reward_type
    int reward_ap
    bigint reward_item_id FK
    int max_uses
    smallint per_account
    datetime starts_at
    datetime ends_at
    datetime created_at
    datetime updated_at
  }
  redeem_uses {
    bigint id PK
    bigint code_id FK
    bigint user_id FK
    bigint character_id FK
    datetime used_at
  }
  support_tickets {
    bigint id PK
    bigint user_id FK
    enum category
    varchar subject
    enum status
    datetime created_at
    datetime updated_at
  }
  ticket_messages {
    bigint id PK
    bigint ticket_id FK
    bigint author_id FK
    text body
    datetime created_at
  }
  consents {
    bigint id PK
    bigint user_id FK
    char anon_id
    json categories
    int version
    datetime given_at
  }
  audit_log {
    bigint id PK
    bigint actor_id FK
    varchar action
    varchar entity
    bigint entity_id
    json diff
    varchar ip
    datetime created_at
  }
  shop_items |o--o{ redeem_codes : "reward_item_id"
  redeem_codes ||--o{ redeem_uses : "code_id"
  users ||--o{ redeem_uses : "user_id"
  characters |o--o{ redeem_uses : "character_id"
  users ||--o{ support_tickets : "user_id"
  support_tickets ||--o{ ticket_messages : "ticket_id"
  users ||--o{ ticket_messages : "author_id"
  users |o--o{ consents : "user_id"
  users |o--o{ audit_log : "actor_id"
```
