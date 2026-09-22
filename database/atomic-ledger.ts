/**
 * Sanitized reconstruction based on an implemented system.
 * Not verbatim production code.
 */

type EntryType = "income" | "expense" | "transfer";

interface LedgerInput {
  type: EntryType;
  sourceAccountId?: string;
  destinationAccountId?: string;
  amountMinor: bigint;
  currency: string;
  title: string;
}

interface TransactionContext {
  entry: {
    create(input: LedgerInput & { spaceId: string; actorId: string }): Promise<{ id: string }>;
  };
  account: {
    increment(accountId: string, deltaMinor: bigint, spaceId: string): Promise<void>;
  };
  idempotency: {
    find(actorId: string, key: string): Promise<{ resourceId: string; requestHash: string } | null>;
    create(input: { actorId: string; key: string; requestHash: string; resourceId: string }): Promise<void>;
  };
  audit: { write(input: Record<string, unknown>): Promise<void> };
}

interface Database {
  transaction<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export async function createLedgerEntry(
  db: Database,
  context: { actorId: string; spaceId: string },
  input: LedgerInput,
  idempotency: { key: string; requestHash: string },
): Promise<string> {
  if (input.amountMinor <= 0n) throw new Error("amount_must_be_positive");

  return db.transaction(async (tx) => {
    const previous = await tx.idempotency.find(context.actorId, idempotency.key);
    if (previous) {
      if (previous.requestHash !== idempotency.requestHash) {
        throw new Error("idempotency_key_reused_for_different_request");
      }
      return previous.resourceId;
    }

    const entry = await tx.entry.create({ ...input, ...context });
    if (input.type === "income" && input.destinationAccountId) {
      await tx.account.increment(input.destinationAccountId, input.amountMinor, context.spaceId);
    } else if (input.type === "expense" && input.sourceAccountId) {
      await tx.account.increment(input.sourceAccountId, -input.amountMinor, context.spaceId);
    } else if (input.type === "transfer" && input.sourceAccountId && input.destinationAccountId) {
      await tx.account.increment(input.sourceAccountId, -input.amountMinor, context.spaceId);
      await tx.account.increment(input.destinationAccountId, input.amountMinor, context.spaceId);
    } else {
      throw new Error("invalid_account_mapping");
    }

    await tx.audit.write({
      action: "ledger_entry_created",
      actorId: context.actorId,
      spaceId: context.spaceId,
      entityId: entry.id,
    });
    await tx.idempotency.create({ ...idempotency, actorId: context.actorId, resourceId: entry.id });
    return entry.id;
  });
}
