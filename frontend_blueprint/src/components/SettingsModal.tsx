"use client";

/**
 * SettingsModal — a claude.ai-style settings dialog: a left tab rail + a content
 * pane on the right. Built to grow — add entries to TABS and a matching panel.
 * For now there's one tab (Account). Uses the generic Modal (native <dialog>,
 * Esc/backdrop close).
 *
 * The rail is a real ARIA tablist (role=tab/tablist/tabpanel + arrow-key roving
 * focus), not nav links — these switch panes within the dialog, they don't
 * navigate pages.
 */
import { useRef, useState } from "react";

import { Modal } from "@/components/Modal";
import { AccountPanel } from "@/components/panels/AccountPanel";

interface TabDef {
  id: string;
  label: string;
  render: () => React.ReactNode;
}

// Add new tabs here later (Appearance, Data, etc).
const TABS: TabDef[] = [
  { id: "account", label: "Account", render: () => <AccountPanel /> },
];

export function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [active, setActive] = useState(TABS[0].id);
  const activeTab = TABS.find((t) => t.id === active) ?? TABS[0];
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Arrow-key roving focus across the tablist (WAI-ARIA tabs pattern).
  const onTabKeyDown = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === active);
    let next = i;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft")
      next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    const id = TABS[next].id;
    setActive(id);
    tabRefs.current[id]?.focus();
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings" width="720px">
      <div className="settings">
        <nav
          className="settings-tabs"
          role="tablist"
          aria-orientation="vertical"
          aria-label="Settings sections"
        >
          {TABS.map((t) => {
            const selected = t.id === active;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                id={`settings-tab-${t.id}`}
                className="settings-tab"
                role="tab"
                aria-selected={selected}
                aria-controls={`settings-panel-${t.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(t.id)}
                onKeyDown={onTabKeyDown}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
        <section
          className="settings-pane"
          role="tabpanel"
          id={`settings-panel-${activeTab.id}`}
          aria-labelledby={`settings-tab-${activeTab.id}`}
          tabIndex={0}
        >
          <h3 style={{ margin: "0 0 0.75rem" }}>{activeTab.label}</h3>
          {activeTab.render()}
        </section>
      </div>
    </Modal>
  );
}
