"use client";

/**
 * SettingsModal — a claude.ai-style settings dialog: a left tab rail + a content
 * pane on the right. Built to grow — add entries to TABS and a matching panel.
 * For now there's one tab (Account). Uses the generic Modal (native <dialog>,
 * Esc/backdrop close).
 */
import { useState } from "react";

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

  return (
    <Modal open={open} onClose={onClose} title="Settings" width="720px">
      <div className="settings">
        <nav className="settings-tabs" aria-label="Settings sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              className="settings-tab"
              aria-current={t.id === active ? "page" : undefined}
              onClick={() => setActive(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <section className="settings-pane">
          <h3 style={{ margin: "0 0 0.75rem" }}>{activeTab.label}</h3>
          {activeTab.render()}
        </section>
      </div>
    </Modal>
  );
}
