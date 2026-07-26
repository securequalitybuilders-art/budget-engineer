# DzeNhare OS Ecosystem Architecture

The Phase 7 Ecosystem is designed to connect the DzeNhare Market Network to the outside world, enabling smart escrow, automated material ordering, and third-party plugin extensions.

## Core Integration Points

### 1. Escrow & Financial Integrations (Banking/Mobile Money)
DzeNhare OS does not hold funds directly. Instead, it integrates with licensed Escrow providers (e.g., local banks, EcoCash) via a Webhook / API bridge.

- **Trigger:** When a client clicks "Approve Release" in the Client Portal (`ApprovalInbox`), the `escrowEngine` generates a cryptographically signed payload.
- **Action:** An HTTP POST is sent to the financial provider's API.
- **Callback:** The provider sends a webhook back to `POST /api/webhooks/escrow/status` indicating success or failure.
- **Architecture:** 
  ```typescript
  interface EscrowReleaseEvent {
    milestoneId: string;
    projectId: string;
    providerId: string;
    amount: number;
    currency: string;
    signature: string; // HMAC-SHA256 of payload using client secret
  }
  ```

### 2. Supplier Catalog API (B2B Integration)
To keep the marketplace catalog up-to-date with live prices (Phase 2), large suppliers can integrate their ERP systems (like SAP or Sage) directly into the DzeNhare Catalog.

- **Ingestion:** Suppliers hit a REST endpoint `POST /api/catalog/sync` with a standard JSON schema mapping their inventory to DzeNhare `CatalogItem` structures.
- **Polling:** Alternatively, DzeNhare can poll public supplier APIs nightly to update standard material costs.
- **Real-time lookup:** For critical items (e.g., steel, cement), the `ProcurementEngine` can ping the supplier's API at the moment of generating the BOQ to ensure exact pricing.

### 3. Model Context Protocol (MCP) Extensions
DzeNhare OS exposes its underlying capabilities via MCP, allowing external AI agents (like Cursor, Copilot, or standalone chatbots) to interact with projects.

- **`mcp:cad:read`**: Read floor plan graphs and room data.
- **`mcp:boq:read`**: Read the generated BOQ.
- **`mcp:procurement:match`**: Given a BOQ item, find the best matching supplier in the local catalog.

## Future Extension Capabilities
1. **IoT Sensors:** Connect IoT cameras or RFID scanners on the construction site directly into the Execution Monitor (Phase 5) to automatically update task progress.
2. **Local Government Portals:** Auto-submit compliance checks (from `complianceEngine`) to municipal APIs for faster building permit approvals.
