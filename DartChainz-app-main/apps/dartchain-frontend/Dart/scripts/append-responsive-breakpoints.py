#!/usr/bin/env python3
"""Append 5-tier responsive blocks (250–500px) to component CSS files."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src/app"

BLOCKS: dict[str, str] = {
    "navbar/navbar.css": '''
/* === Responsive 250–500px (navbar) === */
@media (max-width: 500px) {
  .navbar { gap: clamp(2px, 1vw, 4px); }
  .navbar-center app-explorer-search { min-width: 0; max-width: min(100%, 9.5rem); flex: 1 1 auto; }
  .icon-btn, .navbar-auth-btn { min-width: max(28px, 32px); min-height: max(28px, 32px); }
}
@media (max-width: 449px) {
  .navbar { --navbar-logo-size: 26px; --navbar-row-h: 26px; --navbar-bar-h: var(--navbar-logo-size); }
  .brand-title { font-size: clamp(0.5rem, 2.6vw, 0.625rem); }
  .navbar-center app-explorer-search { max-width: min(100%, 8.5rem); }
  .navbar-brand-lockup { --navbar-logo-slot-w: 16px; }
  .icon-btn { width: 26px; height: 26px; min-width: 38px; min-height: 38px; }
}
@media (max-width: 399px) {
  .navbar { --navbar-logo-size: 24px; --navbar-row-h: 24px; gap: 2px; }
  .navbar-center app-explorer-search { max-width: min(100%, 7.25rem); }
  .navbar-right { gap: 2px; }
}
@media (max-width: 349px) {
  .navbar-leading { gap: 3px; }
  .navbar-center { min-width: 0; flex: 1 1 0; }
  .navbar-center app-explorer-search { max-width: 100%; }
}
@media (max-width: 299px) {
  .navbar { --navbar-logo-size: 22px; --navbar-row-h: 22px; padding-inline-end: 1px; }
  .brand-title { font-size: 0.5rem; max-width: 2.25rem; overflow: hidden; text-overflow: ellipsis; }
  .icon-btn { width: 24px; height: 24px; min-width: 36px; min-height: 36px; border-radius: 6px; }
}
''',
    "navbar/explorer-search.css": '''
/* === Responsive 250–500px (explorer-search) === */
@media (max-width: 500px) {
  :host { min-width: 0; max-width: 100%; }
  .explorer-search__input { font-size: clamp(0.5rem, 2.4vw, 0.6875rem); min-height: 28px; }
}
@media (max-width: 449px) {
  .explorer-search__input { padding-inline: 6px; }
}
@media (max-width: 399px) {
  .explorer-search__input::placeholder { font-size: clamp(0.4375rem, 2.2vw, 0.5625rem); }
}
@media (max-width: 349px) {
  .explorer-search { min-width: 0; }
}
@media (max-width: 299px) {
  .explorer-search__input { min-height: 32px; font-size: 0.5625rem; }
}
''',
    "navbar/navbar-network-status.css": '''
/* === Responsive 250–500px (navbar-network-status) === */
@media (max-width: 500px) {
  .navbar-network-latency { font-size: var(--nv-font-micro, 0.625rem); }
  .navbar-network-refresh { min-width: 32px; min-height: 32px; }
}
@media (max-width: 399px) {
  .navbar-network-metrics { gap: 2px; }
}
@media (max-width: 299px) {
  .navbar-network-latency { max-width: 2.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}
''',
    "navbar/navbar-peer-status.css": '''
/* === Responsive 250–500px (navbar-peer-status) === */
@media (max-width: 500px) {
  .navbar-peer-count { font-size: var(--nv-font-micro, 0.625rem); }
  .navbar-peer-refresh { min-width: 32px; min-height: 32px; }
}
@media (max-width: 399px) {
  .navbar-peer-metrics { gap: 2px; }
}
@media (max-width: 299px) {
  .navbar-peer-count { max-width: 2rem; overflow: hidden; text-overflow: ellipsis; }
}
''',
    "navbar/brand-crypto-select.css": '''
/* === Responsive 250–500px (brand-crypto-select) === */
@media (max-width: 500px) {
  .brand-title { font-size: clamp(0.5rem, 2.6vw, 0.6875rem); }
}
@media (max-width: 399px) {
  .brand-crypto-trigger { min-height: 24px; padding-inline: 4px; }
}
@media (max-width: 299px) {
  .brand-title { max-width: 2.5rem; overflow: hidden; text-overflow: ellipsis; }
}
''',
    "features/bandeau-accueil/bandeau-accueil.css": '''
/* === Responsive 250–500px (bandeau-accueil) === */
@media (max-width: 500px) {
  .bandeau-accueil__content span { font-size: var(--nv-font-caption, 0.6875rem); }
}
@media (max-width: 399px) {
  .bandeau-accueil__content { gap: 0.4rem; padding-right: 1rem; }
}
@media (max-width: 299px) {
  .bandeau-accueil__content { gap: 0.35rem; padding-right: 0.75rem; }
  .bandeau-accueil__content span { font-size: var(--nv-font-micro, 0.5625rem); }
}
''',
    "features/exchange-panel/exchange-panel.css": '''
/* === Responsive 250–500px (exchange-panel) === */
@media (max-width: 500px) {
  :host { --swap-font: var(--nv-font-body, 0.75rem); --swap-font-sm: var(--nv-font-caption, 0.6875rem); --swap-row-h: clamp(28px, 8vw, 34px); }
  .exchange-panel__from-row { grid-template-columns: minmax(0, 0.38fr) minmax(0, 1fr); }
  .exchange-panel__cta.cta { min-height: var(--nv-touch-min, 40px); }
}
@media (max-width: 449px) {
  .exchange-panel__from-row { grid-template-columns: minmax(2.5rem, 34%) minmax(0, 1fr); }
}
@media (max-width: 399px) {
  .exchange-panel__hint--to { max-width: 65%; }
  .exchange-panel__amount-input { min-height: clamp(26px, 7.5vw, 32px); font-size: var(--nv-font-body, 0.6875rem); }
  .exchange-panel__label-row { gap: 2px; }
}
@media (max-width: 349px) {
  .exchange-panel__hint { font-size: var(--nv-font-micro, 0.5625rem); }
}
@media (max-width: 299px) {
  .exchange-panel__label-row { flex-wrap: wrap; gap: 1px; }
  .exchange-panel__from-row { grid-template-columns: minmax(0, 0.36fr) minmax(0, 1fr); }
}
''',
    "features/rate-panel/rate-panel.css": '''
/* === Responsive 250–500px (rate-panel) === */
@media (max-width: 500px) {
  .rate-panels-shell { padding: 2px; gap: 1px; }
  .rate-card__symbol { font-size: clamp(0.5rem, 2.6vw, 0.625rem); }
  .rate-card__price { font-size: clamp(0.4375rem, 2.2vw, 0.5625rem); }
}
@media (max-width: 399px) {
  .rate-card { padding: 1px 2px; }
}
@media (max-width: 299px) {
  .rate-card__change { font-size: clamp(0.375rem, 2.2vw, 0.5rem); }
}
''',
    "features/faucet/faucet.css": '''
/* === Responsive 250–500px (faucet) — remplace paliers 560/380/280 === */
@media (max-width: 500px) {
  .faucet-inline { min-height: 15px; padding: 0 4px; }
  .faucet-inline__value-box { max-width: min(42vw, 110px); min-width: 0; }
  .faucet-inline__value { font-size: clamp(0.5rem, 2.4vw, 0.625rem); line-height: 1.2; overflow: hidden; text-overflow: ellipsis; }
  .faucet-inline__claim { min-width: max(36px, 34px); min-height: 28px; font-size: clamp(0.4375rem, 2vw, 0.5625rem); }
}
@media (max-width: 449px) {
  .faucet-inline__brand { font-size: clamp(0.375rem, 1.8vw, 0.5rem); }
}
@media (max-width: 399px) {
  .faucet-inline__core { gap: 2px; }
  .faucet-inline__value-box { max-width: min(50vw, 96px); }
}
@media (max-width: 349px) {
  .faucet-inline__logo-shell, .faucet-inline__logo-frame { width: 16px; height: 16px; min-width: 16px; }
}
@media (max-width: 299px) {
  .faucet-inline { padding-inline: 2px; }
  .faucet-inline__brand { display: none; }
  .faucet-inline__value-box { max-width: min(58vw, 88px); }
  .faucet-inline__value { font-size: clamp(0.5rem, 2.8vw, 0.625rem); font-weight: 800; }
  .faucet-inline__claim { width: auto; min-width: 32px; padding-inline: 3px; }
}
''',
    "features/showcase-tabs/showcase-tabs.css": '''
/* === Responsive 250–500px (showcase-tabs) === */
@media (max-width: 500px) {
  .showcase-tab__label { font-size: clamp(0.4375rem, 2.4vw, 0.5625rem); }
}
@media (max-width: 349px) {
  .showcase-tab__label { font-size: clamp(0.4375rem, 2.8vw, 0.5625rem); letter-spacing: 0.02em; }
}
@media (max-width: 299px) {
  .showcase-tab { touch-action: manipulation; }
}
''',
    "features/showcase-window/showcase-window.css": '''
/* === Responsive 250–500px (showcase-window) === */
@media (max-width: 500px) {
  .showcase-window__title { font-size: clamp(0.5rem, 2.4vw, 0.625rem); }
}
@media (max-width: 399px) {
  :host { min-width: 0; }
}
''',
    "features/showcase-news/showcase-news.css": '''
/* === Responsive 250–500px (showcase-news) === */
@media (max-width: 500px) {
  .showcase-news__filter.cta--sm, .showcase-news__refresh.cta--sm {
    min-height: max(28px, 32px); font-size: var(--nv-font-micro, 0.625rem);
  }
  .showcase-news__title { font-size: clamp(0.4375rem, 2.2vw, 0.5625rem); }
}
@media (max-width: 449px) {
  .showcase-news__filter.cta--sm { padding-inline: 4px; }
}
@media (max-width: 399px) {
  .showcase-news__filters { mask-image: linear-gradient(90deg, #000 85%, transparent); }
}
@media (max-width: 349px) {
  .showcase-news__toolbar { gap: 1px; }
  .showcase-news__filter.cta--sm { padding-inline: 3px; min-height: 26px; }
}
@media (max-width: 299px) {
  .showcase-news__title { font-size: var(--nv-font-micro, 0.5625rem); max-width: 1.75rem; overflow: hidden; text-overflow: ellipsis; }
  .showcase-news__accent { height: 8px; }
}
''',
    "features/dock-tabs/dock-tabs.css": '''
/* === Responsive 250–500px (dock-tabs) === */
@media (max-width: 500px) {
  .dock-tab-label { font-size: clamp(0.4375rem, 2.4vw, 0.5625rem); }
}
@media (max-width: 349px) {
  .dock-tab-label { font-size: clamp(0.4375rem, 2.8vw, 0.5625rem); letter-spacing: 0.02em; }
}
@media (max-width: 299px) {
  .dock-tab { touch-action: manipulation; }
}
''',
    "features/pending-transactions/pending-transactions.css": '''
/* === Responsive 250–500px (pending-transactions) === */
@media (max-width: 500px) {
  .pending-title { font-size: var(--nv-font-caption, 0.6875rem); }
  .pending-count { font-size: var(--nv-font-micro, 0.625rem); }
  .pending-refresh--icon { min-width: 32px; min-height: 32px; }
}
@media (max-width: 399px) {
  .pending-tx { padding: 3px 4px; }
}
@media (max-width: 299px) {
  .pending-count { min-width: 24px; height: 22px; }
  .pending-refresh--icon { width: 36px; height: 36px; }
}
''',
    "features/block-composer/block-composer.css": '''
/* === Responsive 250–500px (block-composer) === */
@media (max-width: 500px) {
  .composer-title { font-size: var(--nv-font-caption, 0.6875rem); }
  .composer-counter--header { font-size: var(--nv-font-micro, 0.625rem); }
  .composer-secondary--icon { min-width: 32px; min-height: 32px; }
}
@media (max-width: 349px) {
  .composer-counter--header { min-width: 40px; }
}
@media (max-width: 299px) {
  .composer-secondary--icon { width: 36px; height: 36px; }
}
''',
    "features/blocks-list/blocks-list.css": '''
/* === Responsive 250–500px (blocks-list) === */
@media (max-width: 500px) {
  .blocks-title { font-size: var(--nv-font-caption, 0.6875rem); }
  .blocks-count { font-size: var(--nv-font-micro, 0.625rem); }
}
@media (max-width: 349px) {
  .block-item { min-height: 22px; gap: 2px; }
  .block-index, .block-hash, .block-time { font-size: clamp(0.4375rem, 2.5vw, 0.5rem); }
}
@media (max-width: 299px) {
  .blocks-count { min-width: 24px; height: 22px; }
}
''',
    "features/peer-panel/peer-panel.css": '''
/* === Responsive 250–500px (peer-panel) === */
@media (max-width: 500px) {
  .peer-title { font-size: var(--nv-font-caption, 0.6875rem); }
  .peer-stat-label, .peer-stat-value { font-size: var(--nv-font-micro, 0.625rem); }
  .peer-refresh--icon { min-width: 32px; min-height: 32px; }
}
@media (max-width: 399px) {
  .peer-input-row { gap: 2px; }
  .peer-input, .primary-button { min-height: clamp(28px, 8vw, 34px); }
}
@media (max-width: 299px) {
  .peer-header__stats { flex-wrap: wrap; gap: 2px 4px; justify-content: flex-start; }
  .peer-refresh--icon { width: 36px; height: 36px; }
}
''',
    "features/block-detail-drawer/block-detail-drawer.css": '''
/* === Responsive 250–500px (block-detail-drawer) === */
@media (max-width: 500px) {
  .drawer { width: min(calc(100vw - 12px), 100%); max-width: 100%; }
}
@media (max-width: 399px) {
  .drawer-body { padding: 8px; }
}
@media (max-width: 299px) {
  .drawer { width: calc(100vw - 8px); }
  .drawer-eyebrow { font-size: 0.625rem; }
}
''',
    "features/launch-form-drawer/launch-form-drawer.css": '''
/* === Responsive 250–500px (launch-form-drawer) === */
@media (max-width: 500px) {
  .launch-drawer__panel { width: min(calc(100vw - 12px), 100%); max-width: 100%; }
}
@media (max-width: 399px) {
  .launch-drawer__grid { gap: 8px; }
}
@media (max-width: 299px) {
  .launch-drawer__panel { width: calc(100vw - 8px); }
}
''',
    "features/showcase-news/showcase-news-drawer.css": '''
/* === Responsive 250–500px (showcase-news-drawer) === */
@media (max-width: 500px) {
  :host { width: min(calc(100vw - 12px), 100%); }
}
@media (max-width: 299px) {
  :host { width: calc(100vw - 8px); }
}
''',
    "features/status-overlay/status-overlay.css": '''
/* === Responsive 250–500px (status-overlay) === */
@media (max-width: 500px) {
  .status-shell { padding: 6px; font-size: clamp(0.5rem, 2.4vw, 0.6875rem); }
}
@media (max-width: 299px) {
  .status-refresh { min-width: 36px; min-height: 36px; }
}
''',
    "features/error-banner/error-banner.css": '''
/* === Responsive 250–500px (error-banner) === */
@media (max-width: 500px) {
  :host { font-size: clamp(0.5rem, 2.4vw, 0.6875rem); padding: 4px 6px; }
}
''',
    "three-floor/three-floor.css": '''
/* === Responsive 250–500px (three-floor) === */
@media (max-width: 500px) {
  :host { height: clamp(20px, 4vh, 32px); }
}
''',
    "particle-background/particle-background.css": '''
/* === Responsive 250–500px (particle-background) === */
@media (max-width: 500px) {
  :host canvas { max-width: 100%; }
}
''',
    "features/r4v3-three/r4v3-three.css": '''
/* === Responsive 250–500px (r4v3-three) === */
@media (max-width: 500px) {
  :host { min-width: 0; max-width: 100%; }
}
''',
    "features/showcase-launch/showcase-launch.css": '''
/* === Responsive 250–500px (showcase-launch) === */
@media (max-width: 500px) {
  .showcase-launch__title { font-size: clamp(0.5rem, 2.4vw, 0.625rem); }
  .showcase-launch__card { padding: 4px; }
}
@media (max-width: 399px) {
  .showcase-launch__grid { gap: 3px; }
}
@media (max-width: 299px) {
  .showcase-launch__cta { min-height: 32px; width: 100%; }
}
''',
    "features/showcase-chat/showcase-chat.css": '''
/* === Responsive 250–500px (showcase-chat) === */
@media (max-width: 500px) {
  .showcase-chat__title { font-size: clamp(0.5rem, 2.4vw, 0.625rem); }
  .showcase-chat__composer-input { min-height: 28px; font-size: var(--nv-font-caption, 0.6875rem); }
}
@media (max-width: 399px) {
  .showcase-chat__toolbar { gap: 2px; flex-wrap: wrap; }
}
@media (max-width: 349px) {
  .showcase-chat__bubble { font-size: clamp(0.5rem, 2.5vw, 0.625rem); }
}
@media (max-width: 299px) {
  .showcase-chat__menu-btn { min-height: 32px; min-width: 32px; }
}
''',
    "app.css": '''
/* === Responsive 250–500px (app shell) === */
@media (max-width: 500px) {
  :host {
    --navbar-to-bandeau-gap: 0;
    --bandeau-bottom-gap: 3px;
    --showcase-tabs-width: var(--tab-rail-width);
    --dock-rail-width: var(--tab-rail-width);
  }
  .app-market-card { max-width: 100%; min-width: 0; }
}
@media (max-width: 449px) {
  .app-market-grid { column-gap: var(--panel-column-gap); }
}
@media (max-width: 399px) {
  .app-showcase-band { border-radius: clamp(4px, 1.5vw, 8px); }
}
@media (max-width: 349px) {
  .app-faucet-band { min-width: 0; }
}
@media (max-width: 299px) {
  .app-workspace { border-radius: clamp(4px, 1.4vw, 7px); }
}
''',
}

# showcase-chart - append at end of file separately (large file)
CHART_BLOCK = '''
/* === Responsive 250–500px (showcase-chart) === */
@media (max-width: 500px) {
  :host { --chart-tool-h: clamp(12px, 3vw, 14px); }
  .showcase-chart__toolbar { gap: 2px; min-height: var(--chart-tool-h); }
  .showcase-chart__range-btn, .showcase-chart__type-btn, .showcase-chart__tool-btn {
    min-height: 28px; padding-inline: 4px; font-size: var(--nv-font-micro, 0.625rem);
  }
}
@media (max-width: 449px) {
  .showcase-chart__price-value { font-size: clamp(0.5625rem, 2.8vw, 0.75rem); }
}
@media (max-width: 399px) {
  @container app-panel (max-width: 220px) {
    .showcase-chart__toolbar { flex-wrap: wrap; row-gap: 1px; }
    .showcase-chart__toolbar-end { flex: 1 1 100%; justify-content: flex-end; }
  }
}
@media (max-width: 349px) {
  .showcase-chart__metrics { gap: 2px; font-size: var(--nv-font-micro, 0.5625rem); }
}
@media (max-width: 299px) {
  .showcase-chart__toolbar-start { max-width: 100%; overflow-x: auto; scrollbar-width: none; }
}
'''

# Remove old faucet breakpoints when adding new block
FAUCET_OLD = "@media (max-width: 560px)"


def main():
    for rel, block in BLOCKS.items():
        path = ROOT / rel
        if not path.exists():
            print("skip missing", rel)
            continue
        marker = block.strip().split("\n")[0]
        text = path.read_text(encoding="utf-8")
        if marker in text:
            print("exists", rel)
            continue
        if rel == "features/faucet/faucet.css" and FAUCET_OLD in text:
            # remove old 560/380/280 blocks - keep keyframes
            import re
            text = re.sub(
                r"/\* Viewport cible.*?\*/\s*@media \(max-width: 280px\).*?\n\}",
                "",
                text,
                flags=re.DOTALL,
            )
            text = re.sub(
                r"@media \(max-width: 560px\) \{[^}]*\}\s*",
                "",
                text,
                flags=re.DOTALL,
            )
            text = re.sub(
                r"@media \(max-width: 380px\) \{[^}]*\}\s*",
                "",
                text,
                flags=re.DOTALL,
            )
        path.write_text(text.rstrip() + "\n\n" + block.strip() + "\n", encoding="utf-8")
        print("updated", rel)

    chart = ROOT / "features/showcase-chart/showcase-chart.css"
    if chart.exists():
        text = chart.read_text(encoding="utf-8")
        if "Responsive 250–500px (showcase-chart)" not in text:
            chart.write_text(text.rstrip() + "\n\n" + CHART_BLOCK.strip() + "\n", encoding="utf-8")
            print("updated showcase-chart.css")


if __name__ == "__main__":
    main()

PY