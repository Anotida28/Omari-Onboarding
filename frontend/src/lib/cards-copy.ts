export const cardsCopy = {
  systemName: "Cards System",
  receiveNavLabel: "Receive Cards",
  issueNavLabel: "Issue Cards",
  receiveTitle: "Receive Cards",
  receiveDescription: "Record a new batch of cards received",
  receivePanelTitle: "Receive Card Batch",
  issueTitle: "Issue Cards",
  issueDescription: "Issue cards to branches or individuals",
  transactionsDescription: "View and manage all card transactions",
  dashboardDescription:
    "Track card movement, stock levels, and operational activity across your card system.",
  financialsDescription:
    "Track costs, revenue, margins, and stock value in one dedicated financial view.",
  reportsDescription:
    "View and export stock, issues, receipts, and user activity reports.",
  itemTypeLabel: "Card Type",
  itemTypePlural: "Card Types",
  itemTypeAllLabel: "All Card Types",
  itemTypePlaceholder: "Select card type",
  unitNoun: "card",
  unitNounPlural: "cards",
};

export type CardsCopy = typeof cardsCopy;

export const useCardsCopy = (): CardsCopy => cardsCopy;
